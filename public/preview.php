<?php
declare(strict_types=1);

$configPath = __DIR__ . '/preview-config.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config)) {
    $config = [];
}

$slug = strtolower((string)($_GET['slug'] ?? ''));
if (!preg_match('/^[a-z0-9-]{3,80}$/', $slug)) {
    http_response_code(404);
    exit('Not found');
}

$siteUrl = rtrim((string)($config['site_url'] ?? ''), '/');
if (!preg_match('#^https://[a-z0-9.-]+(?::\d{1,5})?$#i', $siteUrl)) {
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    if (!preg_match('/^[a-z0-9.-]+(?::\d{1,5})?$/i', $host)) {
        $host = 'batify.site.je';
    }
    $siteUrl = 'https://' . $host;
}
$origin = $siteUrl;
$title = 'A celebration letter on Batify';
$owner = '';
$campaignType = '';
$supabaseUrl = rtrim((string)($config['supabase_url'] ?? ''), '/');
$anonKey = (string)($config['supabase_anon_key'] ?? '');

if ($supabaseUrl !== '' && $anonKey !== '') {
    $query = http_build_query([
        'slug' => 'eq.' . $slug,
        'select' => 'title,owner_name,campaign_type',
        'limit' => '1',
    ]);
    $endpoint = $supabaseUrl . '/rest/v1/pages?' . $query;
    $headers = "apikey: {$anonKey}\r\nAuthorization: Bearer {$anonKey}\r\n";
    $response = false;

    if (function_exists('curl_init')) {
        $curl = curl_init($endpoint);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['apikey: ' . $anonKey, 'Authorization: Bearer ' . $anonKey],
            CURLOPT_TIMEOUT => 4,
        ]);
        $response = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if ($response === false || $status < 200 || $status >= 300) {
            error_log('Batify social preview lookup failed through cURL.');
            $response = false;
        }
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => $headers,
                'timeout' => 4,
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($endpoint, false, $context);
        $statusLine = $http_response_header[0] ?? '';
        if ($response === false || !preg_match('/\s2\d\d\s/', $statusLine)) {
            error_log('Batify social preview lookup failed through the PHP stream wrapper.');
            $response = false;
        }
    } else {
        error_log('Batify social previews need PHP cURL or allow_url_fopen enabled.');
    }

    if ($response !== false) {
        $rows = json_decode($response, true);
        if (is_array($rows) && isset($rows[0]) && is_array($rows[0])) {
            $title = (string)($rows[0]['title'] ?? $title);
            $owner = (string)($rows[0]['owner_name'] ?? '');
            $campaignType = (string)($rows[0]['campaign_type'] ?? '');
        } elseif (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Batify social preview received invalid JSON from Supabase.');
        }
    }
}

$events = [
    'christmas' => ['image' => 'og-christmas.png', 'name' => 'Christmas'],
    'halloween' => ['image' => 'og-halloween.png', 'name' => 'Halloween'],
    'valentines' => ['image' => 'og-valentines.png', 'name' => 'Valentine’s Day'],
    'new_year' => ['image' => 'og-new-year.png', 'name' => 'New Year'],
    'anniversary' => ['image' => 'og-anniversary.png', 'name' => 'Anniversary'],
];
$event = $events[$campaignType] ?? ['image' => 'og.png', 'name' => 'birthday'];
$description = $owner !== ''
    ? $owner . ' made a ' . $event['name'] . ' letter on Batify. Open it and send a wish.'
    : 'Open the letter and send a wish on Batify.';
$image = $origin . '/' . $event['image'];
$pageUrl = $origin . '/p/' . rawurlencode($slug);
$escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300, stale-while-revalidate=3600');
header('X-Content-Type-Options: nosniff');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title><?= $escape($title) ?> - Batify</title>
  <meta name="description" content="<?= $escape($description) ?>">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Batify">
  <meta property="og:title" content="<?= $escape($title) ?>">
  <meta property="og:description" content="<?= $escape($description) ?>">
  <meta property="og:url" content="<?= $escape($pageUrl) ?>">
  <meta property="og:image" content="<?= $escape($image) ?>">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="A <?= $escape($event['name']) ?> letter from Batify">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= $escape($title) ?>">
  <meta name="twitter:description" content="<?= $escape($description) ?>">
  <meta name="twitter:image" content="<?= $escape($image) ?>">
</head>
<body>
  <h1><?= $escape($title) ?></h1>
  <p><?= $escape($description) ?></p>
</body>
</html>
