<?php
require_once 'lib/tx.php';

$donation_address = "125T7hdVSaMXstpy4UWWm4RKTcTSfttYUb"; // can set to something simple;

while (true) {
    // Create blank array for a type:tx json message
    $array = [];
    $array['type'] = 'tx'; // set the type of message at the start

    // Wait for some data and decode it
    $gets = trim(fgets(STDIN)); // STDIN   - blocks as it waits for input
    $decoded = decodeRawTransaction($gets); // decode the data

    // Check for donations
    $donation = false;
    foreach($decoded['vout'] as $vout) {
      $addresses = $vout['scriptPubKey']['addresses']; // check each vout.scriptPubKey.addresses field
      if (strpos($addresses, $donation_address) !== false) { // check if it contains my donation address
        $donation = true; // add true donation field to the tx message
      }
    }
    $array['donation'] = $donation; // add donation:true type to message

    // Return JSON
    $result = $array + $decoded; // combine arrays
    echo json_encode($result, true).PHP_EOL; // STDOUT
}
