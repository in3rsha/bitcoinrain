<?php
require_once 'lib/tx.php';

while (true) {
    $gets = trim(fgets(STDIN)); // STDIN   - blocks as it waits for input
    $decoded = decodeRawTransaction($gets); // decode the data
    $array = [];
    $array['type'] = 'tx'; // set the type of message at the start
    $result = $array + $decoded; // combine arrays
    echo json_encode($result, true).PHP_EOL; // STDOUT
}
