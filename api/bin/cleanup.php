<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$pdo = db();
$pdo->exec("DELETE FROM email_tokens WHERE used_at IS NOT NULL OR expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)");
$pdo->exec("DELETE FROM api_cache WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)");
$pdo->exec("DELETE FROM rate_limits WHERE window_start < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)");
fwrite(STDOUT, "Expired tokens, map cache entries, and rate-limit windows were cleaned up.\n");

