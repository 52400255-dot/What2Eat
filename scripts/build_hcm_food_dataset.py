#!/usr/bin/env python3
"""Build a source-auditable HCMC food-place dataset from a Geofabrik OSM PBF.

The output is an OSM snapshot, not proof that a venue is currently open.
Only exact OSM source IDs are deduplicated automatically; uncertain nearby
matches are reported for review instead of being silently merged.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "storage" / "imports" / "osm" / "vendor"
if VENDOR.is_dir():
    sys.path.insert(0, str(VENDOR))

import osmium
from shapely.geometry import Point, shape

DEFAULT_PBF = ROOT / "storage" / "imports" / "osm" / "vietnam-latest.osm.pbf"
DEFAULT_OUTPUT = ROOT / "storage" / "datasets" / "hcm-osm-food"

FOOD_AMENITIES = {
    "restaurant", "cafe", "fast_food", "food_court", "ice_cream",
    "bar", "pub", "biergarten", "canteen",
}
FOOD_SHOPS = {"bakery", "pastry", "confectionery", "tea"}
LIFECYCLE_KEYS = ("disused", "abandoned", "demolished")
COARSE_HCMC_BOUNDS = (105.0, 8.5, 109.0, 12.5)  # prefilter only; final inclusion uses OSM boundary geometry
CSV_FIELDS = [
    "place_id", "name", "category", "latitude", "longitude", "address",
    "ward", "district_or_city_area", "source", "source_id", "source_url",
    "phone", "website", "opening_hours", "price_level", "cuisine",
    "verified_status", "last_checked", "confidence", "coordinate_method", "notes",
]


def normalize(value: str) -> str:
    value = value.lower().replace("đ", "d")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def tags_dict(obj: Any) -> dict[str, str]:
    return dict(obj.tags)


def is_hcm_boundary(tags: dict[str, str]) -> bool:
    name = normalize(tags.get("name", ""))
    return (
        tags.get("boundary") == "administrative"
        and tags.get("admin_level") == "4"
        and "ho chi minh" in name
    )


def food_category(tags: dict[str, str]) -> str | None:
    amenity = tags.get("amenity", "")
    shop = tags.get("shop", "")
    if amenity in {"restaurant", "canteen"}:
        return "restaurant"
    if amenity == "cafe" or shop == "tea":
        return "cafe"
    if amenity == "fast_food":
        return "fast_food"
    if shop == "bakery":
        return "bakery"
    if shop in {"pastry", "confectionery"} or amenity == "ice_cream":
        return "dessert"
    if amenity in {"food_court", "bar", "pub", "biergarten"}:
        return "other"
    return None


def is_food(tags: dict[str, str]) -> bool:
    return tags.get("amenity") in FOOD_AMENITIES or tags.get("shop") in FOOD_SHOPS


def lifecycle_marked(tags: dict[str, str]) -> bool:
    if any(tags.get(key) in {"yes", "true", "1"} for key in LIFECYCLE_KEYS):
        return True
    return any(f"{key}:amenity" in tags for key in LIFECYCLE_KEYS)


def representative_point(geometry: Any) -> Point | None:
    if geometry is None or geometry.is_empty:
        return None
    try:
        point = geometry.representative_point()
    except Exception:
        return None
    return point if point.is_valid else None


def address_from_tags(tags: dict[str, str]) -> str:
    if tags.get("addr:full"):
        return tags["addr:full"].strip()
    parts = [
        tags.get("addr:housenumber"), tags.get("addr:street"),
        tags.get("addr:suburb"), tags.get("addr:district"),
        tags.get("addr:city"), tags.get("addr:postcode"),
    ]
    return ", ".join(part.strip() for part in parts if part and part.strip())


def coordinate_in_coarse_bounds(lon: float, lat: float) -> bool:
    west, south, east, north = COARSE_HCMC_BOUNDS
    return west <= lon <= east and south <= lat <= north


def print_boundaries(pbf: Path) -> int:
    class BoundaryScanner(osmium.SimpleHandler):
        def __init__(self) -> None:
            super().__init__()
            self.count = 0

        def relation(self, relation: Any) -> None:
            tags = tags_dict(relation)
            if is_hcm_boundary(tags):
                self.count += 1
                print(json.dumps({
                    "relation_id": int(relation.id),
                    "name": tags.get("name"),
                    "admin_level": tags.get("admin_level"),
                    "type": tags.get("type"),
                    "wikidata": tags.get("wikidata"),
                    "members": len(relation.members),
                }))

    scanner = BoundaryScanner()
    scanner.apply_file(str(pbf))
    return scanner.count


class DatasetHandler(osmium.SimpleHandler):
    def __init__(self, boundary_relation_id: int) -> None:
        super().__init__()
        self.boundary_relation_id = boundary_relation_id
        self.boundary_tags: dict[str, str] | None = None
        self.boundary_geometry = None
        self.geojson_factory = osmium.geom.GeoJSONFactory()
        self.candidates: dict[str, dict[str, Any]] = {}
        self.outside_candidates = 0

    def relation(self, relation: Any) -> None:
        if int(relation.id) == self.boundary_relation_id:
            tags = tags_dict(relation)
            if not is_hcm_boundary(tags):
                raise RuntimeError(
                    f"Relation {self.boundary_relation_id} is not tagged as Ho Chi Minh City admin_level=4."
                )
            self.boundary_tags = tags

    def node(self, node: Any) -> None:
        tags = tags_dict(node)
        if not is_food(tags) or lifecycle_marked(tags) or not tags.get("name", "").strip():
            return
        if not node.location.valid():
            return
        self.add_candidate("node", int(node.id), tags, float(node.lon), float(node.lat), "OSM node coordinate")

    def way(self, way: Any) -> None:
        tags = tags_dict(way)
        if not is_food(tags) or lifecycle_marked(tags) or not tags.get("name", "").strip():
            return
        if way.is_closed():
            return  # closed ways are handled as areas to avoid duplicate geometry rows
        coords = [(float(ref.lon), float(ref.lat)) for ref in way.nodes if ref.location.valid()]
        if not coords:
            return
        point = representative_point(shape({"type": "LineString", "coordinates": coords}))
        if point:
            self.add_candidate("way", int(way.id), tags, point.x, point.y, "OSM way representative point")

    def area(self, area: Any) -> None:
        original_id = int(area.orig_id())
        if not area.from_way() and original_id == self.boundary_relation_id:
            self.boundary_tags = tags_dict(area)
            geometry_json = json.loads(self.geojson_factory.create_multipolygon(area))
            boundary = shape(geometry_json)
            if not boundary.is_valid:
                from shapely import make_valid
                boundary = make_valid(boundary)
            if boundary.is_empty:
                raise RuntimeError("The selected Ho Chi Minh City boundary has empty geometry.")
            self.boundary_geometry = boundary
            return

        tags = tags_dict(area)
        if not is_food(tags) or lifecycle_marked(tags) or not tags.get("name", "").strip():
            return
        geometry_json = json.loads(self.geojson_factory.create_multipolygon(area))
        point = representative_point(shape(geometry_json))
        if point:
            source_type = "way" if area.from_way() else "relation"
            self.add_candidate(source_type, original_id, tags, point.x, point.y, "OSM area representative point")

    def add_candidate(self, source_type: str, source_id: int, tags: dict[str, str], lon: float, lat: float, method: str) -> None:
        if not coordinate_in_coarse_bounds(lon, lat):
            return
        source_key = f"{source_type}/{source_id}"
        self.candidates[source_key] = {
            "source_id": source_key,
            "tags": tags,
            "longitude": lon,
            "latitude": lat,
            "coordinate_method": method,
        }


def snapshot_date_from_pbf(pbf: Path) -> str:
    processor = osmium.FileProcessor(str(pbf))
    raw = processor.header.get("osmosis_replication_timestamp", "")
    if raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed.date().isoformat()
        except ValueError:
            pass
    return datetime.fromtimestamp(pbf.stat().st_mtime, timezone.utc).date().isoformat()


def row_from_candidate(candidate: dict[str, Any], snapshot_date: str) -> dict[str, Any]:
    tags = candidate["tags"]
    source_id = candidate["source_id"]
    name = tags.get("name", "").strip()
    address = address_from_tags(tags)
    category = food_category(tags) or "other"
    has_external_contact = bool(tags.get("phone") or tags.get("contact:phone") or tags.get("website") or tags.get("contact:website"))
    confidence = 0.5 + (0.15 if address else 0) + (0.15 if tags.get("cuisine") else 0) + (0.1 if has_external_contact else 0) + (0.1 if category != "other" else 0)
    notes = "Có trong bản trích xuất OSM; trạng thái còn mở chưa được xác minh ngoài thực địa."
    if tags.get("amenity") in {"bar", "pub", "biergarten"}:
        notes += " Loại hình bar/pub cần quản trị viên duyệt trước khi coi là quán ăn."
    return {
        "place_id": f"osm:{source_id}",
        "name": name,
        "category": category,
        "latitude": round(candidate["latitude"], 7),
        "longitude": round(candidate["longitude"], 7),
        "address": address,
        "ward": "",  # addr:suburb is not assumed to mean ward.
        "district_or_city_area": tags.get("addr:district", "").strip(),
        "source": "OpenStreetMap",
        "source_id": source_id,
        "source_url": f"https://www.openstreetmap.org/{source_id}",
        "phone": tags.get("contact:phone") or tags.get("phone", ""),
        "website": tags.get("contact:website") or tags.get("website", ""),
        "opening_hours": tags.get("opening_hours", ""),
        "price_level": "",
        "cuisine": tags.get("cuisine", ""),
        "verified_status": "unverified",
        "last_checked": snapshot_date,
        "confidence": round(min(confidence, 1.0), 2),
        "coordinate_method": candidate["coordinate_method"],
        "notes": notes,
    }


def find_possible_duplicates(rows: list[dict[str, Any]]) -> list[tuple[int, int, float]]:
    buckets: dict[tuple[str, str], list[int]] = defaultdict(list)
    for index, row in enumerate(rows):
        clean_name = normalize(row["name"])
        if len(clean_name) >= 3:
            buckets[(clean_name, row["category"])].append(index)
    matches: list[tuple[int, int, float]] = []
    for indexes in buckets.values():
        for offset, left_index in enumerate(indexes):
            left = rows[left_index]
            for right_index in indexes[offset + 1:]:
                right = rows[right_index]
                mean_lat = (left["latitude"] + right["latitude"]) / 2
                dx = (left["longitude"] - right["longitude"]) * 111_320 * abs(math.cos(math.radians(mean_lat)))
                dy = (left["latitude"] - right["latitude"]) * 111_320
                distance = (dx * dx + dy * dy) ** 0.5
                if distance <= 25:
                    matches.append((left_index, right_index, round(distance, 1)))
    return matches


def write_outputs(rows: list[dict[str, Any]], output: Path, snapshot_date: str, boundary_id: int, boundary_name: str, duplicate_pairs: list[tuple[int, int, float]]) -> None:
    output.mkdir(parents=True, exist_ok=True)
    with (output / "hcm_food_places.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    features = []
    for row in rows:
        properties = {key: value for key, value in row.items() if key not in {"latitude", "longitude"}}
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]},
            "properties": properties,
        })
    geojson = {"type": "FeatureCollection", "features": features}
    (output / "hcm_food_places.geojson").write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    counts = Counter(row["category"] for row in rows)
    areas = Counter(row["district_or_city_area"] or "Không có tag địa chỉ" for row in rows)
    missing_address = sum(not row["address"] for row in rows)
    missing_cuisine = sum(not row["cuisine"] for row in rows)
    summary = [
        "# Dữ liệu địa điểm ăn uống TP. Hồ Chí Minh từ OSM", "",
        f"- Số bản ghi sau lọc và khử trùng lặp theo ID OSM: **{len(rows):,}**",
        f"- Mục tiêu 10.000 địa điểm: **{'đạt' if len(rows) >= 10000 else 'chưa đạt'}**; không bổ sung bản ghi giả.",
        f"- Ranh giới: [{boundary_name}](https://www.openstreetmap.org/relation/{boundary_id})",
        f"- Ngày snapshot OSM: **{snapshot_date}**",
        "- Trạng thái mặc định: `unverified`; dữ liệu OSM không chứng minh địa điểm còn mở.",
        "- Bar/pub được giữ ở nhóm `other` và ghi chú cần duyệt.", "", "## Số bản ghi theo loại hình", "",
    ]
    summary.extend(f"- `{category}`: {count:,}" for category, count in sorted(counts.items()))
    summary.extend(["", "## Giới hạn", "", "Đây là bản chụp dữ liệu cộng đồng OSM, không phải danh sách đã xác minh ngoài thực địa. Không bổ sung tên, địa chỉ, phường, giá, giờ mở cửa hoặc trạng thái hoạt động bằng suy đoán."])
    (output / "hcm_food_places.md").write_text("\n".join(summary) + "\n", encoding="utf-8")

    report = [
        "# Báo cáo chất lượng dữ liệu OSM TP. Hồ Chí Minh", "",
        f"- Nguồn: Geofabrik Vietnam PBF → OSM relation {boundary_id} ({boundary_name}).",
        f"- Snapshot OSM: {snapshot_date}.",
        f"- Bản ghi có tên, tọa độ hợp lệ, nằm trong ranh giới: **{len(rows):,}**.",
        f"- Mục tiêu 10.000 địa điểm: **{'đạt' if len(rows) >= 10000 else 'chưa đạt'}**; số liệu theo nguồn hiện có, không bù bằng dữ liệu giả.",
        f"- ID OSM duy nhất: **{len({row['source_id'] for row in rows}):,}**.",
        f"- Thiếu địa chỉ: **{missing_address:,}**.",
        f"- Thiếu cuisine: **{missing_cuisine:,}**.",
        f"- Trạng thái chưa xác minh còn hoạt động: **{len(rows):,}**.",
        f"- Cặp cùng tên/cùng loại cách không quá 25 m cần người kiểm tra: **{len(duplicate_pairs):,}** (giữ lại, không tự động gộp).",
        "", "## Theo loại hình", "",
    ]
    report.extend(f"- `{category}`: {count:,}" for category, count in sorted(counts.items()))
    report.extend(["", "## Theo khu vực có tag addr:district", ""])
    report.extend(f"- {area}: {count:,}" for area, count in areas.most_common())
    report.extend([
        "", "## Kiểm soát chất lượng", "",
        "- Chỉ lấy đối tượng có tên và tag loại hình ăn uống rõ ràng.",
        "- Loại tag `disused`, `abandoned`, `demolished` và tag vòng đời tương ứng.",
        "- Khử trùng lặp tự động theo ID OSM; cặp gần nhau chỉ là gợi ý rà soát, không tự gộp chi nhánh.",
        "- `confidence` đo mức đầy đủ trường dữ liệu, không phải xác suất quán đang mở.",
        "- Quy tắc `confidence`: 0,50 nền cho tên + tọa độ có nguồn; +0,15 có địa chỉ; +0,15 có cuisine; +0,10 có điện thoại/website; +0,10 ánh xạ được loại hình (tối đa 1,00).",
        "- Không suy ra phường từ `addr:suburb`; không suy diễn giá, giờ mở cửa hoặc tình trạng hoạt động.",
    ])
    (output / "data_quality_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    license_text = (
        "# Nguồn và giấy phép\n\n"
        "- Dữ liệu: OpenStreetMap contributors, trích từ bản Geofabrik Vietnam PBF.\n"
        f"- Ngày snapshot: {snapshot_date}.\n"
        f"- Ranh giới: [OSM relation {boundary_id} — {boundary_name}](https://www.openstreetmap.org/relation/{boundary_id}).\n"
        "- Ghi công khi phân phối/hiển thị: © OpenStreetMap contributors.\n"
        "- Dữ liệu OSM theo Open Database License (ODbL): https://www.openstreetmap.org/copyright.\n"
        "- Đây là bản trích xuất/biên tập từ cơ sở dữ liệu OSM; kiểm tra nghĩa vụ ODbL và ghi công trước khi phân phối.\n"
    )
    (output / "sources_and_license.md").write_text(license_text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pbf", type=Path, default=DEFAULT_PBF)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--list-boundaries", action="store_true", help="list matching HCMC admin_level=4 relations")
    parser.add_argument("--boundary-relation", type=int, help="OSM relation ID for the current HCMC admin boundary")
    args = parser.parse_args()
    if not args.pbf.is_file():
        parser.error(f"PBF file does not exist: {args.pbf}")
    if args.list_boundaries:
        print_boundaries(args.pbf)
        return 0
    if not args.boundary_relation:
        parser.error("Choose the current HCMC boundary relation from --list-boundaries, then pass --boundary-relation ID.")

    snapshot_date = snapshot_date_from_pbf(args.pbf)
    handler = DatasetHandler(args.boundary_relation)
    handler.apply_file(str(args.pbf), locations=True)
    if handler.boundary_geometry is None or not handler.boundary_tags:
        raise RuntimeError(f"Boundary relation {args.boundary_relation} has no usable OSM area geometry in this extract.")
    rows: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for candidate in handler.candidates.values():
        source_id = candidate["source_id"]
        if source_id in seen_ids:
            continue
        point = Point(candidate["longitude"], candidate["latitude"])
        if not handler.boundary_geometry.covers(point):
            handler.outside_candidates += 1
            continue
        seen_ids.add(source_id)
        rows.append(row_from_candidate(candidate, snapshot_date))
    rows.sort(key=lambda row: (normalize(row["name"]), row["source_id"]))
    duplicate_pairs = find_possible_duplicates(rows)
    boundary_name = handler.boundary_tags.get("name", "Ho Chi Minh City")
    write_outputs(rows, args.output, snapshot_date, args.boundary_relation, boundary_name, duplicate_pairs)
    print(json.dumps({
        "snapshot_date": snapshot_date,
        "boundary_relation": args.boundary_relation,
        "boundary_name": boundary_name,
        "records": len(rows),
        "possible_duplicate_pairs": len(duplicate_pairs),
        "outside_boundary_candidates": handler.outside_candidates,
        "output": str(args.output),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
