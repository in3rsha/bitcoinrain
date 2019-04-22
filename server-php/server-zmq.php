<?php

$donation_address = "1RainRzqJtJxHTngafpCejDLfYq2y4KBc"; // can set to something simple;

// General Functions
require_once 'lib/easybitcoin.php'; // bitcoin json-rpc (getmempoolinfo)
require_once 'lib/basic.php'; // ascii2hex
require_once 'lib/tx.php';    // decode tx
require_once 'lib/block.php'; // decode block
require_once 'functions.php'; // making node messages
require_once 'config.php';    // bitcoin user:pass for json-rpc

// --------
// SETTINGS
// --------

// bitcoin rpc
$bitcoind = new Bitcoin(BITCOIN_USER, BITCOIN_PASS);
if ($bitcoind->getnetworkinfo() == false) {
	exit("Couldn't connect to local bitcoin node. Have you set the right user:pass in config.php?\n");
}

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


// --------------
// 1. ZMQ CONNECT
// --------------

/* Transactions */
$txs = new ZMQSocket(new ZMQContext(), ZMQ::SOCKET_SUB);
$txs->connect("tcp://127.0.0.1:28333");
$txs->setSockOpt(ZMQ::SOCKOPT_SUBSCRIBE, "rawtx");

/* Blocks */
$blocks = new ZMQSocket(new ZMQContext(), ZMQ::SOCKET_SUB);
$blocks->connect("tcp://127.0.0.1:28332");
$blocks->setSockOpt(ZMQ::SOCKOPT_SUBSCRIBE, "rawblock");

while (true) {

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

	// ------------
	// Transactions
	// ------------

	// Get message
	$txsaddress = $txs->recv(ZMQ::MODE_DONTWAIT); // address (the topic of the message) (do not block)

	if ($txsaddress) { // if we have got something

		if ($txsaddress == "rawtx") { // If the message topic is "rawtx"

			//var_dump($address);

			// See if message is in multiple parts
			$more = $txs->getSockOpt(ZMQ::SOCKOPT_RCVMORE);

			// Get message
			if ($more) {
				$contents = $txs->recv(); // contents
			}

			// Results
			$payload = bin2hex($contents);
			// echo $payload.PHP_EOL;
			echo "<-tx\n";

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

		} // if ($txsaddress == "rawtx")

	} // if ($txsaddress)

	// ------
	// Blocks
	// ------

	// Get message
	$blocksaddress = $blocks->recv(ZMQ::MODE_DONTWAIT); // Do not block (first message is the topic)

	if ($blocksaddress) { // if we have got something

		if ($blocksaddress == "rawblock") { // If the message topic is "rawblock"

			// See if message is in multiple parts
			$more = $blocks->getSockOpt(ZMQ::SOCKOPT_RCVMORE);

			// Get message
			if ($more) {
				$contents = $blocks->recv(); // contents
			}

			// Results
			$payload = bin2hex($contents);
			//echo $payload.PHP_EOL;
			echo "<-block\n";

			// Decode Block
			$block = decodeblock($payload);

			// Get mempool info
			$mempool = $bitcoind->getmempoolinfo();
			$minimempool = ["count" => $mempool["size"], "size" => $mempool["bytes"]];

			// Add mempool info to block
			$block["mempool"] = $minimempool;

			// Convert to json
			$json = json_encode($block, true);

			// write message to every connected client
			foreach ($clients as $client) {
				socket_write($client, $json."\n");
			}

		} // if ($blocksaddress == "rawblock")

	} // if ($blocksaddress)

	// tiny sleep to prevent looping insanely fast and using up 100% CPU (because zmq recv() does not block)
	usleep(10000); // 1/100th of a second
	echo '.';

} // main
