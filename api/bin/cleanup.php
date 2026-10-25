<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$pdo = db();
$pdo->exec("DELETE FROM email_tokens WHERE used_at IS NOT NULL OR expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)");
$pdo->exec("DELETE FROM api_cache WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)");
$pdo->exec("DELETE FROM rate_limits WHERE window_start < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)");
fwrite(STDOUT, "Expired tokens, map cache entries, and rate-limit windows were cleaned up.\n");

$referenced = array_fill_keys($pdo->query('SELECT storage_key FROM food_note_media')->fetchAll(PDO::FETCH_COLUMN), true);
$directory = dirname(__DIR__, 2) . '/storage/uploads/notes';
$orphaned = 0;
$removed = 0;
if (is_dir($directory)) {
    foreach (new DirectoryIterator($directory) as $file) {
        if (!$file->isFile() || $file->isLink()) continue;
        $name = $file->getFilename();
        if (!preg_match('/^[a-f0-9]{48}\.(?:jpg|png|webp|gif|mp4|webm)$/', $name) || isset($referenced[$name])) continue;
        if ($file->getMTime() > time() - 86400) continue;
        $orphaned++;
        if (in_array('--prune-orphan-media', $argv, true) && @unlink($file->getPathname())) $removed++;
    }
}
fwrite(STDOUT, "Orphaned Food Note files older than one day: {$orphaned}; removed: {$removed}.\n");

