<?php
declare(strict_types=1);

require dirname(__DIR__) . '/api/bootstrap.php';
require dirname(__DIR__) . '/api/google-auth.php';

function test_base64url(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function test_signed_google_token(OpenSSLAsymmetricKey $privateKey, array $claims): string
{
    $header = test_base64url(json_encode(['alg'=>'RS256','kid'=>'unit-test-key','typ'=>'JWT'], JSON_THROW_ON_ERROR));
    $payload = test_base64url(json_encode($claims, JSON_THROW_ON_ERROR));
    $message = $header . '.' . $payload;
    if (!openssl_sign($message, $signature, $privateKey, OPENSSL_ALGO_SHA256)) throw new RuntimeException('Could not sign a test JWT.');
    return $message . '.' . test_base64url($signature);
}

function assert_invalid_google_token(string $token, string $clientId): void
{
    try {
        verify_google_id_token($token, $clientId);
    } catch (ApiError $error) {
        if ($error->status === 401) return;
        throw $error;
    }
    throw new RuntimeException('The Google verifier accepted an invalid token.');
}

$keyOptions = ['private_key_type'=>OPENSSL_KEYTYPE_RSA,'private_key_bits'=>2048];
$opensslConfig = getenv('OPENSSL_CONF');
if ($opensslConfig === false && PHP_OS_FAMILY === 'Windows' && is_file('C:\\xampp\\php\\extras\\ssl\\openssl.cnf')) {
    $opensslConfig = 'C:\\xampp\\php\\extras\\ssl\\openssl.cnf';
}
if (is_string($opensslConfig) && $opensslConfig !== '') $keyOptions['config'] = $opensslConfig;
$privateKey = openssl_pkey_new($keyOptions);
if (!$privateKey instanceof OpenSSLAsymmetricKey) throw new RuntimeException('Could not create a test RSA key.');
$keyDetails = openssl_pkey_get_details($privateKey);
if (!is_array($keyDetails) || !is_array($keyDetails['rsa'] ?? null)) throw new RuntimeException('Could not read the test RSA key.');
$clientId = bin2hex(random_bytes(12)) . '.apps.googleusercontent.com';
$jwk = [
    'kid'=>'unit-test-key',
    'kty'=>'RSA',
    'alg'=>'RS256',
    'use'=>'sig',
    'n'=>test_base64url($keyDetails['rsa']['n']),
    'e'=>test_base64url($keyDetails['rsa']['e']),
];
$cachePath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'what2eat-google-jwks-' . substr(hash('sha256', $clientId), 0, 20) . '.json';
$claims = [
    'iss'=>'https://accounts.google.com',
    'aud'=>$clientId,
    'sub'=>'12345678901234567890',
    'email'=>'user@gmail.com',
    'email_verified'=>true,
    'iat'=>time(),
    'exp'=>time() + 3600,
];

if (file_put_contents($cachePath, json_encode(['expires_at'=>time()+600,'keys'=>[$jwk['kid']=>$jwk]], JSON_THROW_ON_ERROR), LOCK_EX) === false) {
    throw new RuntimeException('Could not prepare the local Google signing-key cache.');
}
try {
    $verified = verify_google_id_token(test_signed_google_token($privateKey, $claims), $clientId);
    if (($verified['sub'] ?? null) !== $claims['sub']) throw new RuntimeException('The verifier returned the wrong Google subject.');

    $wrongAudience = $claims;
    $wrongAudience['aud'] = 'another-client.apps.googleusercontent.com';
    assert_invalid_google_token(test_signed_google_token($privateKey, $wrongAudience), $clientId);

    $expired = $claims;
    $expired['exp'] = time() - 10;
    assert_invalid_google_token(test_signed_google_token($privateKey, $expired), $clientId);

    $wrongIssuer = $claims;
    $wrongIssuer['iss'] = 'https://attacker.example';
    assert_invalid_google_token(test_signed_google_token($privateKey, $wrongIssuer), $clientId);

    echo "Google verifier checks passed: RS256 signature, audience, expiry, and issuer.\n";
} finally {
    @unlink($cachePath);
}
