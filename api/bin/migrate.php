<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
try {
    $sql = file_get_contents(dirname(__DIR__) . '/schema.sql');
    if ($sql === false) throw new RuntimeException('Cannot read schema.sql');
    foreach (explode(';', $sql) as $statement) {
        if (trim($statement) !== '') db()->exec($statement);
    }
    $sessionVersion = db()->query("SHOW COLUMNS FROM users LIKE 'session_version'")->fetch();
    if (!$sessionVersion) db()->exec('ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER password_hash');
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261005_initial']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_sponsorships']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_z_session_version']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_zz_place_reports']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_zzz_place_quality']);
    fwrite(STDOUT, "What2Eat schema is installed.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Migration failed: ' . $error->getMessage() . "\n");
    exit(1);
}
