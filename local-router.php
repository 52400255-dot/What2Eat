<?php
declare(strict_types=1);

// Local PHP server router for `php -S 127.0.0.1:8000 -t . local-router.php`.
// It sends API and tile requests through the app router and lets PHP serve
// the public PHP/HTML/assets normally. Private project folders stay blocked.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($path === '/api' || str_starts_with($path, '/api/')) {
    require __DIR__ . '/api/index.php';
    return true;
}

if (preg_match('#^/tiles/(\d{1,2})/(\d{1,8})/(\d{1,8})\.png$#', $path, $tile)) {
    $_GET['tile'] = $tile[1] . '/' . $tile[2] . '/' . $tile[3];
    require __DIR__ . '/api/index.php';
    return true;
}

if (preg_match('/\.html$/i', $path)) {
    $phpPath = substr($path, 0, -5) . '.php';
    if (is_file(__DIR__ . $phpPath)) {
        $query = (string)($_SERVER['QUERY_STRING'] ?? '');
        header('Location: ' . $phpPath . ($query !== '' ? '?' . $query : ''), true, 302);
        return true;
    }
}

$parts = array_values(array_filter(explode('/', trim($path, '/')), static fn(string $part): bool => $part !== ''));
$first = strtolower($parts[0] ?? '');
$privateRoots = ['storage', 'vendor', 'tests', 'scripts', 'submission', 'includes'];
if (array_filter($parts, static fn(string $part): bool => str_starts_with($part, '.')) || in_array($first, $privateRoots, true)) {
    http_response_code(404);
    return true;
}

$publicRoot = in_array($first, ['assets', 'pages', 'admin'], true);
$publicTopLevel = in_array(strtolower(ltrim($path, '/')), ['index.php', 'index.html', 'manifest.json', 'sw.js', 'offline.html'], true);
if ($path === '/' || $publicRoot || $publicTopLevel) return false;

http_response_code(404);
return true;
