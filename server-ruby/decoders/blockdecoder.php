<?php
require_once '../server-php/lib/block.php';

while (true) {
    $gets = trim(fgets(STDIN)); // STDIN   - blocks as it waits for input
    echo json_encode(decodeblock($gets), true).PHP_EOL; // STDOUT
}
