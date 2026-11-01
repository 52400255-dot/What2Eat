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
    $googleSubject = db()->query("SHOW COLUMNS FROM users LIKE 'google_sub'")->fetch();
    if (!$googleSubject) db()->exec('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL AFTER password_hash');
    $googleSubjectIndex = db()->query("SHOW INDEX FROM users WHERE Key_name = 'uq_users_google_sub'")->fetch();
    if (!$googleSubjectIndex) db()->exec('ALTER TABLE users ADD UNIQUE KEY uq_users_google_sub (google_sub)');
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261005_initial']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_sponsorships']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_z_session_version']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_zz_place_reports']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261025_zzz_place_quality']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261027_google_sign_in']);
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261028_completion']);
    $verificationColumns = [
        'verification_status' => "ALTER TABLE place_catalog ADD COLUMN verification_status ENUM('unverified','verified_active','reported_closed') NOT NULL DEFAULT 'unverified' AFTER price_range",
        'verification_source' => "ALTER TABLE place_catalog ADD COLUMN verification_source VARCHAR(255) NULL AFTER verification_status",
        'verification_note' => "ALTER TABLE place_catalog ADD COLUMN verification_note VARCHAR(1000) NULL AFTER verification_source",
        'verified_by' => "ALTER TABLE place_catalog ADD COLUMN verified_by BIGINT UNSIGNED NULL AFTER verification_note",
        'verified_at' => "ALTER TABLE place_catalog ADD COLUMN verified_at DATETIME NULL AFTER verified_by",
    ];
    foreach ($verificationColumns as $column => $alter) {
        $exists = db()->query("SHOW COLUMNS FROM place_catalog LIKE " . db()->quote($column))->fetch();
        if (!$exists) db()->exec($alter);
    }
    $verificationIndex = db()->query("SHOW INDEX FROM place_catalog WHERE Key_name = 'ix_catalog_verification'")->fetch();
    if (!$verificationIndex) db()->exec('ALTER TABLE place_catalog ADD KEY ix_catalog_verification(verification_status)');
    $verificationForeignKey = db()->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='place_catalog' AND COLUMN_NAME='verified_by' AND REFERENCED_TABLE_NAME='users' LIMIT 1")->fetch();
    if (!$verificationForeignKey) db()->exec('ALTER TABLE place_catalog ADD CONSTRAINT fk_catalog_verification_user FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL');
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261028_activity_verification']);
    fwrite(STDOUT, "What2Eat schema is installed.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Migration failed: ' . $error->getMessage() . "\n");
    exit(1);
}
