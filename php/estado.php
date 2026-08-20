<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$ARCHIVO = __DIR__ . '/pedidos.json';

if (!file_exists($ARCHIVO)) {
    echo '[]';
    exit;
}

$fp = fopen($ARCHIVO, 'r');
if (!$fp) {
    echo '[]';
    exit;
}

flock($fp, LOCK_SH);
$contenido = stream_get_contents($fp);
flock($fp, LOCK_UN);
fclose($fp);

$pedidos = json_decode($contenido, true);
if (!is_array($pedidos)) $pedidos = [];

echo json_encode(array_values($pedidos), JSON_UNESCAPED_UNICODE);
