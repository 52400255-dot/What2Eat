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
    db()->prepare('INSERT IGNORE INTO schema_migrations(version) VALUES(?)')->execute(['20261005_initial']);
    fwrite(STDOUT, "What2Eat schema is installed.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Migration failed: ' . $error->getMessage() . "\n");
    exit(1);
}
