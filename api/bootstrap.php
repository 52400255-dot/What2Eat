<?php
declare(strict_types=1);

function load_app_env(): void
{
    static $loaded = false;
    if ($loaded) return;
    $loaded = true;
    $file = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    if (!is_file($file)) return;
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($value !== '' && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
            $value = substr($value, 1, -1);
        }
        if ($key !== '' && getenv($key) === false) putenv($key . '=' . $value);
    }
}

load_app_env();

final class ApiError extends RuntimeException
{
    public function __construct(public int $status, string $message, public array $details = [])
    {
        parent::__construct($message);
    }
}

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function is_local_development_origin(?string $origin = null): bool
{
    if (env_value('W2E_ENV', 'production') !== 'development') return false;
    $parts = parse_url($origin ?? (string)env_value('W2E_BASE_URL', ''));
    if (!is_array($parts) || !in_array(strtolower((string)($parts['scheme'] ?? '')), ['http', 'https'], true)) return false;
    $host = strtolower(rtrim((string)($parts['host'] ?? ''), '.'));
    return $host === 'localhost' || $host === '127.0.0.1' || $host === '::1'
        || str_ends_with($host, '.localhost') || str_ends_with($host, '.local');
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $host = env_value('W2E_DB_HOST');
    $name = env_value('W2E_DB_NAME');
    $user = env_value('W2E_DB_USER');
    $password = env_value('W2E_DB_PASSWORD');
    if (!$host || !$name || !$user || $password === null) {
        throw new ApiError(503, 'Cấu hình cơ sở dữ liệu chưa hoàn tất.');
    }
    $port = env_value('W2E_DB_PORT', '3306');
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    try {
        $pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'",
        ]);
    } catch (Throwable $error) {
        error_log('[What2Eat] database connection failed: ' . $error->getMessage());
        throw new ApiError(503, 'Chưa kết nối được cơ sở dữ liệu.');
    }
    return $pdo;
}

function start_app_session(): void
{
    if (PHP_SAPI === 'cli' || session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    $secure = env_value('W2E_ENV', 'production') === 'production' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

start_app_session();

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function json_body(): array
{
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 1_048_576) throw new ApiError(413, 'Yêu cầu quá lớn.');
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new ApiError(400, 'Nội dung JSON không hợp lệ.');
    return $data;
}

function required_string(array $data, string $field, int $max, int $min = 1): string
{
    $value = trim((string)($data[$field] ?? ''));
    if (mb_strlen($value, 'UTF-8') < $min || mb_strlen($value, 'UTF-8') > $max) {
        throw new ApiError(422, "Trường {$field} không hợp lệ.");
    }
    return $value;
}

function optional_string(array $data, string $field, int $max): ?string
{
    if (!array_key_exists($field, $data) || $data[$field] === null || trim((string)$data[$field]) === '') return null;
    $value = trim((string)$data[$field]);
    if (mb_strlen($value, 'UTF-8') > $max) throw new ApiError(422, "Trường {$field} quá dài.");
    return $value;
}

function optional_http_url(array $data, string $field, int $max = 500): ?string
{
    $value = optional_string($data, $field, $max);
    if ($value === null) return null;
    $normalized = mb_strtolower($value, 'UTF-8');
    if (in_array($normalized, ['không', 'không có', 'chưa có', 'n/a', 'na', 'none', 'no website'], true)) return null;
    if (!preg_match('#^[a-z][a-z0-9+.-]*://#i', $value)) $value = 'https://' . $value;
    if (!filter_var($value, FILTER_VALIDATE_URL) || !in_array(strtolower((string)parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true)) {
        throw new ApiError(422, "Trường {$field} phải là URL HTTP hoặc HTTPS.");
    }
    return $value;
}

function optional_coordinates(array $data): array
{
    $latitude = $data['latitude'] ?? null;
    $longitude = $data['longitude'] ?? null;
    if ($latitude === '') $latitude = null;
    if ($longitude === '') $longitude = null;
    if (($latitude === null) !== ($longitude === null)) throw new ApiError(422, 'Hãy cung cấp cả vĩ độ và kinh độ.');
    if ($latitude === null) return [null, null];
    if (!is_numeric($latitude) || !is_numeric($longitude) || (float)$latitude < -90 || (float)$latitude > 90 || (float)$longitude < -180 || (float)$longitude > 180) {
        throw new ApiError(422, 'Tọa độ không hợp lệ.');
    }
    return [(float)$latitude, (float)$longitude];
}

function valid_id(string $id): int
{
    if (!ctype_digit($id) || (int)$id < 1) throw new ApiError(404, 'Không tìm thấy dữ liệu.');
    return (int)$id;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function require_csrf(): void
{
    $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (empty($_SESSION['csrf']) || $token === '' || !hash_equals((string)$_SESSION['csrf'], $token)) {
        throw new ApiError(419, 'Phiên đã hết hạn. Hãy tải lại trang rồi thử lại.');
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $configuredBase = env_value('W2E_BASE_URL');
        $expected = $configuredBase ? rtrim($configuredBase, '/') : (((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? ''));
        if (!hash_equals(strtolower($expected), strtolower(rtrim($origin, '/')))) throw new ApiError(403, 'Nguồn yêu cầu không hợp lệ.');
    }
}

function current_user(bool $required = true): ?array
{
    $id = (int)($_SESSION['user_id'] ?? 0);
    if ($id < 1) {
        if ($required) throw new ApiError(401, 'Vui lòng đăng nhập để tiếp tục.');
        return null;
    }
    $query = db()->prepare("SELECT id,name,email,avatar_url,phone,preferences,role,status,email_verified_at,created_at,last_login_at FROM users WHERE id=? AND status='active' LIMIT 1");
    $query->execute([$id]);
    $user = $query->fetch();
    if (!$user) {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
        if ($required) throw new ApiError(401, 'Phiên đăng nhập đã hết hạn.');
        return null;
    }
    $user['id'] = (int)$user['id'];
    $user['preferences'] = $user['preferences'] ? json_decode($user['preferences'], true) : [];
    if ($user['avatar_url']) $user['avatar_url'] = '/api/v1/avatar/' . $user['id'];
    return $user;
}

function require_admin(): array
{
    $user = current_user();
    if ($user['role'] !== 'admin') throw new ApiError(403, 'Chức năng này chỉ dành cho quản trị viên.');
    return $user;
}

function client_ip_hash(): string
{
    $secret = env_value('W2E_APP_SECRET', '');
    return hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), $secret);
}

function rate_limit(string $bucket, int $maximum, int $windowSeconds): void
{
    $now = time();
    $start = gmdate('Y-m-d H:i:s', intdiv($now, $windowSeconds) * $windowSeconds);
    $subject = client_ip_hash();
    $statement = db()->prepare('INSERT INTO rate_limits(bucket,subject_hash,window_start,hits) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE hits=hits+1');
    $statement->execute([$bucket, $subject, $start]);
    $check = db()->prepare('SELECT hits FROM rate_limits WHERE bucket=? AND subject_hash=? AND window_start=?');
    $check->execute([$bucket, $subject, $start]);
    if ((int)$check->fetchColumn() > $maximum) throw new ApiError(429, 'Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.');
}

function audit(?int $actorId, string $action, string $entity, ?string $entityId = null, array $metadata = []): void
{
    $statement = db()->prepare('INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata,ip_hash) VALUES(?,?,?,?,?,?)');
    $statement->execute([$actorId, $action, $entity, $entityId, $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null, client_ip_hash()]);
}

function send_app_mail(string $to, string $subject, string $html): bool
{
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || str_contains($subject, "\r") || str_contains($subject, "\n")) return false;
    if (is_local_development_origin()) {
        $storage = dirname(__DIR__) . '/storage';
        if (!is_dir($storage) || !is_writable($storage)) return false;
        $entry = "\n--- " . gmdate('Y-m-d H:i:s') . " UTC ---\nTo: {$to}\nSubject: {$subject}\n{$html}\n";
        return file_put_contents($storage . '/dev-mail.log', $entry, FILE_APPEND | LOCK_EX) !== false;
    }
    $from = env_value('W2E_MAIL_FROM');
    if (!$from || str_contains($from, "\r") || str_contains($from, "\n")) return false;
    $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
    $headers .= 'From: ' . $from . "\r\n";
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);
}

function public_restaurant(array $row): array
{
    return [
        'id' => (int)$row['id'], 'name' => $row['name'], 'address' => $row['address'],
        'latitude' => $row['latitude'] === null ? null : (float)$row['latitude'],
        'longitude' => $row['longitude'] === null ? null : (float)$row['longitude'],
        'cuisine' => $row['cuisine'], 'phone' => $row['phone'], 'website' => $row['website'],
        'opening_hours' => $row['opening_hours'] ? json_decode($row['opening_hours'], true) : null,
        'price_range' => $row['price_range'], 'source' => $row['source'], 'source_id' => $row['source_id'],
        'source_url' => $row['source_url'], 'status' => $row['status'], 'category_id' => $row['category_id'] ? (int)$row['category_id'] : null,
    ];
}
