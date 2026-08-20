<?php
header('Content-Type: text/plain; charset=utf-8');

$IPS_PERMITIDAS = [
    '35.247.217.136'
];

if (!empty($IPS_PERMITIDAS)) {
    $ipCliente = $_SERVER['REMOTE_ADDR'] ?? '';
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $partes    = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ipCliente = trim($partes[0]);
    }
    if (!in_array($ipCliente, $IPS_PERMITIDAS, true)) {
        http_response_code(403);
        echo "Acceso denegado";
        exit;
    }
}

$ARCHIVO = __DIR__ . '/pedidos.json';
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['os'])) {
    http_response_code(400);
    echo "JSON inválido";
    exit;
}

$os     = $data['os'];
$codigo = $os['idOs']   ?? null;
$estado = $data['estado'] ?? ($os['estado'] ?? null);
$email = $os['emailCliente'] ?? null;

if (!$codigo || !$estado) {
    http_response_code(400);
    echo "Faltan idOs o estado";
    exit;
}
$campo02 = $os['campo02'] ?? '';
$tipoOs  = $os['tipoOs']  ?? '';

$fp = fopen($ARCHIVO, 'c+');
if (!$fp) {
    http_response_code(500);
    echo "No se pudo abrir el almacén";
    exit;
}

flock($fp, LOCK_EX);

$contenido = stream_get_contents($fp);
$pedidos   = json_decode($contenido, true);
if (!is_array($pedidos)) $pedidos = [];

$estadoUpper = strtoupper(trim($estado));

$estadosVisibles = ['ASIGNADA', 'EN PICKING', 'PICKEADA'];

if (in_array($estadoUpper, $estadosVisibles, true)) {
    $pedidos[$codigo] = [
        'codigo'      => $codigo,
        'estado'      => $estadoUpper,
        'cliente'     => $os['nombreCliente'] ?? '',
        'email'       => $email ?? '',
        'actualizado' => date('Y-m-d H:i:s'),
    ];
} else {
    unset($pedidos[$codigo]);
}

rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($pedidos, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo "OK";
