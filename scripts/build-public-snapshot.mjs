import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = fileURLToPath(new URL('../storage/datasets/hcm-osm-food/hcm_food_places.geojson', import.meta.url));
const output = fileURLToPath(new URL('../assets/data/hcm-food-places.json', import.meta.url));
const geojson = JSON.parse(readFileSync(input, 'utf8'));
const features = Array.isArray(geojson.features) ? geojson.features : [];
const snapshotDate = features[0]?.properties?.last_checked || '';

const elements = features.flatMap((feature) => {
  const properties = feature.properties || {};
  const match = /^(node|way|relation)\/([1-9]\d*)$/.exec(String(properties.source_id || ''));
  const [lon, lat] = feature.geometry?.coordinates || [];
  const id = match ? Number(match[2]) : NaN;
  if (!match || !Number.isSafeInteger(id) || !Number.isFinite(lat) || !Number.isFinite(lon)
    || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !String(properties.name || '').trim()) return [];

  const tags = { name: String(properties.name) };
  for (const key of ['cuisine', 'phone', 'website', 'opening_hours']) {
    if (properties[key]) tags[key] = String(properties[key]);
  }
  return [{
    type: match[1], id, lat, lon, tags,
    category: String(properties.category || 'other'),
    address: String(properties.address || ''),
    source_url: String(properties.source_url || ''),
    verified_status: String(properties.verified_status || 'unverified'),
  }];
});

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  snapshot_date: snapshotDate,
  source: 'OpenStreetMap via Geofabrik Vietnam snapshot',
  attribution: 'OpenStreetMap contributors (ODbL)',
  elements,
})}\n`);
console.log(`Wrote ${elements.length} public OSM places to ${output}`);
