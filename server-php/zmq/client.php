#!/usr/bin/php
<?php
// This client is designed to work with the ZMQ version of the server.
// The ZMQ server.php program takes care of sending the starting mempool size and the current prices of bitcoin.
// This client simply connects to the socket and prints messages to STDOUT.

// Functions
require_once '../lib/easybitcoin.php'; // bitcoin json-rpc (getmempoolinfo)
require_once 'config.php';    // bitcoin user:pass for json-rpc

// Connect to Unix Socket (where all the transactions/blocks are being written to by server.php)
$sock = @stream_socket_client('unix://stream.sock', $errno, $errstr); // suppress warning with @
if ($errno) {
    exit('{"type":"status","message":"fail"}'.PHP_EOL);
}

// Keep reading from Unix Socket
while (!feof($sock)) {
    echo fread($sock, 8192);
}

// Send message if stream.sock is not being written to (server.php stops running)
echo '{"type":"status","message":"closed"}'.PHP_EOL;
fclose($sock);