<?php
require_once 'lib/tx.php';

while (true) {
    $gets = trim(fgets(STDIN)); // STDIN   - blocks as it waits for input
    echo json_encode(decodeRawTransaction($gets), true).PHP_EOL; // STDOUT
}
