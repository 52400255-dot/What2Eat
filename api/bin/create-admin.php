<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($argc !== 2 || !filter_var($argv[1], FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php api/bin/create-admin.php admin@example.com\n"); exit(2);
}
$password = getenv('W2E_ADMIN_PASSWORD') ?: '';
if (strlen($password) < 12) {
    fwrite(STDERR, "Set W2E_ADMIN_PASSWORD to a temporary password with at least 12 characters.\n"); exit(2);
}
$email = strtolower($argv[1]);
$name = trim((string)(getenv('W2E_ADMIN_NAME') ?: 'What2Eat Admin'));
$hash = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
$stmt = db()->prepare("INSERT INTO users(name,email,password_hash,role,status,email_verified_at) VALUES(?,?,?,'admin','active',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role='admin',status='active',email_verified_at=UTC_TIMESTAMP()");
$stmt->execute([$name, $email, $hash]);
fwrite(STDOUT, "Administrator account provisioned for {$email}. Clear W2E_ADMIN_PASSWORD from the environment now.\n");

