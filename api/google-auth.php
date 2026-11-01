<?php
declare(strict_types=1);

function google_base64url_decode(string $value): string|false
{
    if ($value === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $value)) return false;
    $value = strtr($value, '-_', '+/');
    $value .= str_repeat('=', (4 - strlen($value) % 4) % 4);
    return base64_decode($value, true);
}

function google_der_length(int $length): string
{
    if ($length < 128) return chr($length);
    $bytes = ltrim(pack('N', $length), "\0");
    return chr(0x80 | strlen($bytes)) . $bytes;
}

function google_der_integer(string $value): string
{
    $value = ltrim($value, "\0");
    if ($value === '') $value = "\0";
    if ((ord($value[0]) & 0x80) !== 0) $value = "\0" . $value;
    return "\x02" . google_der_length(strlen($value)) . $value;
}

function google_jwk_public_key(array $jwk): ?string
{
    if (($jwk['kty'] ?? '') !== 'RSA' || ($jwk['alg'] ?? 'RS256') !== 'RS256' || ($jwk['use'] ?? 'sig') !== 'sig') return null;
    $modulus = google_base64url_decode((string)($jwk['n'] ?? ''));
    $exponent = google_base64url_decode((string)($jwk['e'] ?? ''));
    if (!is_string($modulus) || !is_string($exponent) || strlen($modulus) < 256 || strlen($modulus) > 1024 || strlen($exponent) > 8) return null;

    $rsaContents = google_der_integer($modulus) . google_der_integer($exponent);
    $rsa = "\x30" . google_der_length(strlen($rsaContents)) . $rsaContents;
    $algorithm = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
    $bitString = "\x03" . google_der_length(strlen($rsa) + 1) . "\0" . $rsa;
    $spki = "\x30" . google_der_length(strlen($algorithm . $bitString)) . $algorithm . $bitString;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function google_signing_keys(string $clientId, bool $forceRefresh = false): array
{
    static $requestKeys = null;
    static $requestExpiresAt = 0;
    $now = time();
    if (!$forceRefresh && is_array($requestKeys) && $requestExpiresAt > $now) return $requestKeys;

    $cachePath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'what2eat-google-jwks-' . substr(hash('sha256', $clientId), 0, 20) . '.json';
    if (!$forceRefresh && is_file($cachePath)) {
        $cached = json_decode((string)@file_get_contents($cachePath), true);
        if (is_array($cached) && is_array($cached['keys'] ?? null) && (int)($cached['expires_at'] ?? 0) > $now) {
            $requestKeys = $cached['keys'];
            $requestExpiresAt = (int)$cached['expires_at'];
            return $requestKeys;
        }
    }

    if (!function_exists('curl_init') || !function_exists('openssl_verify')) {
        throw new ApiError(503, 'Máy chủ chưa bật các phần mở rộng cần thiết để xác thực Google.');
    }
    $headers = [];
    $handle = curl_init('https://www.googleapis.com/oauth2/v3/certs');
    if ($handle === false) throw new ApiError(503, 'Chưa thể xác thực Google. Hãy thử lại sau.');
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$headers): int {
            $length = strlen($line);
            if (str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $headers[strtolower(trim($name))] = trim($value);
            }
            return $length;
        },
    ]);
    $body = curl_exec($handle);
    $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);
    if (!is_string($body) || $status !== 200 || strlen($body) > 262144) {
        throw new ApiError(503, 'Chưa thể xác thực Google. Hãy thử lại sau.');
    }
    $document = json_decode($body, true);
    if (!is_array($document) || !is_array($document['keys'] ?? null)) {
        throw new ApiError(503, 'Google chưa trả về khóa xác thực hợp lệ.');
    }

    $keys = [];
    foreach ($document['keys'] as $key) {
        if (!is_array($key) || !is_string($key['kid'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{1,128}$/', $key['kid'])) continue;
        if (google_jwk_public_key($key) !== null) $keys[$key['kid']] = $key;
    }
    if (!$keys) throw new ApiError(503, 'Google chưa trả về khóa xác thực hợp lệ.');

    $ttl = 3600;
    if (preg_match('/(?:^|,)\s*max-age=(\d+)/i', (string)($headers['cache-control'] ?? ''), $match)) {
        $ttl = max(60, min(86400, (int)$match[1]));
    }
    $requestKeys = $keys;
    $requestExpiresAt = $now + $ttl;
    $cacheRecord = json_encode(['expires_at'=>$requestExpiresAt,'keys'=>$keys], JSON_UNESCAPED_SLASHES);
    if (is_string($cacheRecord)) {
        $temporaryPath = $cachePath . '.' . bin2hex(random_bytes(6)) . '.tmp';
        if (@file_put_contents($temporaryPath, $cacheRecord, LOCK_EX) !== false) @rename($temporaryPath, $cachePath);
        if (is_file($temporaryPath)) @unlink($temporaryPath);
    }
    return $keys;
}

function verify_google_id_token(string $token, string $clientId): array
{
    if ($clientId === '') throw new ApiError(503, 'Đăng nhập Google chưa được cấu hình trên máy chủ.');
    if (strlen($token) > 8192) throw new ApiError(401, 'ID token Google không hợp lệ.');
    $parts = explode('.', $token);
    if (count($parts) !== 3) throw new ApiError(401, 'ID token Google không hợp lệ.');
    [$encodedHeader, $encodedClaims, $encodedSignature] = $parts;
    $headerJson = google_base64url_decode($encodedHeader);
    $claimsJson = google_base64url_decode($encodedClaims);
    $signature = google_base64url_decode($encodedSignature);
    if (!is_string($headerJson) || !is_string($claimsJson) || !is_string($signature)) throw new ApiError(401, 'ID token Google không hợp lệ.');
    $header = json_decode($headerJson, true);
    $claims = json_decode($claimsJson, true);
    if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256'
        || !is_string($header['kid'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{1,128}$/', $header['kid'])
        || (isset($header['typ']) && $header['typ'] !== 'JWT')) {
        throw new ApiError(401, 'ID token Google không hợp lệ.');
    }

    $keys = google_signing_keys($clientId);
    if (!isset($keys[$header['kid']])) $keys = google_signing_keys($clientId, true);
    $jwk = $keys[$header['kid']] ?? null;
    $publicKey = is_array($jwk) ? google_jwk_public_key($jwk) : null;
    if (!$publicKey) throw new ApiError(401, 'ID token Google không hợp lệ.');
    $verified = openssl_verify($encodedHeader . '.' . $encodedClaims, $signature, $publicKey, OPENSSL_ALGO_SHA256);
    if ($verified !== 1) throw new ApiError(401, 'ID token Google không hợp lệ.');

    $now = time();
    $audience = $claims['aud'] ?? null;
    $audienceMatches = is_string($audience) && hash_equals($clientId, $audience);
    if (is_array($audience)) {
        $audienceMatches = in_array($clientId, $audience, true) && isset($claims['azp']) && is_string($claims['azp']) && hash_equals($clientId, $claims['azp']);
    }
    if (!$audienceMatches || (isset($claims['azp']) && (!is_string($claims['azp']) || !hash_equals($clientId, $claims['azp'])))
        || !in_array($claims['iss'] ?? null, ['accounts.google.com','https://accounts.google.com'], true)
        || !is_numeric($claims['exp'] ?? null) || (int)$claims['exp'] < $now
        || !is_numeric($claims['iat'] ?? null) || (int)$claims['iat'] > $now + 60
        || !is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 255
        || !is_string($claims['email'] ?? null) || !filter_var($claims['email'], FILTER_VALIDATE_EMAIL)
        || !in_array($claims['email_verified'] ?? null, [true, 'true'], true)) {
        throw new ApiError(401, 'ID token Google không hợp lệ hoặc đã hết hạn.');
    }
    return $claims;
}
