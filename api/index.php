<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(self)');

function route_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if (str_starts_with($path, '/api/v1')) $path = substr($path, 7) ?: '/';
    elseif (str_starts_with($path, '/api')) $path = substr($path, 4) ?: '/';
    return '/' . trim($path, '/');
}

function clean_email(mixed $value): string
{
    $email = strtolower(trim((string)$value));
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, 'Địa chỉ email không hợp lệ.');
    return $email;
}

function ini_size_bytes(string $value): int
{
    if (!preg_match('/^\s*(\d+(?:\.\d+)?)\s*([KMG])?\s*$/i', $value, $parts)) return 0;
    $multiplier = match (strtolower($parts[2] ?? '')) { 'k' => 1024, 'm' => 1048576, 'g' => 1073741824, default => 1 };
    return (int)((float)$parts[1] * $multiplier);
}

function public_food_names_for_places(array $ids, string $keyColumn): array
{
    if (!in_array($keyColumn, ['restaurant_id', 'restaurant_source_id'], true)) return [];
    $ids = array_values(array_unique(array_filter($ids, static fn($id): bool => is_string($id) || (is_int($id) && $id > 0))));
    if (!$ids) return [];
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $sourceFilter = $keyColumn === 'restaurant_source_id' ? " AND restaurant_source='osm'" : '';
    $stmt = db()->prepare("SELECT {$keyColumn} AS entity_id,food_name FROM food_notes WHERE {$keyColumn} IN ({$marks}) AND privacy='public' AND status='published'{$sourceFilter} ORDER BY {$keyColumn},food_name");
    $stmt->execute($ids);
    $names = [];
    foreach ($stmt->fetchAll() as $row) {
        $key = (string)$row['entity_id'];
        $foodName = (string)$row['food_name'];
        if (count($names[$key] ?? []) < 8 && !in_array($foodName, $names[$key] ?? [], true)) $names[$key][] = $foodName;
    }
    return $names;
}

function make_token(): string { return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); }
function token_hash(string $token): string { return hash('sha256', $token); }

function token_mail(string $email, string $subject, string $heading, string $token, string $path, string $description): bool
{
    $base = rtrim((string)env_value('W2E_BASE_URL', ''), '/');
    if ($base === '' || (!preg_match('#^https://#i', $base) && !is_local_development_origin($base))) return false;
    $url = $base . $path . rawurlencode($token);
    $safeUrl = htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $html = '<div style="font:16px/1.6 Arial,sans-serif;max-width:560px;margin:auto;color:#2b2118">'
        . '<h2>' . htmlspecialchars($heading, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</h2><p>'
        . htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p><p><a href="' . $safeUrl . '">Tiếp tục trên What2Eat</a></p>'
        . '<p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p></div>';
    return send_app_mail($email, $subject, $html);
}

function issue_email_token(int $userId, string $purpose, int $minutes = 30): string
{
    $token = make_token();
    $stmt = db()->prepare('INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE))');
    $stmt->execute([$userId, $purpose, token_hash($token), $minutes]);
    return $token;
}

function json_user(array $user): array
{
    unset($user['password_hash']);
    if (isset($user['preferences']) && is_string($user['preferences'])) $user['preferences'] = json_decode($user['preferences'], true) ?: [];
    return $user;
}

function require_plan_member(int $planId, int $userId, bool $lock = false): array
{
    $suffix = $lock ? ' FOR UPDATE' : '';
    $stmt = db()->prepare("SELECT p.*,m.role AS member_role FROM food_plans p JOIN food_plan_members m ON m.food_plan_id=p.id WHERE p.id=? AND m.user_id=?{$suffix}");
    $stmt->execute([$planId, $userId]);
    $plan = $stmt->fetch();
    if (!$plan) throw new ApiError(404, 'Không tìm thấy Food Plan.');
    return $plan;
}

function note_payload(array $row, bool $includeShare = false): array
{
    $row['id'] = (int)$row['id'];
    $row['user_id'] = (int)$row['user_id'];
    $row['restaurant_id'] = $row['restaurant_id'] === null ? null : (int)$row['restaurant_id'];
    $row['price'] = $row['price'] === null ? null : (float)$row['price'];
    $row['rating'] = $row['rating'] === null ? null : (float)$row['rating'];
    $row['is_favorite'] = (bool)$row['is_favorite'];
    $row['is_pinned'] = (bool)$row['is_pinned'];
    $row['tags'] = isset($row['tags']) && is_string($row['tags']) ? (json_decode($row['tags'], true) ?: []) : ($row['tags'] ?? []);
    $row['media'] = isset($row['media']) && is_string($row['media']) ? (json_decode($row['media'], true) ?: []) : ($row['media'] ?? []);
    unset($row['share_token_hash']);
    if (!$includeShare) unset($row['share_url']);
    return $row;
}

function hydrate_note_rows(array $rows, ?string $shareToken = null): array
{
    if (!$rows) return [];
    $ids = array_values(array_unique(array_map(static fn(array $row): int => (int)$row['id'], $rows)));
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $tags = [];
    $tagQuery = db()->prepare("SELECT nt.food_note_id,t.name FROM food_note_tags nt JOIN tags t ON t.id=nt.tag_id WHERE nt.food_note_id IN ({$marks}) ORDER BY t.name");
    $tagQuery->execute($ids);
    foreach ($tagQuery->fetchAll() as $tag) $tags[(int)$tag['food_note_id']][] = $tag['name'];
    $media = [];
    $mediaQuery = db()->prepare("SELECT food_note_id,id,mime_type,byte_size FROM food_note_media WHERE food_note_id IN ({$marks}) ORDER BY id");
    $mediaQuery->execute($ids);
    foreach ($mediaQuery->fetchAll() as $item) {
        $url = '/api/v1/media/' . (int)$item['id'];
        if ($shareToken !== null) $url .= '?share=' . rawurlencode($shareToken);
        $media[(int)$item['food_note_id']][] = ['id'=>(int)$item['id'],'url'=>$url,'mime_type'=>$item['mime_type'],'size'=>(int)$item['byte_size']];
    }
    foreach ($rows as &$row) {
        $row['tags'] = $tags[(int)$row['id']] ?? [];
        $row['media'] = $media[(int)$row['id']] ?? [];
    }
    unset($row);
    return array_map('note_payload', $rows);
}

function fetch_note(int $id, ?int $ownerId = null): array
{
    $sql = "SELECT n.*,u.name AS author_name,COALESCE(r.name,n.restaurant_name_snapshot) AS restaurant_name
      FROM food_notes n JOIN users u ON u.id=n.user_id LEFT JOIN restaurants r ON r.id=n.restaurant_id WHERE n.id=?";
    $params = [$id];
    if ($ownerId !== null) { $sql .= ' AND n.user_id=?'; $params[] = $ownerId; }
    $stmt = db()->prepare($sql . ' LIMIT 1');
    $stmt->execute($params);
    $note = $stmt->fetch();
    if (!$note) throw new ApiError(404, 'Không tìm thấy Food Note.');
    return hydrate_note_rows([$note])[0];
}

function normalized_note_tags(array $tags): array
{
    return array_slice(array_values(array_unique(array_filter(array_map(static function ($tag) {
        if (!is_string($tag)) return null;
        $tag = mb_strtolower(trim(ltrim($tag, '#')), 'UTF-8');
        $tag = preg_replace('/\s+/u', '_', $tag) ?? '';
        return $tag !== '' && mb_strlen($tag, 'UTF-8') <= 80 ? $tag : null;
    }, $tags)))), 0, 20);
}

function sync_note_tags(int $noteId, int $userId, array $tags): void
{
    $tags = normalized_note_tags($tags);
    db()->prepare('DELETE FROM food_note_tags WHERE food_note_id=?')->execute([$noteId]);
    $find = db()->prepare('SELECT id FROM tags WHERE user_id=? AND name=?');
    $create = db()->prepare('INSERT INTO tags(user_id,name) VALUES(?,?)');
    $link = db()->prepare('INSERT IGNORE INTO food_note_tags(food_note_id,tag_id) VALUES(?,?)');
    foreach ($tags as $tag) {
        $find->execute([$userId, $tag]);
        $tagId = $find->fetchColumn();
        if (!$tagId) { $create->execute([$userId, $tag]); $tagId = db()->lastInsertId(); }
        $link->execute([$noteId, $tagId]);
    }
}

function remove_note_media_file(string $key): void
{
    if (!preg_match('/^[a-f0-9]{48}\.(?:jpg|png|webp|gif|mp4|webm)$/', $key)) return;
    $file = dirname(__DIR__) . '/storage/uploads/notes/' . $key;
    if (is_file($file) && !@unlink($file)) error_log('[What2Eat] could not remove Food Note media file.');
}

function pause_restaurant_sponsorship(int $restaurantId): void
{
    db()->prepare("UPDATE restaurant_sponsorships SET status='paused' WHERE restaurant_id=?")->execute([$restaurantId]);
}

function public_notes_for_place(?int $restaurantId, ?string $osmId): array
{
    $where = $restaurantId !== null ? 'n.restaurant_id=?' : "n.restaurant_source='osm' AND n.restaurant_source_id=?";
    $stmt = db()->prepare("SELECT n.*,u.name AS author_name,COALESCE(r.name,n.restaurant_name_snapshot) AS restaurant_name
      FROM food_notes n JOIN users u ON u.id=n.user_id LEFT JOIN restaurants r ON r.id=n.restaurant_id
      WHERE {$where} AND n.privacy='public' AND n.status='published' ORDER BY n.created_at DESC LIMIT 20");
    $stmt->execute([$restaurantId ?? $osmId]);
    return hydrate_note_rows($stmt->fetchAll());
}

function osm_snapshot_places(float $lat, float $lon, int $radius): ?array
{
    $snapshotFile = dirname(__DIR__) . '/storage/datasets/hcm-osm-food/hcm_food_places.geojson';
    if (!is_file($snapshotFile) || !is_readable($snapshotFile)) return null;
    $raw = @file_get_contents($snapshotFile);
    if (!is_string($raw) || $raw === '') return null;
    $snapshot = json_decode($raw, true);
    if (!is_array($snapshot) || !is_array($snapshot['features'] ?? null)) return null;
    $firstFeature = $snapshot['features'][0]['properties'] ?? [];
    $snapshotDate = (string)($firstFeature['last_checked'] ?? gmdate('Y-m-d', filemtime($snapshotFile)));

    $earthRadius = 6371000.0;
    $latRad = deg2rad($lat);
    $elements = [];
    foreach ($snapshot['features'] as $feature) {
        $properties = $feature['properties'] ?? [];
        $coordinates = $feature['geometry']['coordinates'] ?? null;
        $sourceId = (string)($properties['source_id'] ?? '');
        if (!preg_match('#^(node|way|relation)/(\d+)$#', $sourceId, $match)
            || !is_array($coordinates) || !isset($coordinates[0], $coordinates[1])
            || !is_numeric($coordinates[0]) || !is_numeric($coordinates[1])) continue;
        $placeLon = (float)$coordinates[0];
        $placeLat = (float)$coordinates[1];
        if ($placeLat < -90 || $placeLat > 90 || $placeLon < -180 || $placeLon > 180) continue;
        $deltaLat = deg2rad($placeLat - $lat);
        $deltaLon = deg2rad($placeLon - $lon);
        $a = sin($deltaLat / 2) ** 2 + cos($latRad) * cos(deg2rad($placeLat)) * sin($deltaLon / 2) ** 2;
        $distance = 2 * $earthRadius * asin(min(1.0, sqrt($a)));
        if ($distance > $radius) continue;

        $tags = ['name' => (string)($properties['name'] ?? '')];
        if (!empty($properties['cuisine'])) $tags['cuisine'] = (string)$properties['cuisine'];
        $elements[] = [
            'type' => $match[1],
            'id' => (int)$match[2],
            'lat' => $placeLat,
            'lon' => $placeLon,
            'tags' => $tags,
            'category' => (string)($properties['category'] ?? 'other'),
            'address' => (string)($properties['address'] ?? ''),
            'source_url' => (string)($properties['source_url'] ?? ''),
            'verified_status' => (string)($properties['verified_status'] ?? 'unverified'),
            'snapshot_date' => $snapshotDate,
            '_distance' => $distance,
        ];
    }
    usort($elements, static fn(array $a, array $b): int => $a['_distance'] <=> $b['_distance']);
    $elements = array_slice($elements, 0, 250);
    foreach ($elements as &$element) unset($element['_distance']);
    unset($element);

    return [
        'elements' => $elements,
        'snapshot' => true,
        'snapshot_date' => $snapshotDate,
        'source' => 'OpenStreetMap via Geofabrik Vietnam snapshot',
    ];
}

function osm_places(float $lat, float $lon, int $radius, bool $forceRefresh = false): array
{
    $latKey = round($lat, 3); $lonKey = round($lon, 3);
    $key = hash('sha256', "osm:$latKey:$lonKey:$radius");
    $old = null;
    try {
        rate_limit('osm', 20, 60);
    } catch (ApiError $error) {
        if ($error->status === 429) throw $error;
        error_log('[What2Eat] OSM rate-limit storage unavailable; trying the local snapshot.');
        if ($snapshot = osm_snapshot_places($lat, $lon, $radius)) return $snapshot;
        throw $error;
    } catch (Throwable $error) {
        error_log('[What2Eat] OSM rate-limit storage unavailable; trying the local snapshot.');
        if ($snapshot = osm_snapshot_places($lat, $lon, $radius)) return $snapshot;
        throw new ApiError(503, 'Dữ liệu bản đồ tạm thời không khả dụng.');
    }
    try {
        $cached = db()->prepare('SELECT body,cached_at,expires_at FROM api_cache WHERE cache_key=? LIMIT 1');
        $cached->execute([$key]);
        $old = $cached->fetch();
    } catch (Throwable $error) {
        error_log('[What2Eat] OSM response cache unavailable; requesting community data.');
    }
    if (!$forceRefresh && $old && strtotime($old['expires_at'] . ' UTC') > time()) {
        $body = json_decode($old['body'], true);
        if (is_array($body)) { $body['cached'] = true; $body['cache_updated_at'] = $old['cached_at']; return $body; }
    }
    $blocks = [];
    foreach ([
        'amenity' => 'restaurant|cafe|fast_food|food_court|ice_cream|pub|bar|biergarten|canteen',
        'shop' => 'bakery|pastry|confectionery|tea',
    ] as $tagKey => $tagValues) {
        $lifecycle = '["disused"!="yes"]["abandoned"!="yes"]["demolished"!="yes"]["disused:' . $tagKey . '"!~"."]["abandoned:' . $tagKey . '"!~"."]["demolished:' . $tagKey . '"!~"."]';
        foreach (['node', 'way', 'relation'] as $entity) {
            $blocks[] = $entity . '["' . $tagKey . '"~"^(' . $tagValues . ')$"' . $lifecycle . '](around:' . $radius . ',' . $latKey . ',' . $lonKey . ');';
        }
    }
    $query = '[out:json][timeout:12];(' . implode('', $blocks) . ');out center 250;';
    $endpoints = [
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://overpass-api.de/api/interpreter',
    ];
    $success = null;
    if (function_exists('curl_multi_init')) {
        $multi = curl_multi_init(); $handles = [];
        foreach ($endpoints as $endpoint) {
            $ch = curl_init($endpoint);
            curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query(['data' => $query]), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 9, CURLOPT_HTTPHEADER => ['Accept: application/json','User-Agent: What2Eat/1.0 (OpenStreetMap community data)'], CURLOPT_FOLLOWLOCATION => false]);
            curl_multi_add_handle($multi, $ch); $handles[] = $ch;
        }
        $running = 0;
        do {
            $status = curl_multi_exec($multi, $running);
            while (($info = curl_multi_info_read($multi)) !== false) {
                $ch = $info['handle']; $raw = curl_multi_getcontent($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                if ($code === 200 && is_string($raw)) {
                    $data = json_decode($raw, true);
                    if (is_array($data) && isset($data['elements']) && is_array($data['elements'])) $success = $data;
                }
                curl_multi_remove_handle($multi, $ch); curl_close($ch);
                $handles = array_values(array_filter($handles, static fn($handle) => $handle !== $ch));
                if ($success !== null) break 2;
            }
            if ($running > 0 && curl_multi_select($multi, 0.1) === -1) usleep(100000);
        } while ($running > 0 && $status === CURLM_OK);
        foreach ($handles as $ch) {
            curl_multi_remove_handle($multi, $ch); curl_close($ch);
        }
        curl_multi_close($multi);
    } elseif (function_exists('curl_init')) {
        foreach ($endpoints as $endpoint) {
            $ch = curl_init($endpoint);
            curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query(['data' => $query]), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_TIMEOUT => 5, CURLOPT_HTTPHEADER => ['Accept: application/json','User-Agent: What2Eat/1.0 (OpenStreetMap community data)']]);
            $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
            if ($code === 200 && is_string($raw)) { $data = json_decode($raw, true); if (is_array($data) && isset($data['elements']) && is_array($data['elements'])) { $success = $data; break; } }
        }
    }
    if (is_array($success)) {
        try {
            $save = db()->prepare('INSERT INTO api_cache(cache_key,body,cached_at,expires_at) VALUES(?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE)) ON DUPLICATE KEY UPDATE body=VALUES(body),cached_at=VALUES(cached_at),expires_at=VALUES(expires_at)');
            $save->execute([$key, json_encode($success, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        } catch (Throwable $error) {
            error_log('[What2Eat] OSM response could not be saved to the local cache.');
        }
        return $success;
    }
    if ($old) {
        $stale = json_decode($old['body'], true);
        if (is_array($stale) && strtotime($old['cached_at'] . ' UTC') > time() - 86400) { $stale['cached'] = true; $stale['stale'] = true; $stale['cache_updated_at'] = $old['cached_at']; return $stale; }
    }
    if ($snapshot = osm_snapshot_places($lat, $lon, $radius)) return $snapshot;
    throw new ApiError(502, 'Các máy chủ dữ liệu OSM hiện không phản hồi. Hãy thử tải lại sau ít phút.');
}

function serve_osm_tile(): never
{
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    $tile = (string)($_GET['tile'] ?? '');
    if (!preg_match('#^(\d{1,2})/(\d{1,8})/(\d{1,8})$#', $tile, $m)) throw new ApiError(400, 'Tọa độ bản đồ không hợp lệ.');
    $z = (int)$m[1]; $x = (int)$m[2]; $y = (int)$m[3];
    if ($z > 19 || $x >= (1 << $z) || $y >= (1 << $z)) throw new ApiError(400, 'Tọa độ bản đồ không hợp lệ.');
    if (!function_exists('curl_init')) throw new ApiError(503, 'Máy chủ chưa bật PHP cURL để tải ảnh bản đồ.');

    $cacheFile = dirname(__DIR__) . '/storage/cache/osm-tiles/' . $z . '/' . $x . '/' . $y . '.png';
    $cachedTile = is_file($cacheFile) && filesize($cacheFile) > 0 ? @file_get_contents($cacheFile) : false;
    $cacheAge = is_file($cacheFile) ? time() - (int)filemtime($cacheFile) : PHP_INT_MAX;
    if (is_string($cachedTile) && $cachedTile !== '' && $cacheAge <= 604800) {
        header('Content-Type: image/png'); header('Cache-Control: public, max-age=604800, stale-while-revalidate=86400'); header('X-Content-Type-Options: nosniff'); echo $cachedTile; exit;
    }

    $urls = ["https://a.tile.openstreetmap.fr/hot/$z/$x/$y.png", "https://tile.openstreetmap.org/$z/$x/$y.png"];
    foreach ($urls as $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_TIMEOUT => 3, CURLOPT_HTTPHEADER => ['Accept: image/png,image/*;q=0.8','User-Agent: What2Eat/1.0 (OpenStreetMap map viewer)']]);
        $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE); curl_close($ch);
        if ($code === 200 && is_string($body) && $body !== '' && str_starts_with($type, 'image/')) {
            $cacheDir = dirname($cacheFile);
            if (!is_dir($cacheDir) && !@mkdir($cacheDir, 0750, true) && !is_dir($cacheDir)) $cacheDir = '';
            if ($cacheDir !== '') {
                $temporaryFile = $cacheFile . '.' . bin2hex(random_bytes(6)) . '.tmp';
                if (@file_put_contents($temporaryFile, $body, LOCK_EX) !== false) {
                    if (!@rename($temporaryFile, $cacheFile)) {
                        @copy($temporaryFile, $cacheFile);
                        @unlink($temporaryFile);
                    }
                }
            }
            header('Content-Type: image/png'); header('Cache-Control: public, max-age=604800, stale-while-revalidate=86400'); echo $body; exit;
        }
    }
    if (is_string($cachedTile) && $cachedTile !== '') {
        header('Content-Type: image/png'); header('Cache-Control: public, max-age=3600'); header('X-Content-Type-Options: nosniff'); echo $cachedTile; exit;
    }
    http_response_code(502); header('Content-Type: text/plain; charset=utf-8'); header('Cache-Control: no-store'); echo 'Map tile temporarily unavailable.'; exit;
}

function nominatim_search(string $address): array
{
    $normalized = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $address) ?? $address), 'UTF-8');
    $key = hash('sha256', 'nominatim:v1:' . $normalized);
    $readCache = static function () use ($key): ?array {
        $stmt = db()->prepare('SELECT body FROM api_cache WHERE cache_key=? AND expires_at>UTC_TIMESTAMP() LIMIT 1');
        $stmt->execute([$key]);
        $body = $stmt->fetchColumn();
        $data = is_string($body) ? json_decode($body, true) : null;
        return is_array($data) ? $data : null;
    };
    if ($cached = $readCache()) return $cached;
    if (!function_exists('curl_init')) throw new ApiError(503, 'Máy chủ chưa bật PHP cURL để tra tọa độ.');

    $lockName = 'w2e_nominatim_rate_limit';
    $lock = db()->prepare('SELECT GET_LOCK(?,15)');
    $lock->execute([$lockName]);
    if ((int)$lock->fetchColumn() !== 1) throw new ApiError(503, 'Hàng đợi tra tọa độ đang bận. Hãy thử lại sau.');
    try {
        if ($cached = $readCache()) return $cached;
        $clockKey = hash('sha256', 'nominatim:global-last-request');
        $clockQuery = db()->prepare('SELECT body FROM api_cache WHERE cache_key=? LIMIT 1');
        $clockQuery->execute([$clockKey]);
        $lastRequest = (float)json_decode((string)$clockQuery->fetchColumn(), true);
        $wait = 1_000_000 - (int)((microtime(true) - $lastRequest) * 1_000_000);
        if ($lastRequest > 0 && $wait > 0) usleep($wait);
        $markRequest = db()->prepare('INSERT INTO api_cache(cache_key,body,cached_at,expires_at) VALUES(?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY)) ON DUPLICATE KEY UPDATE body=VALUES(body),cached_at=VALUES(cached_at),expires_at=VALUES(expires_at)');
        $markRequest->execute([$clockKey,json_encode(microtime(true))]);

        $endpoint = rtrim((string)env_value('W2E_NOMINATIM_URL', 'https://nominatim.openstreetmap.org/search'), '?');
        if (!filter_var($endpoint, FILTER_VALIDATE_URL) || strtolower((string)parse_url($endpoint, PHP_URL_SCHEME)) !== 'https') {
            throw new ApiError(503, 'Cấu hình dịch vụ tra tọa độ không hợp lệ.');
        }
        $base = rtrim((string)env_value('W2E_BASE_URL', ''), '/');
        $url = $endpoint . '?' . http_build_query(['format'=>'jsonv2','limit'=>1,'q'=>$address], '', '&', PHP_QUERY_RFC3986);
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: What2Eat/1.0 (' . $base . ')','Referer: ' . $base . '/admin/restaurants.php']]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
        if ($code !== 200 || !is_string($raw)) throw new ApiError(502, 'Dịch vụ tra tọa độ hiện không phản hồi. Bạn vẫn có thể nhập tọa độ thủ công.');
        $rows = json_decode($raw, true);
        if (!is_array($rows)) throw new ApiError(502, 'Dịch vụ tra tọa độ trả dữ liệu không hợp lệ.');
        $first = $rows[0] ?? null;
        $result = is_array($first) && is_numeric($first['lat'] ?? null) && is_numeric($first['lon'] ?? null)
            ? ['found'=>true,'latitude'=>(float)$first['lat'],'longitude'=>(float)$first['lon'],'label'=>(string)($first['display_name'] ?? '')]
            : ['found'=>false];
        $save = db()->prepare('INSERT INTO api_cache(cache_key,body,cached_at,expires_at) VALUES(?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE body=VALUES(body),cached_at=VALUES(cached_at),expires_at=VALUES(expires_at)');
        $save->execute([$key,json_encode($result,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
        return $result;
    } finally {
        $release = db()->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
}

function handle_request(): never
{
    if (isset($_GET['tile'])) serve_osm_tile();
    $method = request_method();
    $path = route_path();
    $segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
    $body = in_array($method, ['POST','PUT','PATCH','DELETE'], true) && !(str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data')) ? json_body() : [];
    if ($method !== 'GET') require_csrf();

    // The older Leaflet client calls this alias and expects the raw Overpass shape.
    if ($path === '/restaurants' && $method === 'GET') {
        $lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT); $lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
        $radius = filter_var($_GET['radius'] ?? 1500, FILTER_VALIDATE_INT);
        if ($lat === false || $lon === false || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180 || $radius === false || $radius < 100 || $radius > 5000) throw new ApiError(400, 'Tọa độ hoặc bán kính tìm kiếm không hợp lệ.');
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
        $data = osm_places((float)$lat, (float)$lon, (int)$radius, ($_GET['refresh'] ?? '') === '1');
        $blocked=array_fill_keys(db()->query('SELECT source_id FROM osm_place_blocks')->fetchAll(PDO::FETCH_COLUMN),true);
        $data['elements']=array_values(array_filter($data['elements']??[],static fn(array $place): bool => !isset($blocked[($place['type']??'').':'.($place['id']??'')])));
        $sourceIds = [];
        foreach ($data['elements'] ?? [] as $place) if (isset($place['type'], $place['id'])) $sourceIds[] = $place['type'] . ':' . $place['id'];
        try {
            $foodNames = public_food_names_for_places($sourceIds, 'restaurant_source_id');
        } catch (Throwable $error) {
            // OSM locations remain useful when the optional What2Eat Food Note lookup is unavailable.
            error_log('[What2Eat] Public Food Note labels were unavailable for an OSM response.');
            $foodNames = [];
        }
        $elements = $data['elements'] ?? [];
        foreach ($elements as &$place) {
            if (!isset($place['type'], $place['id'])) continue;
            $place['public_food_names'] = $foodNames[$place['type'] . ':' . $place['id']] ?? [];
        }
        unset($place);
        $data['elements'] = $elements;
        json_response($data);
    }
    if (preg_match('#^/restaurants/osm/(node|way|relation)/([1-9]\d{0,17})$#',$path,$m) && $method==='GET') {
        $blocked=db()->prepare('SELECT 1 FROM osm_place_blocks WHERE source_id=?');$blocked->execute([$m[1].':'.$m[2]]);
        if($blocked->fetchColumn())throw new ApiError(404,'Địa điểm này đã được ẩn sau khi kiểm tra báo cáo.');
        $lat=filter_var($_GET['lat']??null,FILTER_VALIDATE_FLOAT);$lon=filter_var($_GET['lon']??null,FILTER_VALIDATE_FLOAT);
        if($lat===false||$lon===false||$lat < -90||$lat > 90||$lon < -180||$lon > 180)throw new ApiError(400,'Tọa độ địa điểm không hợp lệ.');
        if(session_status()===PHP_SESSION_ACTIVE)session_write_close();
        $data=osm_snapshot_places((float)$lat,(float)$lon,150);
        $find=static function(array $rows) use($m): ?array {
            foreach($rows as $row)if(($row['type']??'')===$m[1]&&(string)($row['id']??'')===$m[2])return $row;
            return null;
        };
        $place=$find($data['elements']??[]);
        if(!$place){$data=osm_places((float)$lat,(float)$lon,150);$place=$find($data['elements']??[]);}
        if(!$place)throw new ApiError(404,'Không tìm thấy địa điểm trong dữ liệu hiện có.');
        $blockedIds=array_fill_keys(db()->query('SELECT source_id FROM osm_place_blocks')->fetchAll(PDO::FETCH_COLUMN),true);
        $nearby=[];
        foreach($data['elements']??[] as $candidate){
            $key=($candidate['type']??'').':'.($candidate['id']??'');
            if($key===$m[1].':'.$m[2]||isset($blockedIds[$key])||trim((string)($candidate['tags']['name']??''))==='')continue;
            $candidateLat=$candidate['lat']??$candidate['center']['lat']??null;$candidateLon=$candidate['lon']??$candidate['center']['lon']??null;
            if(!is_numeric($candidateLat)||!is_numeric($candidateLon))continue;
            $candidate['lat']=(float)$candidateLat;$candidate['lon']=(float)$candidateLon;$nearby[]=$candidate;
        }
        usort($nearby,static function(array $a,array $b) use($lat,$lon): int {
            $distance=static fn(array $row): float => (($row['lat']-(float)$lat)*111000)**2 + (($row['lon']-(float)$lon)*111000*cos(deg2rad((float)$lat)))**2;
            return $distance($a)<=>$distance($b);
        });
        $nearby=array_slice($nearby,0,4);
        try{$names=public_food_names_for_places([$m[1].':'.$m[2]],'restaurant_source_id');$place['public_food_names']=$names[$m[1].':'.$m[2]]??[];}
        catch(Throwable){$place['public_food_names']=[];}
        json_response(['data'=>$place,'nearby'=>$nearby,'snapshot'=>(bool)($data['snapshot']??false),'snapshot_date'=>$data['snapshot_date']??null]);
    }
    if (preg_match('#^/restaurants/osm/(node|way|relation)/([1-9]\d{0,17})/notes$#',$path,$m) && $method==='GET') {
        json_response(['data'=>public_notes_for_place(null,$m[1].':'.$m[2])]);
    }
    if ($path === '/health' && $method === 'GET') {
        try { db()->query('SELECT 1');$version=db()->query('SELECT version FROM schema_migrations ORDER BY applied_at DESC,version DESC LIMIT 1')->fetchColumn();if(!$version)throw new RuntimeException('Database schema has not been migrated.');json_response(['status'=>'ok','service'=>'What2Eat API','database'=>'connected','schema_version'=>$version]); }
        catch (Throwable) { throw new ApiError(503, 'Dịch vụ chưa sẵn sàng.'); }
    }
    if ($path === '/site-info' && $method === 'GET') {
        $email=env_value('W2E_SUPPORT_EMAIL');json_response(['support_email'=>$email&&filter_var($email,FILTER_VALIDATE_EMAIL)?$email:null]);
    }
    if ($path === '/auth/csrf' && $method === 'GET') json_response(['csrf_token'=>csrf_token()]);

    if ($path === '/auth/register' && $method === 'POST') {
        rate_limit('register', 5, 3600);
        $name = required_string($body, 'name', 100, 2); $email = clean_email($body['email'] ?? ''); $password = (string)($body['password'] ?? '');
        if (strlen($password) < 8 || strlen($password) > 1024) throw new ApiError(422, 'Mật khẩu cần có ít nhất 8 ký tự.');
        $baseUrl = (string)env_value('W2E_BASE_URL', '');
        $devMailCapture = is_local_development_origin($baseUrl);
        if (!$baseUrl || (!env_value('W2E_MAIL_FROM') && !$devMailCapture)) throw new ApiError(503, 'Chức năng đăng ký cần cấu hình dịch vụ email trước khi mở website.');
        db()->beginTransaction();
        try {
            $hash = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
            $insert = db()->prepare("INSERT INTO users(name,email,password_hash,preferences,role,status) VALUES(?,?,?,?,'user','pending')");
            $insert->execute([$name, $email, $hash, json_encode(array_slice(array_map('strval', (array)($body['preferences'] ?? [])), 0, 30))]);
            $userId = (int)db()->lastInsertId(); $token = issue_email_token($userId, 'verify', 1440);
            if (!token_mail($email, 'Xác nhận email What2Eat', 'Xác nhận địa chỉ email', $token, '/api/v1/auth/verify?token=', 'Liên kết này có hiệu lực trong 24 giờ.')) throw new RuntimeException('mail');
            audit($userId, 'account.registered', 'user', (string)$userId);
            db()->commit(); json_response(['message'=>$devMailCapture?'Tài khoản đã được tạo. Mở storage/dev-mail.log để lấy liên kết xác nhận ở môi trường phát triển.':'Tài khoản đã được tạo. Hãy xác nhận địa chỉ email qua liên kết vừa gửi.'], 201);
        } catch (PDOException $error) {
            db()->rollBack(); if ($error->getCode() === '23000') throw new ApiError(409, 'Email này đã được đăng ký.'); throw $error;
        } catch (Throwable $error) {
            db()->rollBack(); if ($error instanceof ApiError) throw $error;
            error_log('[What2Eat] registration email delivery failed'); throw new ApiError(503, 'Chưa gửi được email xác nhận. Hãy thử lại sau.');
        }
    }
    if ($path === '/auth/verify' && $method === 'GET') {
        $token = (string)($_GET['token'] ?? ''); if (strlen($token) < 30 || strlen($token) > 120) throw new ApiError(400, 'Liên kết xác nhận không hợp lệ.');
        $stmt = db()->prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND purpose='verify' AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() LIMIT 1");
        $stmt->execute([token_hash($token)]); $row = $stmt->fetch(); if (!$row) throw new ApiError(400, 'Liên kết đã hết hạn hoặc đã được sử dụng.');
        db()->beginTransaction();
        db()->prepare("UPDATE users SET status='active',email_verified_at=UTC_TIMESTAMP() WHERE id=? AND status='pending'")->execute([$row['user_id']]);
        db()->prepare('UPDATE email_tokens SET used_at=UTC_TIMESTAMP() WHERE id=?')->execute([$row['id']]);
        audit((int)$row['user_id'], 'account.verified', 'user', (string)$row['user_id']); db()->commit();
        if (str_contains((string)($_SERVER['HTTP_ACCEPT']??''),'text/html')) { header('Location: /pages/login.php?verification=success',true,303); exit; }
        json_response(['message'=>'Email đã được xác nhận. Bạn có thể đăng nhập.']);
    }
    if ($path === '/auth/resend-verification' && $method === 'POST') {
        rate_limit('resend_verify',3,3600);$email=clean_email($body['email']??'');$stmt=db()->prepare("SELECT id FROM users WHERE email=? AND status='pending' LIMIT 1");$stmt->execute([$email]);$userId=$stmt->fetchColumn();if($userId){$token=issue_email_token((int)$userId,'verify',1440);if(!token_mail($email,'Xác nhận email What2Eat','Xác nhận địa chỉ email',$token,'/api/v1/auth/verify?token=','Liên kết này có hiệu lực trong 24 giờ.'))error_log('[What2Eat] verification resend delivery failed');}json_response(['message'=>'Nếu tài khoản cần xác nhận, email hướng dẫn sẽ được gửi lại.']);
    }
    if ($path === '/auth/login' && $method === 'POST') {
        rate_limit('login', 10, 900); $email = clean_email($body['email'] ?? ''); $password = (string)($body['password'] ?? '');
        $stmt = db()->prepare('SELECT id,name,email,password_hash,role,status,session_version FROM users WHERE email=? LIMIT 1'); $stmt->execute([$email]); $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) throw new ApiError(401, 'Email hoặc mật khẩu không đúng.');
        if ($user['status'] === 'pending') throw new ApiError(403, 'Hãy xác nhận email trước khi đăng nhập.');
        if ($user['status'] !== 'active') throw new ApiError(403, 'Tài khoản hiện không thể đăng nhập.');
        if (password_needs_rehash($user['password_hash'], defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT), $user['id']]);
        }
        session_regenerate_id(true); $_SESSION['user_id'] = (int)$user['id']; $_SESSION['session_version']=(int)$user['session_version']; unset($_SESSION['csrf']); csrf_token();
        db()->prepare('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?')->execute([$user['id']]);
        audit((int)$user['id'], 'auth.login', 'user', (string)$user['id']);
        $safe = ['id'=>(int)$user['id'],'name'=>$user['name'],'email'=>$user['email'],'role'=>$user['role']];
        json_response(['user'=>$safe,'csrf_token'=>csrf_token()]);
    }
    if ($path === '/auth/logout' && $method === 'POST') {
        $userId = (int)($_SESSION['user_id'] ?? 0); if ($userId) audit($userId, 'auth.logout', 'user', (string)$userId);
        $_SESSION = []; if (session_status() === PHP_SESSION_ACTIVE) { session_regenerate_id(true); session_destroy(); }
        json_response(['message'=>'Đã đăng xuất.']);
    }
    if ($path === '/auth/me' && $method === 'GET') json_response(['user'=>current_user(false),'csrf_token'=>csrf_token()]);
    if ($path === '/auth/forgot-password' && $method === 'POST') {
        rate_limit('forgot', 4, 3600); $email = clean_email($body['email'] ?? '');
        $stmt = db()->prepare("SELECT id,email FROM users WHERE email=? AND status='active' LIMIT 1"); $stmt->execute([$email]); $user = $stmt->fetch();
        if ($user && env_value('W2E_BASE_URL') && (env_value('W2E_MAIL_FROM') || is_local_development_origin())) {
            db()->prepare("UPDATE email_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND purpose='reset' AND used_at IS NULL")->execute([$user['id']]);
            $token = issue_email_token((int)$user['id'], 'reset', 30);
            token_mail($email, 'Đặt lại mật khẩu What2Eat', 'Yêu cầu đặt lại mật khẩu', $token, '/pages/reset-password.php?token=', 'Liên kết này có hiệu lực trong 30 phút.');
        }
        json_response(['message'=>'Nếu địa chỉ này thuộc một tài khoản, hướng dẫn đặt lại mật khẩu sẽ được gửi.']);
    }
    if ($path === '/auth/reset-password' && $method === 'POST') {
        rate_limit('reset', 8, 3600); $token = (string)($body['token'] ?? ''); $password = (string)($body['password'] ?? '');
        if (strlen($token) < 30 || strlen($password) < 8 || strlen($password) > 1024) throw new ApiError(422, 'Liên kết hoặc mật khẩu không hợp lệ.');
        $stmt = db()->prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND purpose='reset' AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() LIMIT 1"); $stmt->execute([token_hash($token)]); $row = $stmt->fetch();
        if (!$row) throw new ApiError(400, 'Liên kết đã hết hạn hoặc đã được sử dụng.');
        db()->beginTransaction(); db()->prepare('UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=?')->execute([password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT),$row['user_id']]);
        db()->prepare("UPDATE email_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND purpose='reset' AND used_at IS NULL")->execute([$row['user_id']]);
        audit((int)$row['user_id'], 'auth.password_reset', 'user', (string)$row['user_id']); db()->commit(); json_response(['message'=>'Mật khẩu đã được cập nhật.']);
    }

    if ($path === '/categories' && $method === 'GET') {
        $stmt = db()->query("SELECT id,name,slug,description,icon FROM categories WHERE status='active' ORDER BY name"); json_response(['data'=>$stmt->fetchAll()]);
    }
    if ($path === '/restaurants/managed' && $method === 'GET') {
        $latInput = $_GET['lat'] ?? null;
        $lonInput = $_GET['lon'] ?? null;
        if (($latInput === null) !== ($lonInput === null)) throw new ApiError(422, 'Hãy cung cấp cả vĩ độ và kinh độ.');
        if ($latInput !== null) {
            if (!is_scalar($latInput) || !is_scalar($lonInput) || !is_numeric($latInput) || !is_numeric($lonInput)) throw new ApiError(422, 'Tọa độ tìm kiếm không hợp lệ.');
            $lat = (float)$latInput; $lon = (float)$lonInput;
            if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) throw new ApiError(422, 'Tọa độ tìm kiếm không hợp lệ.');
            $radiusInput = $_GET['radius'] ?? 2000;
            if (!is_scalar($radiusInput) || !is_numeric($radiusInput)) throw new ApiError(422, 'Bán kính tìm kiếm không hợp lệ.');
            $radius = max(100, min(10000, (int)$radiusInput));
            $latDelta = $radius / 110574.0;
            $lonDelta = min(180.0, $radius / (111320.0 * max(0.01, cos(deg2rad($lat)))));
            $latMin = max(-90.0, $lat - $latDelta); $latMax = min(90.0, $lat + $latDelta);
            $where = 'r.status=\'published\' AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL AND r.latitude BETWEEN ? AND ?';
            $params = [$lat, $lat, $lon, $latMin, $latMax];
            if ($lonDelta < 180.0) {
                $lonMin = $lon - $lonDelta; $lonMax = $lon + $lonDelta;
                if ($lonMin < -180.0) { $where .= ' AND (r.longitude >= ? OR r.longitude <= ?)'; $params[] = $lonMin + 360.0; $params[] = $lonMax; }
                elseif ($lonMax > 180.0) { $where .= ' AND (r.longitude >= ? OR r.longitude <= ?)'; $params[] = $lonMin; $params[] = $lonMax - 360.0; }
                else { $where .= ' AND r.longitude BETWEEN ? AND ?'; $params[] = $lonMin; $params[] = $lonMax; }
            }
            $params[] = $radius;
            $sql = "SELECT r.*,c.name AS category_name,
                    EXISTS(SELECT 1 FROM restaurant_sponsorships s WHERE s.restaurant_id=r.id AND s.status='active' AND s.starts_at<=UTC_TIMESTAMP() AND s.ends_at>UTC_TIMESTAMP()) AS sponsored,
                    (6371000 * 2 * ASIN(SQRT(LEAST(1,
                      POW(SIN(RADIANS(r.latitude - ?) / 2), 2) +
                      COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * POW(SIN(RADIANS(r.longitude - ?) / 2), 2)
                    )))) AS distance_meters
                    FROM restaurants r LEFT JOIN categories c ON c.id=r.category_id
                    WHERE {$where} HAVING distance_meters <= ? ORDER BY distance_meters,r.name LIMIT 250";
            $stmt = db()->prepare($sql); $stmt->execute($params);
        } else {
            $stmt = db()->query("SELECT r.*,c.name AS category_name,EXISTS(SELECT 1 FROM restaurant_sponsorships s WHERE s.restaurant_id=r.id AND s.status='active' AND s.starts_at<=UTC_TIMESTAMP() AND s.ends_at>UTC_TIMESTAMP()) AS sponsored FROM restaurants r LEFT JOIN categories c ON c.id=r.category_id WHERE r.status='published' ORDER BY sponsored DESC,r.name LIMIT 100");
        }
        $rows=$stmt->fetchAll();$foodNames=public_food_names_for_places(array_map('intval',array_column($rows,'id')),'restaurant_id');
        $data=array_map(static function(array $row) use($foodNames): array {$id=(string)$row['id'];return array_merge(public_restaurant($row),['category_name'=>$row['category_name'],'public_food_names'=>$foodNames[$id]??[]]);},$rows);
        json_response(['data'=>$data]);
    }
    if (preg_match('#^/restaurants/managed/(\d+)$#',$path,$m) && $method==='GET') {
        $stmt=db()->prepare("SELECT r.*,c.name AS category_name,EXISTS(SELECT 1 FROM restaurant_sponsorships s WHERE s.restaurant_id=r.id AND s.status='active' AND s.starts_at<=UTC_TIMESTAMP() AND s.ends_at>UTC_TIMESTAMP()) AS sponsored FROM restaurants r LEFT JOIN categories c ON c.id=r.category_id WHERE r.id=? AND r.status='published' LIMIT 1");$stmt->execute([valid_id($m[1])]);$row=$stmt->fetch();if(!$row)throw new ApiError(404,'Không tìm thấy địa điểm đã được công khai.');$foodNames=public_food_names_for_places([(int)$row['id']],'restaurant_id');$data=array_merge(public_restaurant($row),['description'=>$row['description'],'category_name'=>$row['category_name'],'public_food_names'=>$foodNames[(string)$row['id']]??[]]);json_response(['data'=>$data]);
    }
    if (preg_match('#^/restaurants/managed/(\d+)/notes$#',$path,$m) && $method==='GET') {
        $id=valid_id($m[1]);$check=db()->prepare("SELECT id FROM restaurants WHERE id=? AND status='published'");$check->execute([$id]);
        if(!$check->fetchColumn())throw new ApiError(404,'Không tìm thấy địa điểm đã được công khai.');
        json_response(['data'=>public_notes_for_place($id,null)]);
    }
    if ($path === '/restaurants/proposals' && $method === 'GET') {
        $user=current_user();$stmt=db()->prepare("SELECT r.*,c.name AS category_name FROM restaurants r LEFT JOIN categories c ON c.id=r.category_id WHERE r.created_by=? AND r.source='user' ORDER BY r.created_at DESC");$stmt->execute([$user['id']]);$rows=$stmt->fetchAll();foreach($rows as &$row){$row=array_merge(public_restaurant($row),['description'=>$row['description'],'category_name'=>$row['category_name'],'created_at'=>$row['created_at']]);}unset($row);json_response(['data'=>$rows]);
    }
    if ($path === '/restaurants/proposals' && $method === 'POST') {
        $user = current_user(); $name = required_string($body,'name',180,2); $address = required_string($body,'address',500,3);
        $lat = isset($body['latitude']) && $body['latitude'] !== '' ? filter_var($body['latitude'],FILTER_VALIDATE_FLOAT) : null;
        $lon = isset($body['longitude']) && $body['longitude'] !== '' ? filter_var($body['longitude'],FILTER_VALIDATE_FLOAT) : null;
        if (($lat === null) !== ($lon === null)) throw new ApiError(422,'Hãy cung cấp cả vĩ độ và kinh độ.');
        if (($lat !== null && ($lat === false || $lat < -90 || $lat > 90)) || ($lon !== null && ($lon === false || $lon < -180 || $lon > 180))) throw new ApiError(422,'Tọa độ không hợp lệ.');
        $stmt = db()->prepare("INSERT INTO restaurants(created_by,source,name,address,latitude,longitude,cuisine,phone,website,source_url,description,status) VALUES(?,'user',?,?,?,?,?,?,?,?,?, 'pending')");
        $stmt->execute([$user['id'],$name,$address,$lat,$lon,optional_string($body,'cuisine',255),optional_string($body,'phone',40),optional_http_url($body,'website'),optional_http_url($body,'source_url'),optional_string($body,'description',4000)]);
        $id = (int)db()->lastInsertId(); audit($user['id'],'restaurant.proposed','restaurant',(string)$id); json_response(['id'=>$id,'status'=>'pending','message'=>'Đề xuất đã gửi đến quản trị viên.'],201);
    }
    if ($path === '/place-reports' && $method==='POST') {
        $user=current_user();rate_limit('place_report',10,3600);
        $source=(string)($body['source']??'');$sourceId=required_string($body,'source_id',80);$name=required_string($body,'place_name',180,2);
        if($source==='osm'&&!preg_match('/^(node|way|relation):[1-9]\d{0,17}$/',$sourceId))throw new ApiError(422,'Địa điểm OSM không hợp lệ.');
        if($source==='managed'){$id=valid_id($sourceId);$check=db()->prepare("SELECT id FROM restaurants WHERE id=? AND status='published'");$check->execute([$id]);if(!$check->fetchColumn())throw new ApiError(422,'Địa điểm đã lưu không hợp lệ.');}
        if(!in_array($source,['osm','managed'],true))throw new ApiError(422,'Nguồn địa điểm không hợp lệ.');
        $reason=(string)($body['reason']??'');if(!in_array($reason,['closed','moved','wrong_info','other'],true))throw new ApiError(422,'Lý do báo cáo không hợp lệ.');
        $details=optional_string($body,'details',1000);if($reason==='other'&&$details===null)throw new ApiError(422,'Hãy mô tả thông tin cần kiểm tra.');
        [$latitude,$longitude]=optional_coordinates($body);
        $pending=db()->prepare("SELECT id FROM place_reports WHERE user_id=? AND source=? AND source_id=? AND status='pending' LIMIT 1");$pending->execute([$user['id'],$source,$sourceId]);
        if($pending->fetchColumn())throw new ApiError(409,'Bạn đã gửi báo cáo cho địa điểm này.');
        $stmt=db()->prepare('INSERT INTO place_reports(user_id,source,source_id,place_name,address,latitude,longitude,reason,details) VALUES(?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$user['id'],$source,$sourceId,$name,optional_string($body,'address',500),$latitude,$longitude,$reason,$details]);
        $id=(int)db()->lastInsertId();audit($user['id'],'place.reported','place_report',(string)$id,['reason'=>$reason]);
        json_response(['id'=>$id,'message'=>'Báo cáo đã được gửi để kiểm tra.'],201);
    }

    if ($path === '/food-notes' && $method === 'GET') {
        $scope = (string)($_GET['scope'] ?? 'mine'); $user = current_user($scope !== 'public');
        $page = max(1,min(1000,(int)($_GET['page'] ?? 1))); $limit = max(1,min(50,(int)($_GET['limit'] ?? 20))); $offset = ($page-1)*$limit;
        $where = $scope === 'public' ? "n.privacy='public' AND n.status='published'" : 'n.user_id=?';
        $params = $scope === 'public' ? [] : [$user['id']];
        if ($scope !== 'public' && !in_array($scope,['mine','all'],true)) throw new ApiError(422,'Bộ lọc không hợp lệ.');
        $sql = "SELECT n.*,u.name AS author_name,COALESCE(r.name,n.restaurant_name_snapshot) AS restaurant_name
          FROM food_notes n JOIN users u ON u.id=n.user_id LEFT JOIN restaurants r ON r.id=n.restaurant_id WHERE {$where} ORDER BY n.is_pinned DESC,n.eaten_at DESC,n.created_at DESC LIMIT {$limit} OFFSET {$offset}";
        $stmt = db()->prepare($sql); $stmt->execute($params);$countSql=$scope==='public'?"SELECT COUNT(*) FROM food_notes n WHERE n.privacy='public' AND n.status='published'":"SELECT COUNT(*) FROM food_notes n WHERE n.user_id=?";$countStmt=db()->prepare($countSql);$countStmt->execute($scope==='public'?[]:[$user['id']]);$statsSql=$scope==='public'?"SELECT COUNT(*) AS total,SUM(is_pinned) AS pinned_count,AVG(rating) AS average_rating,SUM(is_favorite) AS favorite_count FROM food_notes WHERE privacy='public' AND status='published'":"SELECT COUNT(*) AS total,SUM(is_pinned) AS pinned_count,AVG(rating) AS average_rating,SUM(is_favorite) AS favorite_count FROM food_notes WHERE user_id=?";$statsStmt=db()->prepare($statsSql);$statsStmt->execute($scope==='public'?[]:[$user['id']]);$stats=$statsStmt->fetch();json_response(['data'=>hydrate_note_rows($stmt->fetchAll()),'page'=>$page,'limit'=>$limit,'total'=>(int)$countStmt->fetchColumn(),'stats'=>['total'=>(int)$stats['total'],'pinned'=>(int)$stats['pinned_count'],'average_rating'=>$stats['average_rating']===null?null:(float)$stats['average_rating'],'favorites'=>(int)$stats['favorite_count']] ]);
    }
    if (preg_match('#^/food-notes/share/([A-Za-z0-9_-]+)$#',$path,$m) && $method==='GET') {
        $hash=token_hash($m[1]); $stmt=db()->prepare("SELECT n.*,u.name AS author_name,r.name AS restaurant_name FROM food_notes n JOIN users u ON u.id=n.user_id LEFT JOIN restaurants r ON r.id=n.restaurant_id WHERE n.share_token_hash=? AND n.privacy='link' AND n.status='published' LIMIT 1"); $stmt->execute([$hash]); $note=$stmt->fetch(); if(!$note) throw new ApiError(404,'Không tìm thấy Food Note.'); json_response(['data'=>hydrate_note_rows([$note],$m[1])[0]]);
    }
    if ($path === '/food-notes' && $method === 'POST') {
        $user=current_user(); $name=required_string($body,'food_name',180,1); $privacy=(string)($body['privacy']??'private'); if(!in_array($privacy,['private','public','link'],true)) throw new ApiError(422,'Quyền riêng tư không hợp lệ.');
        $rating=$body['rating']??null; if($rating!==null && (!is_numeric($rating)||(float)$rating<0||(float)$rating>5)) throw new ApiError(422,'Điểm đánh giá cần nằm trong khoảng 0–5.');
        $price=$body['price']??null; if($price!==null && (!is_numeric($price)||(float)$price<0)) throw new ApiError(422,'Giá tiền không hợp lệ.');
        $restaurantId=isset($body['restaurant_id'])?(int)$body['restaurant_id']:null; if($restaurantId){$chk=db()->prepare("SELECT id FROM restaurants WHERE id=? AND status='published'");$chk->execute([$restaurantId]);if(!$chk->fetchColumn())throw new ApiError(422,'Quán ăn không tồn tại hoặc chưa được duyệt.');}
        $eatenAt=optional_string($body,'eaten_at',10); if($eatenAt && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$eatenAt))throw new ApiError(422,'Ngày ăn không hợp lệ.');
        $source=isset($body['restaurant_source'])?(string)$body['restaurant_source']:null; if($source!==null&&!in_array($source,['osm','admin','user'],true))throw new ApiError(422,'Nguồn quán ăn không hợp lệ.');
        $sourceId=optional_string($body,'restaurant_source_id',80); $restaurantName=optional_string($body,'restaurant_name',180); $restaurantAddress=optional_string($body,'restaurant_address',500);
        if($sourceId!==null&&$source===null)throw new ApiError(422,'Thiếu nguồn của quán ăn.');
        $review=optional_string($body,'review',10000); $isDraft=(bool)($body['is_draft']??false); $state=$isDraft?'draft':($privacy==='public'?'pending':'published'); $shareToken=(!$isDraft&&$privacy==='link')?make_token():null;
        db()->beginTransaction(); $stmt=db()->prepare('INSERT INTO food_notes(user_id,restaurant_id,restaurant_source,restaurant_source_id,restaurant_name_snapshot,restaurant_address_snapshot,food_name,eaten_at,price,rating,review,privacy,status,share_token_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$user['id'],$restaurantId,$source,$sourceId,$restaurantName,$restaurantAddress,$name,$eatenAt,$price,$rating,$review,$privacy,$state,$shareToken?token_hash($shareToken):null]); $id=(int)db()->lastInsertId(); sync_note_tags($id,$user['id'],(array)($body['tags']??[])); audit($user['id'],'food_note.created','food_note',(string)$id,['privacy'=>$privacy]); db()->commit();
        $result=['data'=>fetch_note($id,$user['id'])]; if($shareToken)$result['share_url']='/pages/food-note.php?share='.rawurlencode($shareToken); json_response($result,201);
    }
    if (preg_match('#^/food-notes/(\d+)/flags$#',$path,$m) && $method==='PATCH') {
        $user=current_user();$id=valid_id($m[1]);fetch_note($id,$user['id']);
        $changes=[];$values=[];
        foreach (['is_favorite','is_pinned'] as $field) {
            if (!array_key_exists($field,$body)) continue;
            if (!is_bool($body[$field]) && !in_array($body[$field],[0,1],true)) throw new ApiError(422,'Trạng thái ghi chú không hợp lệ.');
            $changes[]="{$field}=?";$values[]=(int)(bool)$body[$field];
        }
        if (!$changes) throw new ApiError(422,'Chưa chọn trạng thái cần cập nhật.');
        $values[]=$id;$values[]=$user['id'];
        db()->prepare('UPDATE food_notes SET '.implode(',',$changes).' WHERE id=? AND user_id=?')->execute($values);
        json_response(['data'=>fetch_note($id,$user['id'])]);
    }
    if (preg_match('#^/food-notes/(\d+)/share$#',$path,$m) && in_array($method,['POST','DELETE'],true)) {
        $user=current_user();$id=valid_id($m[1]);$note=fetch_note($id,$user['id']);
        if ($method==='DELETE') {
            db()->prepare("UPDATE food_notes SET privacy='private',status='published',share_token_hash=NULL WHERE id=? AND user_id=?")->execute([$id,$user['id']]);
            audit($user['id'],'food_note.share_revoked','food_note',(string)$id);
            json_response(['data'=>fetch_note($id,$user['id'])]);
        }
        if ($note['privacy']!=='link' || $note['status']!=='published') throw new ApiError(409,'Hãy đăng ghi chú ở chế độ chia sẻ bằng liên kết trước.');
        $token=make_token();
        db()->prepare('UPDATE food_notes SET share_token_hash=? WHERE id=? AND user_id=?')->execute([token_hash($token),$id,$user['id']]);
        audit($user['id'],'food_note.share_rotated','food_note',(string)$id);
        json_response(['share_url'=>'/pages/food-note.php?share='.rawurlencode($token),'message'=>'Đã tạo liên kết mới. Liên kết cũ không còn hiệu lực.']);
    }
    if (preg_match('#^/food-notes/(\d+)$#',$path,$m)) {
        $id=valid_id($m[1]); $user=current_user();
        if($method==='GET') { $note=fetch_note($id); if($note['user_id']!==$user['id'] && !($note['privacy']==='public'&&$note['status']==='published')) throw new ApiError(404,'Không tìm thấy Food Note.'); json_response(['data'=>$note]); }
        if($method==='PUT'||$method==='PATCH') {
            $old=fetch_note($id,$user['id']); $name=required_string($body,'food_name',180,1); $privacy=(string)($body['privacy']??$old['privacy']); if(!in_array($privacy,['private','public','link'],true))throw new ApiError(422,'Quyền riêng tư không hợp lệ.');
            $rating=$body['rating']??null; if($rating!==null&&(!is_numeric($rating)||(float)$rating<0||(float)$rating>5))throw new ApiError(422,'Điểm đánh giá cần nằm trong khoảng 0–5.');
            $price=$body['price']??null; if($price!==null&&(!is_numeric($price)||(float)$price<0))throw new ApiError(422,'Giá tiền không hợp lệ.');
            $restaurantId=isset($body['restaurant_id'])?(int)$body['restaurant_id']:null;
            if ($restaurantId) { $check=db()->prepare('SELECT id FROM restaurants WHERE id=?');$check->execute([$restaurantId]);if(!$check->fetchColumn())throw new ApiError(422,'Quán ăn không tồn tại.'); }
            $source=isset($body['restaurant_source'])?(string)$body['restaurant_source']:null;
            if($source!==null&&!in_array($source,['osm','admin','user'],true))throw new ApiError(422,'Nguồn quán ăn không hợp lệ.');
            $sourceId=optional_string($body,'restaurant_source_id',80);$restaurantName=optional_string($body,'restaurant_name',180);$restaurantAddress=optional_string($body,'restaurant_address',500);
            if($sourceId!==null&&$source===null)throw new ApiError(422,'Thiếu nguồn của quán ăn.');
            $eatenAt=optional_string($body,'eaten_at',10);if($eatenAt&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',$eatenAt))throw new ApiError(422,'Ngày ăn không hợp lệ.');
            $review=optional_string($body,'review',10000);$tags=normalized_note_tags((array)($body['tags']??[]));$oldTags=normalized_note_tags($old['tags']);sort($tags);sort($oldTags);
            $contentChanged = $name!==$old['food_name'] || $privacy!==$old['privacy'] || $restaurantId!==$old['restaurant_id']
                || $source!==$old['restaurant_source'] || $sourceId!==$old['restaurant_source_id']
                || $restaurantName!==$old['restaurant_name_snapshot'] || $restaurantAddress!==$old['restaurant_address_snapshot']
                || $eatenAt!==$old['eaten_at'] || $review!==$old['review']
                || ($rating===null?null:(float)$rating)!==$old['rating'] || ($price===null?null:(float)$price)!==$old['price']
                || $tags!==$oldTags;
            $isDraft=(bool)($body['is_draft']??false);
            $state=$isDraft?'draft':($privacy==='public'?($contentChanged?'pending':$old['status']):'published');
            if($privacy==='public' && !in_array($state,['published','pending','rejected','hidden'],true))$state='pending';
            $shareToken=null;$shareHash=null;
            if(!$isDraft&&$privacy==='link'){$existing=db()->prepare('SELECT share_token_hash FROM food_notes WHERE id=? AND user_id=?');$existing->execute([$id,$user['id']]);$shareHash=$existing->fetchColumn()?:null;if($old['privacy']!=='link'||$shareHash===null){$shareToken=make_token();$shareHash=token_hash($shareToken);}}
            db()->beginTransaction();
            db()->prepare('UPDATE food_notes SET restaurant_id=?,restaurant_source=?,restaurant_source_id=?,restaurant_name_snapshot=?,restaurant_address_snapshot=?,food_name=?,eaten_at=?,price=?,rating=?,review=?,privacy=?,status=?,is_favorite=?,is_pinned=?,share_token_hash=? WHERE id=? AND user_id=?')
                ->execute([$restaurantId,$source,$sourceId,$restaurantName,$restaurantAddress,$name,$eatenAt,$price,$rating,$review,$privacy,$state,(int)(bool)($body['is_favorite']??$old['is_favorite']),(int)(bool)($body['is_pinned']??$old['is_pinned']),$shareHash,$id,$user['id']]);
            sync_note_tags($id,$user['id'],$tags);audit($user['id'],'food_note.updated','food_note',(string)$id);db()->commit();
            $result=['data'=>fetch_note($id,$user['id'])];if($shareToken)$result['share_url']='/pages/food-note.php?share='.rawurlencode($shareToken);json_response($result);
        }
        if($method==='DELETE'){
            fetch_note($id,$user['id']);
            $media=db()->prepare('SELECT storage_key FROM food_note_media WHERE food_note_id=?');$media->execute([$id]);$keys=$media->fetchAll(PDO::FETCH_COLUMN);
            db()->beginTransaction();
            try { db()->prepare('DELETE FROM food_notes WHERE id=? AND user_id=?')->execute([$id,$user['id']]);audit($user['id'],'food_note.deleted','food_note',(string)$id);db()->commit(); }
            catch(Throwable $error){if(db()->inTransaction())db()->rollBack();throw $error;}
            foreach($keys as $key)remove_note_media_file((string)$key);
            json_response(['message'=>'Food Note đã được xóa.']);
        }
    }
    if (preg_match('#^/food-notes/(\d+)/media$#',$path,$m) && $method==='POST') {
        $id=valid_id($m[1]);$user=current_user();fetch_note($id,$user['id']);$file=$_FILES['media']??null;
        if(!$file){$contentLength=(int)($_SERVER['CONTENT_LENGTH']??0);$postLimit=ini_size_bytes((string)ini_get('post_max_size'));if($contentLength>0&&$postLimit>0&&$contentLength>$postLimit)throw new ApiError(413,'Máy chủ PHP đang nhận tối đa post_max_size='.(string)ini_get('post_max_size').'. What2Eat cho phép tối đa 50 MB mỗi tệp; hãy tăng post_max_size lên ít nhất 64M.');throw new ApiError(422,'Chưa nhận được tệp tải lên. Hãy chọn lại ảnh hoặc video.');}
        $uploadError=(int)($file['error']??UPLOAD_ERR_NO_FILE);if($uploadError!==UPLOAD_ERR_OK){if($uploadError===UPLOAD_ERR_INI_SIZE||$uploadError===UPLOAD_ERR_FORM_SIZE)throw new ApiError(413,'PHP hiện giới hạn upload_max_filesize='.(string)ini_get('upload_max_filesize').' và post_max_size='.(string)ini_get('post_max_size').'. What2Eat cho phép tối đa 50 MB mỗi tệp; hãy tăng các giới hạn PHP tương ứng.');throw new ApiError(422,'Tệp tải lên chưa hoàn tất. Hãy thử lại.');}
        if(!isset($file['tmp_name'])||!is_uploaded_file($file['tmp_name']))throw new ApiError(422,'Tệp tải lên không hợp lệ.');
        $max=max(1024,min(52428800,(int)env_value('W2E_MAX_UPLOAD_BYTES','52428800')));if((int)$file['size']>$max)throw new ApiError(413,'Ảnh hoặc video vượt quá giới hạn 50 MB.');
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif','video/mp4'=>'mp4','video/webm'=>'webm'];if(!isset($allowed[$mime]))throw new ApiError(415,'Chỉ hỗ trợ ảnh JPEG, PNG, WEBP, GIF và video MP4/WEBM.');
        $root=dirname(__DIR__).'/storage/uploads/notes';if(!is_dir($root)&&!mkdir($root,0750,true)&&!is_dir($root))throw new ApiError(503,'Không tạo được vùng lưu tệp.');$key=bin2hex(random_bytes(24)).'.'.$allowed[$mime];$target=$root.'/'.$key;
        if(!move_uploaded_file($file['tmp_name'],$target))throw new ApiError(500,'Không lưu được tệp.');
        try{$stmt=db()->prepare('INSERT INTO food_note_media(food_note_id,storage_key,mime_type,byte_size) VALUES(?,?,?,?)');$stmt->execute([$id,$key,$mime,(int)$file['size']]);$mediaId=(int)db()->lastInsertId();}catch(Throwable $error){@unlink($target);throw $error;}
        json_response(['id'=>$mediaId,'url'=>'/api/v1/media/'.$mediaId,'mime_type'=>$mime],201);
    }
    if (preg_match('#^/media/(\d+)$#',$path,$m) && $method==='DELETE') {
        $user=current_user();$id=valid_id($m[1]);
        $stmt=db()->prepare('SELECT m.storage_key,n.user_id FROM food_note_media m JOIN food_notes n ON n.id=m.food_note_id WHERE m.id=? LIMIT 1');
        $stmt->execute([$id]);$media=$stmt->fetch();
        if(!$media||(int)$media['user_id']!==$user['id'])throw new ApiError(404,'Không tìm thấy tệp.');
        db()->prepare('DELETE FROM food_note_media WHERE id=?')->execute([$id]);
        remove_note_media_file((string)$media['storage_key']);
        json_response(['message'=>'Đã xóa tệp khỏi Food Note.']);
    }
    if (preg_match('#^/media/(\d+)$#',$path,$m) && $method==='GET') {
        $mediaId=valid_id($m[1]);$stmt=db()->prepare('SELECT m.*,n.user_id,n.privacy,n.status,n.share_token_hash FROM food_note_media m JOIN food_notes n ON n.id=m.food_note_id WHERE m.id=? LIMIT 1');$stmt->execute([$mediaId]);$media=$stmt->fetch();if(!$media)throw new ApiError(404,'Không tìm thấy tệp.');
        $viewer=current_user(false);$allowed=($viewer&&$viewer['id']===(int)$media['user_id'])||($media['privacy']==='public'&&$media['status']==='published');$share=(string)($_GET['share']??'');if(!$allowed&&$share!==''&&$media['privacy']==='link'&&$media['status']==='published'&&hash_equals((string)$media['share_token_hash'],token_hash($share)))$allowed=true;if(!$allowed)throw new ApiError(404,'Không tìm thấy tệp.');
        $file=dirname(__DIR__).'/storage/uploads/notes/'.$media['storage_key'];if(!is_file($file))throw new ApiError(404,'Tệp đã bị xóa.');header('Content-Type: '.$media['mime_type']);header('X-Content-Type-Options: nosniff');header('Cache-Control: private, max-age=300');header('Content-Length: '.filesize($file));readfile($file);exit;
    }
    if (preg_match('#^/avatar/(\d+)$#',$path,$m) && $method==='GET') {
        $viewer=current_user();$id=valid_id($m[1]);if($viewer['id']!==$id&&$viewer['role']!=='admin')throw new ApiError(404,'Không tìm thấy ảnh hồ sơ.');$stmt=db()->prepare('SELECT avatar_url FROM users WHERE id=?');$stmt->execute([$id]);$key=$stmt->fetchColumn();if(!$key)throw new ApiError(404,'Chưa có ảnh hồ sơ.');$file=dirname(__DIR__).'/storage/uploads/'.$key;if(!is_file($file)||!str_starts_with(realpath($file)?:'',realpath(dirname(__DIR__).'/storage/uploads/avatars')?:'!'))throw new ApiError(404,'Không tìm thấy ảnh hồ sơ.');$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file);if(!in_array($mime,['image/jpeg','image/png','image/webp'],true))throw new ApiError(404,'Không tìm thấy ảnh hồ sơ.');header('Content-Type: '.$mime);header('X-Content-Type-Options: nosniff');header('Cache-Control: private, max-age=300');header('Content-Length: '.filesize($file));readfile($file);exit;
    }
    if (preg_match('#^/favorites$#',$path) && $method==='GET') {
        $user=current_user();$page=max(1,(int)($_GET['page']??1));$limit=max(1,min(500,(int)($_GET['limit']??200)));$count=db()->prepare('SELECT COUNT(*) FROM favorite_restaurants WHERE user_id=?');$count->execute([$user['id']]);$total=(int)$count->fetchColumn();$offset=($page-1)*$limit;$stmt=db()->prepare("SELECT source,source_id,restaurant_id,name,address,latitude,longitude,source_url,created_at FROM favorite_restaurants WHERE user_id=? ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}");$stmt->execute([$user['id']]);json_response(['data'=>$stmt->fetchAll(),'total'=>$total,'page'=>$page,'limit'=>$limit]);
    }
    if (preg_match('#^/favorites$#',$path) && $method==='POST') {
        $user=current_user();$source=(string)($body['source']??'osm');$sourceId=required_string($body,'source_id',80);if(!in_array($source,['osm','admin','user'],true))throw new ApiError(422,'Nguồn địa điểm không hợp lệ.');$name=required_string($body,'name',180,1);$address=optional_string($body,'address',500);
        [$latitude,$longitude]=optional_coordinates($body);$restaurantId=isset($body['restaurant_id'])?filter_var($body['restaurant_id'],FILTER_VALIDATE_INT):null;if($restaurantId!==null&&(!$restaurantId||$restaurantId<1))throw new ApiError(422,'Địa điểm không hợp lệ.');
        $stmt=db()->prepare('INSERT IGNORE INTO favorite_restaurants(user_id,source,source_id,name,address,latitude,longitude,source_url,restaurant_id) VALUES(?,?,?,?,?,?,?,?,?)');$stmt->execute([$user['id'],$source,$sourceId,$name,$address,$latitude,$longitude,optional_http_url($body,'source_url'),$restaurantId]);$added=$stmt->rowCount()===1;if(!$added)db()->prepare('DELETE FROM favorite_restaurants WHERE user_id=? AND source=? AND source_id=?')->execute([$user['id'],$source,$sourceId]);json_response(['favorite'=>$added]);
    }

    if ($path === '/food-plans' && $method === 'GET') {
        $user=current_user();$stmt=db()->prepare('SELECT p.id,p.creator_id,p.name,p.description,p.event_at,p.status,p.created_at,m.role AS member_role,(SELECT COUNT(*) FROM food_plan_members mm WHERE mm.food_plan_id=p.id) AS member_count,(SELECT COUNT(*) FROM restaurant_proposals rp WHERE rp.food_plan_id=p.id) AS proposal_count FROM food_plans p JOIN food_plan_members m ON m.food_plan_id=p.id WHERE m.user_id=? ORDER BY p.event_at IS NULL,p.event_at,p.created_at DESC');$stmt->execute([$user['id']]);json_response(['data'=>$stmt->fetchAll()]);
    }
    if ($path === '/food-plans' && $method === 'POST') {
        $user=current_user();$name=required_string($body,'name',150,1);$description=optional_string($body,'description',1000);$eventAt=optional_string($body,'event_at',35);if($eventAt){$timestamp=strtotime($eventAt);if($timestamp===false)throw new ApiError(422,'Ngày giờ dự kiến không hợp lệ.');$eventAt=gmdate('Y-m-d H:i:s',$timestamp);}$token=make_token();
        db()->beginTransaction();$stmt=db()->prepare("INSERT INTO food_plans(creator_id,name,description,event_at,status,invite_token_hash) VALUES(?,?,?,?, 'open',?)");$stmt->execute([$user['id'],$name,$description,$eventAt,token_hash($token)]);$id=(int)db()->lastInsertId();db()->prepare("INSERT INTO food_plan_members(food_plan_id,user_id,role) VALUES(?,?,'owner')")->execute([$id,$user['id']]);audit($user['id'],'food_plan.created','food_plan',(string)$id);db()->commit();json_response(['id'=>$id,'name'=>$name,'invite_token'=>$token,'invite_url'=>'/pages/food-plans.php?join='.rawurlencode($token)],201);
    }
    if ($path === '/food-plans/join' && $method === 'POST') {
        $user=current_user();$token=required_string($body,'token',120,30);$stmt=db()->prepare('SELECT id FROM food_plans WHERE invite_token_hash=? AND status IN (\'open\',\'decided\') LIMIT 1');$stmt->execute([token_hash($token)]);$planId=(int)$stmt->fetchColumn();if(!$planId)throw new ApiError(404,'Liên kết mời không hợp lệ hoặc Food Plan đã đóng.');db()->prepare("INSERT IGNORE INTO food_plan_members(food_plan_id,user_id,role) VALUES(?,?,'member')")->execute([$planId,$user['id']]);json_response(['id'=>$planId,'message'=>'Bạn đã tham gia Food Plan.']);
    }
    if (preg_match('#^/food-plans/(\d+)$#',$path,$m) && $method==='GET') {
        $user=current_user();$planId=valid_id($m[1]);$plan=require_plan_member($planId,$user['id']);unset($plan['invite_token_hash']);$proposal=db()->prepare('SELECT rp.*,u.name AS proposed_by_name,(SELECT COUNT(*) FROM votes v WHERE v.proposal_id=rp.id) AS votes,(SELECT 1 FROM votes v WHERE v.proposal_id=rp.id AND v.user_id=?) AS my_vote FROM restaurant_proposals rp JOIN users u ON u.id=rp.proposed_by WHERE rp.food_plan_id=? ORDER BY votes DESC,rp.created_at');$proposal->execute([$user['id'],$planId]);$members=db()->prepare('SELECT u.id,u.name,u.avatar_url,m.role,m.joined_at FROM food_plan_members m JOIN users u ON u.id=m.user_id WHERE m.food_plan_id=? ORDER BY m.role DESC,m.joined_at');$members->execute([$planId]);$plan['id']=(int)$plan['id'];$plan['proposals']=$proposal->fetchAll();$plan['members']=$members->fetchAll();json_response(['data'=>$plan]);
    }
    if (preg_match('#^/food-plans/(\d+)/invite$#',$path,$m) && $method==='POST') {
        $user=current_user();$planId=valid_id($m[1]);$plan=require_plan_member($planId,$user['id']);if($plan['member_role']!=='owner')throw new ApiError(403,'Chỉ chủ Food Plan mới có thể tạo liên kết mời.');if(!in_array($plan['status'],['open','decided'],true))throw new ApiError(409,'Food Plan đã đóng.');$token=make_token();db()->prepare('UPDATE food_plans SET invite_token_hash=? WHERE id=?')->execute([token_hash($token),$planId]);audit($user['id'],'food_plan.invite_rotated','food_plan',(string)$planId);json_response(['invite_url'=>'/pages/food-plans.php?join='.rawurlencode($token)]);
    }
    if (preg_match('#^/food-plans/(\d+)/proposals$#',$path,$m) && $method==='POST') {
        $user=current_user();$planId=valid_id($m[1]);$plan=require_plan_member($planId,$user['id']);if($plan['status']!=='open')throw new ApiError(409,'Food Plan đã đóng bình chọn.');$source=(string)($body['source']??'osm');if(!in_array($source,['osm','admin','user'],true))throw new ApiError(422,'Nguồn địa điểm không hợp lệ.');$sourceId=required_string($body,'source_id',80);$name=required_string($body,'name',180,1);$address=optional_string($body,'address',500);
        [$latitude,$longitude]=optional_coordinates($body);$restaurantId=null;if(isset($body['restaurant_id'])&&$body['restaurant_id']!==''){$restaurantId=filter_var($body['restaurant_id'],FILTER_VALIDATE_INT);if(!$restaurantId||$restaurantId<1)throw new ApiError(422,'Địa điểm đã lưu không hợp lệ.');$restaurant=db()->prepare("SELECT id,source FROM restaurants WHERE id=? AND status='published' LIMIT 1");$restaurant->execute([$restaurantId]);$managed=$restaurant->fetch();if(!$managed||$managed['source']!==$source||$sourceId!=='managed:'.$restaurantId)throw new ApiError(422,'Địa điểm đã lưu không khớp với nguồn.');}$stmt=db()->prepare('INSERT INTO restaurant_proposals(food_plan_id,proposed_by,restaurant_id,source,source_id,name,address,latitude,longitude,source_url) VALUES(?,?,?,?,?,?,?,?,?,?)');try{$stmt->execute([$planId,$user['id'],$restaurantId,$source,$sourceId,$name,$address,$latitude,$longitude,optional_http_url($body,'source_url')]);}catch(PDOException $error){if($error->getCode()==='23000')throw new ApiError(409,'Địa điểm này đã được đề xuất.');throw $error;}json_response(['id'=>(int)db()->lastInsertId()],201);
    }
    if (preg_match('#^/food-plans/(\d+)/vote$#',$path,$m) && $method==='POST') {
        $user=current_user();$planId=valid_id($m[1]);$proposalId=(int)($body['proposal_id']??0);if($proposalId<1)throw new ApiError(422,'Lựa chọn không hợp lệ.');db()->beginTransaction();$plan=require_plan_member($planId,$user['id'],true);if($plan['status']!=='open')throw new ApiError(409,'Bình chọn đã đóng.');$check=db()->prepare('SELECT id FROM restaurant_proposals WHERE id=? AND food_plan_id=?');$check->execute([$proposalId,$planId]);if(!$check->fetchColumn())throw new ApiError(404,'Không tìm thấy đề xuất.');db()->prepare('DELETE v FROM votes v JOIN restaurant_proposals rp ON rp.id=v.proposal_id WHERE rp.food_plan_id=? AND v.user_id=?')->execute([$planId,$user['id']]);db()->prepare('INSERT INTO votes(proposal_id,user_id) VALUES(?,?)')->execute([$proposalId,$user['id']]);audit($user['id'],'food_plan.vote','food_plan',(string)$planId,['proposal_id'=>$proposalId]);db()->commit();json_response(['message'=>'Bình chọn đã được ghi nhận.']);
    }
    if (preg_match('#^/food-plans/(\d+)$#',$path,$m) && $method==='DELETE') {
        $user=current_user();$planId=valid_id($m[1]);$plan=require_plan_member($planId,$user['id']);if($plan['member_role']!=='owner')throw new ApiError(403,'Chỉ chủ Food Plan mới có thể xóa.');db()->prepare('DELETE FROM food_plans WHERE id=?')->execute([$planId]);audit($user['id'],'food_plan.deleted','food_plan',(string)$planId);json_response(['message'=>'Food Plan đã được xóa.']);
    }
    if (preg_match('#^/food-plans/(\d+)$#',$path,$m) && in_array($method,['PATCH','PUT'],true)) {
        $user=current_user();$planId=valid_id($m[1]);$plan=require_plan_member($planId,$user['id']);if($plan['member_role']!=='owner')throw new ApiError(403,'Chỉ chủ Food Plan mới có thể sửa.');$status=(string)($body['status']??$plan['status']);if(!in_array($status,['open','decided','closed','cancelled'],true))throw new ApiError(422,'Trạng thái Food Plan không hợp lệ.');$eventAt=optional_string($body,'event_at',35);if($eventAt){$timestamp=strtotime($eventAt);if($timestamp===false)throw new ApiError(422,'Ngày giờ dự kiến không hợp lệ.');$eventAt=gmdate('Y-m-d H:i:s',$timestamp);}db()->prepare('UPDATE food_plans SET name=?,description=?,event_at=?,status=? WHERE id=?')->execute([required_string($body,'name',150,1),optional_string($body,'description',1000),$eventAt,$status,$planId]);audit($user['id'],'food_plan.updated','food_plan',(string)$planId,['status'=>$status]);json_response(['message'=>'Food Plan đã được cập nhật.']);
    }

    if ($path === '/profile' && $method === 'GET') json_response(['user'=>current_user()]);
    if ($path === '/profile' && $method === 'DELETE') {
        $user=current_user();if($user['role']==='admin')throw new ApiError(403,'Tài khoản quản trị không thể tự xóa tại đây.');rate_limit('account_delete',3,3600);$password=(string)($body['password']??'');$confirmation=(string)($body['confirmation']??'');if($confirmation!=='XÓA TÀI KHOẢN')throw new ApiError(422,'Vui lòng xác nhận xóa tài khoản.');$check=db()->prepare('SELECT password_hash,avatar_url FROM users WHERE id=?');$check->execute([$user['id']]);$account=$check->fetch();if(!$account||!password_verify($password,(string)$account['password_hash']))throw new ApiError(401,'Mật khẩu hiện tại không đúng.');$media=db()->prepare('SELECT m.storage_key FROM food_note_media m JOIN food_notes n ON n.id=m.food_note_id WHERE n.user_id=?');$media->execute([$user['id']]);$mediaKeys=$media->fetchAll(PDO::FETCH_COLUMN);db()->beginTransaction();try{audit($user['id'],'account.deleted','user',(string)$user['id']);db()->prepare('DELETE FROM users WHERE id=?')->execute([$user['id']]);db()->commit();}catch(Throwable $error){if(db()->inTransaction())db()->rollBack();throw $error;}foreach($mediaKeys as $key){if(is_string($key)&&preg_match('#^[A-Za-z0-9/_-]+\.(jpg|jpeg|png|webp|mp4|webm)$#i',$key)){@unlink(dirname(__DIR__).'/storage/uploads/'.$key);}}$avatar=(string)$account['avatar_url'];if($avatar!==''&&preg_match('#^avatars/[A-Za-z0-9_-]+\.(jpg|png|webp)$#i',$avatar)){@unlink(dirname(__DIR__).'/storage/uploads/'.$avatar);}$_SESSION=[];if(ini_get('session.use_cookies')){$cookie=session_get_cookie_params();setcookie(session_name(),'',['expires'=>time()-42000,'path'=>$cookie['path'],'domain'=>$cookie['domain'],'secure'=>$cookie['secure'],'httponly'=>$cookie['httponly'],'samesite'=>$cookie['samesite']??'Lax']);}if(session_status()===PHP_SESSION_ACTIVE)session_destroy();json_response(['message'=>'Tài khoản và dữ liệu liên quan đã được xóa.']);
    }
    if ($path === '/profile' && $method === 'PUT') {
        $user=current_user();$name=required_string($body,'name',100,2);$phone=optional_string($body,'phone',32);$prefs=array_slice(array_values(array_unique(array_map('strval',(array)($body['preferences']??[])))),0,30);db()->prepare('UPDATE users SET name=?,phone=?,preferences=? WHERE id=?')->execute([$name,$phone,json_encode($prefs,JSON_UNESCAPED_UNICODE),$user['id']]);audit($user['id'],'profile.updated','user',(string)$user['id']);json_response(['user'=>current_user()]);
    }
    if ($path === '/profile/avatar' && $method === 'POST') {
        $user=current_user();$file=$_FILES['avatar']??null;if(!$file||!isset($file['tmp_name'])||$file['error']!==UPLOAD_ERR_OK||!is_uploaded_file($file['tmp_name']))throw new ApiError(422,'Chưa chọn được ảnh hồ sơ.');if((int)$file['size']>5*1024*1024)throw new ApiError(413,'Ảnh đại diện tối đa 5 MB.');$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$extensions=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];if(!isset($extensions[$mime]))throw new ApiError(415,'Ảnh đại diện hỗ trợ JPEG, PNG hoặc WEBP.');$dir=dirname(__DIR__).'/storage/uploads/avatars';if(!is_dir($dir)&&!mkdir($dir,0750,true)&&!is_dir($dir))throw new ApiError(503,'Không tạo được vùng lưu ảnh.');$key='avatars/'.bin2hex(random_bytes(24)).'.'.$extensions[$mime];if(!move_uploaded_file($file['tmp_name'],dirname(__DIR__).'/storage/uploads/'.$key))throw new ApiError(500,'Không lưu được ảnh hồ sơ.');$stmt=db()->prepare('SELECT avatar_url FROM users WHERE id=?');$stmt->execute([$user['id']]);$old=(string)$stmt->fetchColumn();db()->prepare('UPDATE users SET avatar_url=? WHERE id=?')->execute([$key,$user['id']]);if(str_starts_with($old,'avatars/')){@unlink(dirname(__DIR__).'/storage/uploads/'.$old);}audit($user['id'],'profile.avatar_updated','user',(string)$user['id']);json_response(['user'=>current_user()]);
    }
    if ($path === '/profile/password' && $method === 'POST') {
        $user=current_user();$old=(string)($body['current_password']??'');$new=(string)($body['new_password']??'');$stmt=db()->prepare('SELECT password_hash FROM users WHERE id=?');$stmt->execute([$user['id']]);$hash=(string)$stmt->fetchColumn();if(!password_verify($old,$hash))throw new ApiError(401,'Mật khẩu hiện tại không đúng.');if(strlen($new)<8||strlen($new)>1024)throw new ApiError(422,'Mật khẩu mới cần có ít nhất 8 ký tự.');db()->prepare('UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=?')->execute([password_hash($new,defined('PASSWORD_ARGON2ID')?PASSWORD_ARGON2ID:PASSWORD_DEFAULT),$user['id']]);$_SESSION['session_version']=$user['session_version']+1;session_regenerate_id(true);audit($user['id'],'profile.password_changed','user',(string)$user['id']);json_response(['message'=>'Mật khẩu đã được cập nhật.']);
    }
    if ($path === '/dashboard' && $method === 'GET') {
        $user=current_user();$id=$user['id'];$stats=db()->prepare("SELECT COUNT(*) AS total_notes,COALESCE(SUM(price),0) AS total_spent,AVG(rating) AS average_rating,SUM(eaten_at>=DATE_FORMAT(UTC_DATE(),'%Y-%m-01')) AS month_notes FROM food_notes WHERE user_id=? AND status<>'rejected'");$stats->execute([$id]);$summary=$stats->fetch();$fav=db()->prepare('SELECT COUNT(*) FROM favorite_restaurants WHERE user_id=?');$fav->execute([$id]);$plans=db()->prepare('SELECT COUNT(DISTINCT food_plan_id) FROM food_plan_members WHERE user_id=?');$plans->execute([$id]);$monthly=db()->prepare("SELECT DATE_FORMAT(eaten_at,'%Y-%m') AS month,SUM(COALESCE(price,0)) AS spent,COUNT(*) AS notes FROM food_notes WHERE user_id=? AND eaten_at>=DATE_SUB(UTC_DATE(),INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(eaten_at,'%Y-%m') ORDER BY month");$monthly->execute([$id]);$cats=db()->prepare("SELECT COALESCE(r.cuisine,n.restaurant_name_snapshot,'Chưa phân loại') AS category,COUNT(*) AS total FROM food_notes n LEFT JOIN restaurants r ON r.id=n.restaurant_id WHERE n.user_id=? GROUP BY category ORDER BY total DESC LIMIT 8");$cats->execute([$id]);$recent=db()->prepare('SELECT id,food_name,eaten_at,price,rating,privacy,status FROM food_notes WHERE user_id=? ORDER BY created_at DESC LIMIT 6');$recent->execute([$id]);$top=db()->prepare("SELECT COALESCE(r.name,n.restaurant_name_snapshot) AS name,COUNT(*) AS visits FROM food_notes n LEFT JOIN restaurants r ON r.id=n.restaurant_id WHERE n.user_id=? AND COALESCE(r.name,n.restaurant_name_snapshot) IS NOT NULL GROUP BY name ORDER BY visits DESC LIMIT 5");$top->execute([$id]);$summary['total_notes']=(int)$summary['total_notes'];$summary['total_spent']=(float)$summary['total_spent'];$summary['average_rating']=$summary['average_rating']===null?null:(float)$summary['average_rating'];$summary['total_favorites']=(int)$fav->fetchColumn();$summary['food_plans']=(int)$plans->fetchColumn();$summary['month_notes']=(int)$summary['month_notes'];json_response(['stats'=>$summary,'monthly'=>$monthly->fetchAll(),'categories'=>$cats->fetchAll(),'top_restaurants'=>$top->fetchAll(),'recent_notes'=>$recent->fetchAll()]);
    }

    // Admin routes are separated from public and user APIs and always check server-side role.
    if ($path === '/admin/place-reports' && $method==='GET') {
        require_admin();$status=(string)($_GET['status']??'pending');if(!in_array($status,['pending','resolved','dismissed','all'],true))throw new ApiError(422,'Trạng thái báo cáo không hợp lệ.');
        $where=$status==='all'?'':'WHERE p.status=?';$stmt=db()->prepare("SELECT p.*,u.name AS reporter_name FROM place_reports p JOIN users u ON u.id=p.user_id {$where} ORDER BY p.created_at DESC,p.id DESC LIMIT 100");$stmt->execute($status==='all'?[]:[$status]);
        json_response(['data'=>$stmt->fetchAll()]);
    }
    if (preg_match('#^/admin/place-reports/(\d+)$#',$path,$m) && $method==='PATCH') {
        $admin=require_admin();$id=valid_id($m[1]);$status=(string)($body['status']??'');if(!in_array($status,['resolved','dismissed'],true))throw new ApiError(422,'Trạng thái xử lý không hợp lệ.');
        $report=db()->prepare("SELECT source,source_id,reason FROM place_reports WHERE id=? AND status='pending' LIMIT 1");$report->execute([$id]);$place=$report->fetch();if(!$place)throw new ApiError(404,'Báo cáo không còn trong hàng chờ.');
        $hide=!empty($body['hide_place']);if($hide&&$status!=='resolved')throw new ApiError(422,'Chỉ báo cáo đã xác minh mới có thể ẩn địa điểm.');
        db()->beginTransaction();
        try{
            $stmt=db()->prepare("UPDATE place_reports SET status=?,review_note=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP() WHERE id=? AND status='pending'");
            $stmt->execute([$status,optional_string($body,'review_note',500),$admin['id'],$id]);if($stmt->rowCount()===0)throw new ApiError(409,'Báo cáo đã được xử lý.');
            if($hide&&$place['source']==='osm')db()->prepare('INSERT INTO osm_place_blocks(source_id,reason,created_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason),created_by=VALUES(created_by)')->execute([$place['source_id'],$place['reason'],$admin['id']]);
            if($hide&&$place['source']==='managed'){db()->prepare("UPDATE restaurants SET status='hidden',moderated_by=?,moderated_at=UTC_TIMESTAMP() WHERE id=?")->execute([$admin['id'],(int)$place['source_id']]);pause_restaurant_sponsorship((int)$place['source_id']);}
            audit($admin['id'],'place_report.reviewed','place_report',(string)$id,['status'=>$status,'hide_place'=>$hide]);db()->commit();
        }catch(Throwable $error){if(db()->inTransaction())db()->rollBack();throw $error;}
        json_response(['message'=>'Đã xử lý báo cáo địa điểm.']);
    }
    if ($path === '/admin/osm-place-blocks' && $method==='GET') {
        require_admin();json_response(['data'=>db()->query('SELECT source_id,reason,created_at FROM osm_place_blocks ORDER BY created_at DESC LIMIT 200')->fetchAll()]);
    }
    if (preg_match('#^/admin/osm-place-blocks/(node|way|relation):([1-9]\d{0,17})$#',$path,$m) && $method==='DELETE') {
        $admin=require_admin();$id=$m[1].':'.$m[2];db()->prepare('DELETE FROM osm_place_blocks WHERE source_id=?')->execute([$id]);
        audit($admin['id'],'osm_place.restored','osm_place',$id);json_response(['message'=>'Đã khôi phục địa điểm trên bản đồ.']);
    }
    if ($path === '/admin/geocode' && $method === 'POST') {
        $admin=require_admin();$address=required_string($body,'address',500,5);$result=nominatim_search($address);
        if($result['found'])audit($admin['id'],'restaurant.geocoded','restaurant',null,['provider'=>'nominatim']);
        json_response($result);
    }
    if ($path === '/admin/dashboard' && $method === 'GET') {
        require_admin();$counts=[];foreach(['users','restaurants','food_notes','categories','food_plans'] as $table){$counts[$table]=(int)db()->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();}$countStatus=db()->prepare('SELECT COUNT(*) FROM food_notes WHERE status=?');foreach(['pending','published','hidden','rejected','draft'] as $status){$countStatus->execute([$status]);$counts[$status.'_notes']=(int)$countStatus->fetchColumn();}$counts['pending_restaurants']=(int)db()->query("SELECT COUNT(*) FROM restaurants WHERE status='pending'")->fetchColumn();$counts['pending_notes']=(int)db()->query("SELECT COUNT(*) FROM food_notes WHERE status='pending'")->fetchColumn();$counts['suspended_users']=(int)db()->query("SELECT COUNT(*) FROM users WHERE status='suspended'")->fetchColumn();
        $users=db()->query("SELECT DATE(created_at) AS day,COUNT(*) AS total FROM users WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY day")->fetchAll();$notes=db()->query("SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,COUNT(*) AS total FROM food_notes WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 5 MONTH) GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY month")->fetchAll();$activity=db()->query('SELECT a.action,a.entity_type,a.entity_id,a.created_at,u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 10')->fetchAll();json_response(['counts'=>$counts,'user_series'=>$users,'note_series'=>$notes,'activity'=>$activity]);
    }
    if ($path === '/admin/categories' && $method === 'GET') { require_admin();json_response(['data'=>db()->query('SELECT c.*, (SELECT COUNT(*) FROM restaurants r WHERE r.category_id=c.id) AS restaurant_count FROM categories c ORDER BY c.name')->fetchAll()]); }
    if ($path === '/admin/categories' && $method === 'POST') {
        $admin=require_admin();$name=required_string($body,'name',100,1);$slug=mb_strtolower(trim((string)($body['slug']??$name)),'UTF-8');$slug=trim(preg_replace('/[^\pL\pN]+/u','-',$slug)??'','-');if($slug==='')throw new ApiError(422,'Mã danh mục không hợp lệ.');$stmt=db()->prepare("INSERT INTO categories(name,slug,description,icon,status,created_by) VALUES(?,?,?,?,?,?)");try{$stmt->execute([$name,$slug,optional_string($body,'description',500),optional_string($body,'icon',80),($body['status']??'active')==='hidden'?'hidden':'active',$admin['id']]);}catch(PDOException $e){if($e->getCode()==='23000')throw new ApiError(409,'Mã danh mục đã tồn tại.');throw $e;}audit($admin['id'],'category.created','category',(string)db()->lastInsertId());json_response(['id'=>(int)db()->lastInsertId()],201);
    }
    if (preg_match('#^/admin/categories/(\d+)$#',$path,$m) && in_array($method,['PUT','PATCH','DELETE'],true)) {
        $admin=require_admin();$id=valid_id($m[1]);if($method==='DELETE'){db()->prepare("UPDATE categories SET status='hidden' WHERE id=?")->execute([$id]);audit($admin['id'],'category.hidden','category',(string)$id);json_response(['message'=>'Danh mục đã được ẩn.']);}
        if($method==='PATCH'&&isset($body['status'])&&!isset($body['name'])){$status=(string)$body['status'];if(!in_array($status,['active','hidden'],true))throw new ApiError(422,'Trạng thái danh mục không hợp lệ.');db()->prepare('UPDATE categories SET status=? WHERE id=?')->execute([$status,$id]);audit($admin['id'],'category.status_changed','category',(string)$id,['status'=>$status]);json_response(['message'=>'Trạng thái danh mục đã được cập nhật.']);}
        $name=required_string($body,'name',100,1);$slug=mb_strtolower(trim((string)($body['slug']??$name)),'UTF-8');$slug=trim(preg_replace('/[^\pL\pN]+/u','-',$slug)??'','-');if($slug==='')throw new ApiError(422,'Mã danh mục không hợp lệ.');$status=(string)($body['status']??'active');if(!in_array($status,['active','hidden'],true))throw new ApiError(422,'Trạng thái danh mục không hợp lệ.');try{db()->prepare('UPDATE categories SET name=?,slug=?,description=?,icon=?,status=? WHERE id=?')->execute([$name,$slug,optional_string($body,'description',500),optional_string($body,'icon',80),$status,$id]);}catch(PDOException $error){if($error->getCode()==='23000')throw new ApiError(409,'Mã danh mục đã tồn tại.');throw $error;}audit($admin['id'],'category.updated','category',(string)$id);json_response(['message'=>'Danh mục đã được cập nhật.']);
    }
    if ($path === '/admin/restaurants' && $method === 'GET') {
        require_admin();$status=(string)($_GET['status']??'all');$allowed=['all','pending','published','rejected','hidden'];if(!in_array($status,$allowed,true))throw new ApiError(422,'Trạng thái không hợp lệ.');$where=$status==='all'?'':'WHERE r.status=?';$stmt=db()->prepare("SELECT r.*,c.name AS category_name,u.name AS creator_name,s.sponsor_name,s.contract_reference,s.starts_at AS sponsorship_starts_at,s.ends_at AS sponsorship_ends_at,s.status AS sponsorship_status,EXISTS(SELECT 1 FROM restaurant_sponsorships active WHERE active.restaurant_id=r.id AND active.status='active' AND active.starts_at<=UTC_TIMESTAMP() AND active.ends_at>UTC_TIMESTAMP()) AS sponsored FROM restaurants r LEFT JOIN categories c ON c.id=r.category_id LEFT JOIN users u ON u.id=r.created_by LEFT JOIN restaurant_sponsorships s ON s.restaurant_id=r.id {$where} ORDER BY FIELD(r.status,'pending','published','hidden','rejected'),r.created_at DESC LIMIT 500");$stmt->execute($status==='all'?[]:[$status]);$rows=$stmt->fetchAll();foreach($rows as &$row){$row=array_merge(public_restaurant($row),['description'=>$row['description'],'category_name'=>$row['category_name'],'creator_name'=>$row['creator_name'],'created_at'=>$row['created_at'],'sponsor_name'=>$row['sponsor_name'],'contract_reference'=>$row['contract_reference'],'sponsorship_starts_at'=>$row['sponsorship_starts_at'],'sponsorship_ends_at'=>$row['sponsorship_ends_at'],'sponsorship_status'=>$row['sponsorship_status']]);}unset($row);json_response(['data'=>$rows]);
    }
    if (preg_match('#^/admin/restaurants/(\d+)/sponsorship$#',$path,$m) && in_array($method,['PUT','DELETE'],true)) {
        $admin=require_admin();$id=valid_id($m[1]);
        $restaurant=db()->prepare('SELECT id,name,status,latitude,longitude FROM restaurants WHERE id=? LIMIT 1');$restaurant->execute([$id]);$place=$restaurant->fetch();
        if(!$place)throw new ApiError(404,'Không tìm thấy quán ăn.');
        if($method==='DELETE'){
            db()->prepare("UPDATE restaurant_sponsorships SET status='paused' WHERE restaurant_id=?")->execute([$id]);
            audit($admin['id'],'restaurant.sponsorship_paused','restaurant',(string)$id);
            json_response(['message'=>'Đã dừng vị trí tài trợ.']);
        }
        $sponsor=required_string($body,'sponsor_name',180,2);$reference=optional_string($body,'contract_reference',120);
        $status=(string)($body['status']??'paused');if(!in_array($status,['active','paused'],true))throw new ApiError(422,'Trạng thái tài trợ không hợp lệ.');
        $parseDate=static function(string $value): string {
            if(!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/',$value))throw new ApiError(422,'Thời gian tài trợ phải ở định dạng ISO UTC.');
            try{$date=new DateTimeImmutable($value);}catch(Throwable){throw new ApiError(422,'Thời gian tài trợ không hợp lệ.');}
            return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        };
        $starts=$parseDate(required_string($body,'starts_at',30,20));$ends=$parseDate(required_string($body,'ends_at',30,20));
        if($ends<=$starts)throw new ApiError(422,'Ngày kết thúc phải sau ngày bắt đầu.');
        if($status==='active'&&($place['status']!=='published'||$place['latitude']===null||$place['longitude']===null))throw new ApiError(422,'Chỉ quán đã duyệt và có tọa độ mới được tài trợ.');
        db()->prepare('INSERT INTO restaurant_sponsorships(restaurant_id,sponsor_name,contract_reference,starts_at,ends_at,status,created_by) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE sponsor_name=VALUES(sponsor_name),contract_reference=VALUES(contract_reference),starts_at=VALUES(starts_at),ends_at=VALUES(ends_at),status=VALUES(status)')
            ->execute([$id,$sponsor,$reference,$starts,$ends,$status,$admin['id']]);
        audit($admin['id'],'restaurant.sponsorship_updated','restaurant',(string)$id,['status'=>$status,'starts_at'=>$starts,'ends_at'=>$ends]);
        json_response(['message'=>'Đã cập nhật vị trí tài trợ.']);
    }
    if ($path === '/admin/restaurants' && $method === 'POST') {
        $admin=require_admin();$name=required_string($body,'name',180,1);$address=required_string($body,'address',500,1);$lat=$body['latitude']??null;$lon=$body['longitude']??null;
        if(($lat===null)!==($lon===null))throw new ApiError(422,'Hãy cung cấp cả vĩ độ và kinh độ.');
        if($lat!==null&&(!is_numeric($lat)||(float)$lat < -90||(float)$lat>90))throw new ApiError(422,'Vĩ độ không hợp lệ.');if($lon!==null&&(!is_numeric($lon)||(float)$lon < -180||(float)$lon>180))throw new ApiError(422,'Kinh độ không hợp lệ.');
        $categoryId=null;if(isset($body['category_id'])&&$body['category_id']!==''){$categoryId=filter_var($body['category_id'],FILTER_VALIDATE_INT);if(!$categoryId||$categoryId<1)throw new ApiError(422,'Danh mục không hợp lệ.');$check=db()->prepare('SELECT id FROM categories WHERE id=?');$check->execute([$categoryId]);if(!$check->fetchColumn())throw new ApiError(422,'Danh mục không tồn tại.');}
        $sourceUrl=optional_http_url($body,'source_url');
        $status=(string)($body['status']??'published');if(!in_array($status,['published','hidden'],true))throw new ApiError(422,'Trạng thái địa điểm không hợp lệ.');$opening=isset($body['opening_hours'])?json_encode($body['opening_hours'],JSON_UNESCAPED_UNICODE):null;
        $stmt=db()->prepare("INSERT INTO restaurants(category_id,created_by,source,source_url,name,address,latitude,longitude,cuisine,phone,website,opening_hours,price_range,description,status,moderated_by,moderated_at) VALUES(?,?,'admin',?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP())");
        $stmt->execute([$categoryId,$admin['id'],$sourceUrl,$name,$address,$lat,$lon,optional_string($body,'cuisine',255),optional_string($body,'phone',40),optional_http_url($body,'website'),$opening,optional_string($body,'price_range',80),optional_string($body,'description',4000),$status,$admin['id']]);$id=(int)db()->lastInsertId();audit($admin['id'],'restaurant.created','restaurant',(string)$id);json_response(['id'=>$id],201);
    }
    if (preg_match('#^/admin/restaurants/(\d+)$#',$path,$m) && in_array($method,['PUT','PATCH','DELETE'],true)) {
        $admin=require_admin();$id=valid_id($m[1]);if($method==='DELETE'){db()->prepare("UPDATE restaurants SET status='hidden',moderated_by=?,moderated_at=UTC_TIMESTAMP() WHERE id=?")->execute([$admin['id'],$id]);pause_restaurant_sponsorship($id);audit($admin['id'],'restaurant.hidden','restaurant',(string)$id);json_response(['message'=>'Địa điểm đã được ẩn.']);}
        if($method==='PATCH'&&isset($body['status'])&&!isset($body['name'])&&!isset($body['address'])){$status=(string)$body['status'];if(!in_array($status,['pending','published','rejected','hidden'],true))throw new ApiError(422,'Trạng thái không hợp lệ.');db()->prepare('UPDATE restaurants SET status=?,moderated_by=?,moderated_at=UTC_TIMESTAMP() WHERE id=?')->execute([$status,$admin['id'],$id]);if($status!=='published')pause_restaurant_sponsorship($id);audit($admin['id'],'restaurant.moderated','restaurant',(string)$id,['status'=>$status]);json_response(['message'=>'Trạng thái địa điểm đã được cập nhật.']);}
        $status=(string)($body['status']??'published');if(!in_array($status,['pending','published','rejected','hidden'],true))throw new ApiError(422,'Trạng thái không hợp lệ.');$lat=$body['latitude']??null;$lon=$body['longitude']??null;if(($lat===null)!==($lon===null))throw new ApiError(422,'Hãy cung cấp cả vĩ độ và kinh độ.');if($lat!==null&&(!is_numeric($lat)||(float)$lat < -90||(float)$lat>90))throw new ApiError(422,'Vĩ độ không hợp lệ.');if($lon!==null&&(!is_numeric($lon)||(float)$lon < -180||(float)$lon>180))throw new ApiError(422,'Kinh độ không hợp lệ.');$categoryId=null;if(isset($body['category_id'])&&$body['category_id']!==''){$categoryId=filter_var($body['category_id'],FILTER_VALIDATE_INT);if(!$categoryId||$categoryId<1)throw new ApiError(422,'Danh mục không hợp lệ.');$check=db()->prepare('SELECT id FROM categories WHERE id=?');$check->execute([$categoryId]);if(!$check->fetchColumn())throw new ApiError(422,'Danh mục không tồn tại.');}$sourceUrl=optional_http_url($body,'source_url');$stmt=db()->prepare('UPDATE restaurants SET category_id=?,name=?,address=?,latitude=?,longitude=?,cuisine=?,phone=?,website=?,source_url=?,opening_hours=?,price_range=?,description=?,status=?,moderated_by=?,moderated_at=UTC_TIMESTAMP() WHERE id=?');$stmt->execute([$categoryId,required_string($body,'name',180,1),required_string($body,'address',500,1),$lat,$lon,optional_string($body,'cuisine',255),optional_string($body,'phone',40),optional_http_url($body,'website'),$sourceUrl,isset($body['opening_hours'])?json_encode($body['opening_hours'],JSON_UNESCAPED_UNICODE):null,optional_string($body,'price_range',80),optional_string($body,'description',4000),$status,$admin['id'],$id]);if($status!=='published'||$lat===null)pause_restaurant_sponsorship($id);audit($admin['id'],'restaurant.updated','restaurant',(string)$id);json_response(['message'=>'Địa điểm đã được cập nhật.']);
    }
    if ($path === '/admin/food-notes' && $method === 'GET') {
        require_admin();$status=(string)($_GET['status']??'pending');$allowed=['all','pending','published','hidden','rejected','draft'];if(!in_array($status,$allowed,true))throw new ApiError(422,'Trạng thái không hợp lệ.');$page=max(1,(int)($_GET['page']??1));$perPage=max(10,min(100,(int)($_GET['per_page']??50)));$where=$status==='all'?'':'WHERE n.status=?';$params=$status==='all'?[]:[$status];$count=db()->prepare("SELECT COUNT(*) FROM food_notes n {$where}");$count->execute($params);$total=(int)$count->fetchColumn();$pages=max(1,(int)ceil($total/$perPage));$page=min($page,$pages);$offset=($page-1)*$perPage;$stmt=db()->prepare("SELECT n.id,n.user_id,n.food_name,n.eaten_at,n.price,n.rating,n.review,n.privacy,n.status,n.created_at,u.name AS author_name,COALESCE(r.name,n.restaurant_name_snapshot) AS restaurant_name FROM food_notes n JOIN users u ON u.id=n.user_id LEFT JOIN restaurants r ON r.id=n.restaurant_id {$where} ORDER BY n.created_at DESC LIMIT {$perPage} OFFSET {$offset}");$stmt->execute($params);json_response(['data'=>$stmt->fetchAll(),'pagination'=>['page'=>$page,'per_page'=>$perPage,'total'=>$total,'pages'=>$pages]]);
    }
    if (preg_match('#^/admin/food-notes/(\d+)$#',$path,$m) && in_array($method,['PATCH','DELETE'],true)) {
        $admin=require_admin();$id=valid_id($m[1]);$status=$method==='DELETE'?'hidden':(string)($body['status']??'');if(!in_array($status,['published','hidden','rejected'],true))throw new ApiError(422,'Trạng thái kiểm duyệt không hợp lệ.');db()->prepare('UPDATE food_notes SET status=?,moderated_by=?,moderated_at=UTC_TIMESTAMP() WHERE id=?')->execute([$status,$admin['id'],$id]);audit($admin['id'],'food_note.moderated','food_note',(string)$id,['status'=>$status]);json_response(['message'=>'Trạng thái Food Note đã được cập nhật.']);
    }
    if ($path === '/admin/users' && $method === 'GET') {
        require_admin();$page=max(1,(int)($_GET['page']??1));$perPage=max(10,min(100,(int)($_GET['per_page']??50)));$search=trim((string)($_GET['q']??''));$role=(string)($_GET['role']??'');$status=(string)($_GET['status']??'');if(mb_strlen($search,'UTF-8')>100)throw new ApiError(422,'Từ khóa tìm kiếm quá dài.');if($role!==''&&!in_array($role,['user','admin'],true))throw new ApiError(422,'Vai trò không hợp lệ.');if($status!==''&&!in_array($status,['active','suspended'],true))throw new ApiError(422,'Trạng thái không hợp lệ.');$where=[];$params=[];if($search!==''){$where[]='(u.name LIKE ? OR u.email LIKE ?)';$needle='%'.$search.'%';$params[]=$needle;$params[]=$needle;}if($role!==''){$where[]='u.role=?';$params[]=$role;}if($status!==''){$where[]='u.status=?';$params[]=$status;}$clause=$where?' WHERE '.implode(' AND ',$where):'';$count=db()->prepare('SELECT COUNT(*) FROM users u'.$clause);$count->execute($params);$total=(int)$count->fetchColumn();$pages=max(1,(int)ceil($total/$perPage));$page=min($page,$pages);$offset=($page-1)*$perPage;$stmt=db()->prepare("SELECT u.id,u.name,u.email,u.role,u.status,u.email_verified_at,u.created_at,u.last_login_at,(SELECT COUNT(*) FROM food_notes n WHERE n.user_id=u.id) AS notes_count FROM users u{$clause} ORDER BY u.created_at DESC LIMIT {$perPage} OFFSET {$offset}");$stmt->execute($params);$counts=db()->query("SELECT COUNT(*) AS total,SUM(role='user' AND status='active') AS active,SUM(status='suspended') AS suspended,SUM(role='admin') AS admins FROM users")->fetch();json_response(['data'=>$stmt->fetchAll(),'counts'=>array_map('intval',$counts),'pagination'=>['page'=>$page,'per_page'=>$perPage,'total'=>$total,'pages'=>$pages]]);
    }
    if (preg_match('#^/admin/users/(\d+)$#',$path,$m) && in_array($method,['PATCH','DELETE'],true)) {
        $admin=require_admin();$id=valid_id($m[1]);if($id===$admin['id'])throw new ApiError(409,'Không thể thay đổi trạng thái tài khoản admin đang đăng nhập.');$status=$method==='DELETE'?'suspended':(string)($body['status']??'');if(!in_array($status,['active','suspended'],true))throw new ApiError(422,'Trạng thái tài khoản không hợp lệ.');db()->prepare("UPDATE users SET status=? WHERE id=? AND role='user'")->execute([$status,$id]);audit($admin['id'],'user.status_changed','user',(string)$id,['status'=>$status]);json_response(['message'=>'Trạng thái tài khoản đã được cập nhật.']);
    }
    if ($path === '/admin/audit-logs' && $method === 'GET') {
        require_admin();$page=max(1,(int)($_GET['page']??1));$perPage=max(10,min(100,(int)($_GET['per_page']??50)));$search=trim((string)($_GET['q']??''));if(mb_strlen($search,'UTF-8')>100)throw new ApiError(422,'Từ khóa tìm kiếm quá dài.');$where='';$params=[];if($search!==''){$where=' WHERE a.action LIKE ? OR a.entity_type LIKE ? OR COALESCE(a.entity_id,\'\') LIKE ? OR COALESCE(u.name,\'\') LIKE ? OR COALESCE(u.email,\'\') LIKE ?';$needle='%'.$search.'%';$params=[$needle,$needle,$needle,$needle,$needle];}$count=db()->prepare('SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id'.$where);$count->execute($params);$total=(int)$count->fetchColumn();$pages=max(1,(int)ceil($total/$perPage));$page=min($page,$pages);$offset=($page-1)*$perPage;$stmt=db()->prepare("SELECT a.id,a.actor_id,u.name AS actor_name,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id{$where} ORDER BY a.id DESC LIMIT {$perPage} OFFSET {$offset}");$stmt->execute($params);json_response(['data'=>$stmt->fetchAll(),'pagination'=>['page'=>$page,'per_page'=>$perPage,'total'=>$total,'pages'=>$pages]]);
    }
    throw new ApiError(404, 'Không tìm thấy API này.');
}

try {
    handle_request();
} catch (ApiError $error) {
    if (request_method()==='GET' && route_path()==='/auth/verify' && str_contains((string)($_SERVER['HTTP_ACCEPT']??''),'text/html')) {
        header('Location: /pages/login.php?verification=invalid',true,303);exit;
    }
    json_response(['error'=>$error->getMessage(),'details'=>$error->details],$error->status);
} catch (PDOException $error) {
    error_log('[What2Eat] database error: ' . $error->getMessage());
    json_response(['error'=>'Có lỗi khi lưu dữ liệu. Hãy thử lại sau.'],500);
} catch (Throwable $error) {
    error_log('[What2Eat] unhandled API error: ' . $error->getMessage());
    json_response(['error'=>'Dịch vụ gặp lỗi. Hãy thử lại sau.'],500);
}
