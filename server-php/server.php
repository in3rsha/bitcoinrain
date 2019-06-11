<?php

$donation_address = "1RainRzqJtJxHTngafpCejDLfYq2y4KBc"; // can set to something simple;

// General Functions
require_once 'lib/basic.php'; // ascii2hex
require_once 'lib/tx.php';    // decode tx
require_once 'lib/block.php'; // decode block
require_once 'functions.php'; // making node messages

// --------
// SETTINGS
// --------
$version  = 70014; // 60002 // 70014
$node	  = array('85.119.83.25', 8333); // 127.0.0.1, 85.119.83.25, 46.19.137.74 - node you want to connect to (8333=mainnet, 18333=testnet)
$local	  = array('127.0.0.1', 8880); // our ip and port
$testnet  = false;

list($node_ip, $node_port) = $node;
list($local_ip, $local_port) = $local;

echo "\nNode\n----\n";
echo 'version: '.$version.PHP_EOL;
echo 'node:    '.implode($node, ':').PHP_EOL;
echo 'local:   '.implode($local, ':').PHP_EOL.PHP_EOL;

// ------------
// UNIX SOCKET
// -----------

// 1. Create Unix Socket
$unix = socket_create(AF_UNIX, SOCK_STREAM, 0);

// 2. Bind Socket to File
if (file_exists("stream.sock")) { unlink("stream.sock"); }
socket_bind($unix, "stream.sock");

// 3. Server Socket (listen for connections)
socket_listen($unix, 100);

// 4. Prevent Blocking
socket_set_nonblock($unix);

// 5. Keep track of clients
$clients = [];


// -----------------
// 1. SOCKET CONNECT
// -----------------

// i. Create Version Message (needs to be sent to node you want to connect to)
function connect($version, $node_ip, $node_port, $local_ip, $local_port, $testnet) {
	echo "Connect\n-------\n";
	$payload = makeVersionPayload($version, $node_ip, $node_port, $local_ip, $local_port);
	$message = makeMessage('version', $payload, $testnet);
	$message_size = strlen($message) / 2; // the size of the message (in bytes) being sent

	echo "Connecting to $node_ip...\n";
	// ii. Connect to socket and send version message
	$socket = socket_create(AF_INET, SOCK_STREAM, 6); // IPv4, TCP uses this type, TCP protocol
	// socketerror();
	@socket_connect($socket, $node_ip, $node_port);

	// Return false if there is an error connecting.
	if (socket_last_error($socket)) {
		return false;
	}
	echo "Sending version message...\n\n";
	socket_send($socket, hex2bin($message), $message_size, 0); // don't forget to send message in binary


	return $socket;
}

// iii. Keep receiving data (inv messages) from the node we just connected to
$connected = false;
$socket = NULL;
$buffer = '';

// Connection Checking
$pings = array(); // keep track of how many pings we have sent
$nextping = time() + 5; // timer to keep track of when to send next ping (set timer to now to send a ping straight away)

while (true) {

	if ($connected == false) {
		$socket = connect($version, $node_ip, $node_port, $local_ip, $local_port, $testnet);
		
		if ($socket) { // if we have a socket resource and not "false" from attempting to connected
			$connected = true; // don't try and connect again
		}
		else {
			echo "Couldn't connect to socket. Trying again in 10 seconds...\n";
			sleep(10);
		}
	}

	// Unix Socket - Accept New Clients
	$newclient = socket_accept($unix); // keep trying to accept any new clients
	if ($newclient) {
		$clients[] = $newclient; // add new client to array
	}

	// Unix Socket - Remove Disconnected Clients
	if (count($clients)) {
		foreach ($clients as $k => $v) {
			// try and read something from each client
			if (@socket_recv($v, $string, 1024, MSG_DONTWAIT) === 0) { // @ suppresses errors
				unset($clients[$k]);
				socket_close($v);
			}
		}
	}

	if ($connected) {

		// read whats written to the socket 1 byte at a time
		while (socket_recv($socket, $byte, 1, MSG_DONTWAIT)) {
			$byte = bin2hex($byte);
			$buffer .= $byte;

			// if the buffer has received a full header (24 bytes)
			if (strlen($buffer) == 48) {

				//var_dump($clients);

				// parse the header
				$magic = substr($buffer, 0, 8);
				$command  = commandName(substr($buffer, 8, 24));
				// var_dump($command);

				$size = hexdec(swapEndian(substr($buffer, 32, 8)));
				$checksum = substr($buffer, 40, 8);
				// echo "$command \n";

				// now read the size of the payload
				socket_recv($socket, $payload, $size, MSG_WAITALL);
				$payload = bin2hex($payload);

				// --------
				// MESSAGES
				// --------
				if ($command == 'version') {
					// connection is successful, so ask for the entire memory pool (will get an inv back)
					echo "version: ".$payload."\n";
				}

				if ($command == 'verack') {
					echo "verack: ";
					// send a verack back (required in 0.14.0)
					$verack = makeMessage('verack', '', $testnet);
					socket_send($socket, hex2bin($verack), strlen($verack) / 2, 0);
					echo "verack->\n";
				}

				if ($command == 'inv') {
					echo "inv: \n";

					// [ ] ask for blocks as well as txs (similar to server.rb)
					$reply = str_replace('01000000', '01000040', $payload);
					$reply = str_replace('02000000', '02000040', $reply);

					// send "getdata" message (will reply with individual tx messages for each of them...)
					$getdata = makeMessage('getdata', $reply, $testnet);
					socket_send($socket, hex2bin($getdata), strlen($getdata) / 2, 0);

					// keep track of last message received
					$lastinv = time();

					// $inv = $payload;

					// [varint] { [type][hash]... }

					// 1. Filter through the inv to only get the tx type items [01000000]
					// 2. Reply with same structure to get the data for each one
					// 3. Change type [01000000] (tx) to [01000040] (witness_tx) so that node will give us segwit data
						// https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki

					// read the inv
					// list($full, $value, $len) = varInt($inv);
					// $inv = substr($inv, $len);

					// get an inventory array
					// $inventory = [];
					// for ($i=1; $i<=$value; $i++) {
					//	$type = substr($inv, 0, 8);
					//	$hash = substr($inv, 8, 64);
					//	$inv = substr($inv, 72);

					// 	if (strlen($type) == 8 && strlen($hash) == 64) { // check we got full type and hash before creating array
					//		$inventory[$hash] = $type;
					//	}
					//}

					// echo "\ninv: \n";

					// if we've got a tx inv type...
					// if (in_array('01000000', $inventory)) {

						// // Create the getdata reply (tx types only, reply with segwit flag type)
						// $invreply = toVarInt(count($inventory)).'';
						// foreach ($inventory as $hash => $type) {
						// 	if ($type = '01000000') { // a tx inv
						//		$invreply .= '01000040'.$hash;
						//	}
						// }

						// send "getdata" message (will reply with individual tx messages for each of them...)
						// $getdata = makeMessage('getdata', $reply, $testnet);
						// socket_send($socket, hex2bin($getdata), strlen($getdata) / 2, 0);

					// }

				}

				if ($command == 'tx') {
					echo '<-tx'.PHP_EOL;

					// decode tx
					$decoded = decoderawtransaction($payload);

					// set type (sketch expects it to identify different messages)
					$decoded['type'] = 'tx';

					// check for donations
					$donation = false;
					foreach($decoded['vout'] as $vout) {
						$addresses = $vout['scriptPubKey']['addresses']; // check each vout.scriptPubKey.addresses field
						if (strpos($addresses, $donation_address) !== false) { // check if it contains my donation address
							$donation = true; // add true donation field to the tx message
						}
					}
					$decoded['donation'] = $donation; // add donation:true type to message

					// convert to json
					$json = json_encode($decoded);

					// write message to every connected client
					foreach ($clients as $client) {
						socket_write($client, $json."\n");
					}

					// print transaction details
					// -------------------------
					// echo $txid.' ';
					// echo str_pad("($relationshipcount)", 7, ' ').' ';
					// echo str_pad($size, 6, ' ').' ';
					// echo str_pad($weight, 6, ' ').' ';
					// echo $decoded['segwit'] ? 'segwit ' : ' ';

				} // command == 'tx'


				if ($command == 'block') {
					echo '<-block'.PHP_EOL;

					// Decode Block
					$block = decodeblock($payload);

					// Get mempool info
					$mempool = file_get_contents("http://learnmeabitcoin.com/api/getmempoolinfo.php");
					$mempooljson = json_decode($mempool, true);
					$minimempool = ["count" => $mempooljson["size"], "size" => $mempooljson["bytes"]];

					// Add mempool info to block
					$block["mempool"] = $minimempool;

					// Convert to json
					$json = json_encode($block, true);

					// write message to every connected client
					foreach ($clients as $client) {
						socket_write($client, $json."\n");
					}

				}

				if ($command == 'ping') {
					echo "ping: ";
					// reply with "pong" message (containing nonce payload we just got) (let node know that we're still alive)
					$pong = makeMessage('pong', $payload, $testnet);
					// var_dump($payload);
					socket_send($socket, hex2bin($pong), strlen($pong) / 2, 0);
					echo "pong->\n";
				}

				if ($command == 'pong') {
					echo "pong: $payload";

					// If we have received a pong, connection is okay, so clear the unreplied pings array
					if (array_key_exists($payload, $pings)) {
						// completely reset the array of pings
						$pings = array();
					}
				}


				// empty the buffer (after reading the 24 byte header and the full payload)
				$buffer = '';
				// start reading next packet...

			}

		}

		// tiny sleep to prevent looping insanely fast and using up 100% CPU power on one core
		usleep(10000); // 1/100th of a second
		echo '.';

		// ---------
		// CHECK CONNECTION - send a ping every 30s
		// ---------
		if (time() > $nextping) {
			$nonce = bin2hex(random_bytes(8)); // create a unique identifier for the ping
			$ping = makeMessage('ping', $nonce, $testnet);
			@socket_send($socket, hex2bin($ping), strlen($ping) / 2, 0); // suppress errors

			$pings[$nonce] = time(); // add to pings array
			$nextping = time() + 30; // set next ping to 30 secs in the future

			echo "\nping-> $nonce\n";
		}

		// If we have 2 or more unreplied pings...
		if (count($pings) > 2) {
			echo "\nNO RESPONSE TO 2 PINGS. TRYING TO RECONNECT IN 5s...\n";
			//print_r($pings); // show the unreplied pings
			sleep(5);

			$pings = array(); // reset ping counter
			socket_close($socket); // close the socket connection
			$connected = false; // this will run the handshake again
		}
	
	} // if connected

}// main

socket_close($socket);

/* Resources
	- https://wiki.bitcoin.com/w/Network
	- https://en.bitcoin.it/wiki/Protocol_documentation
	- https://coinlogic.wordpress.com/2014/03/09/the-bitcoin-protocol-4-network-messages-1-version/
*/
