<?php

function fieldSize1($field, $bytes = 1) {
	$length = $bytes * 2;
	$result = str_pad($field, $length, '0', STR_PAD_LEFT);
	return $result;
}

function byteSpaces($bytes) { // add spaces between bytes
	$bytes = implode(str_split(strtoupper($bytes), 2), ' ');
	return $bytes;
}

function socketerror() {
	$error = socket_strerror(socket_last_error());
	echo $error.PHP_EOL;
}


// Message Functions 
function timestamp($time) { // convert timestamp to network byte order
	$time = dechex($time);
	$time = fieldSize1($time, 8);
	$time = swapEndian($time);
	return byteSpaces($time);
}

function networkaddress($ip, $port = '8333') { // convert ip address to network byte order
	$services = '01 00 00 00 00 00 00 00'; // 1 = NODE_NETWORK
	
	$ipv6_prefix = '00 00 00 00 00 00 00 00 00 00 FF FF';
	
	$ip = explode('.', $ip);
	$ip = array_map("dechex", $ip);
	$ip = array_map("fieldSize1", $ip);
	$ip = array_map("strtoupper", $ip);
	$ip = implode($ip, ' ');
	
	$port = dechex($port); // for some fucking reason this is big-endian
	$port = byteSpaces($port);
	
	return "$services $ipv6_prefix $ip $port";
}

function checksum($string) { // create checksum of message payloads for message headers
	$string = hex2bin($string);
	$hash = hash('sha256', hash('sha256', $string, true));
	$checksum = substr($hash, 0, 8);
	return byteSpaces($checksum);
}

// ---------------
// MAKING MESSAGES
// ---------------

function makeMessage($command, $payload, $testnet = false) {

	// Header
	$magicbytes = $testnet ? '0B 11 09 07' : 'F9 BE B4 D9';
	$command = str_pad(ascii2hex($command), 24, '0', STR_PAD_RIGHT); // e.g. 76 65 72 73 69 6F 6E 00 00 00 00 00
	$payload_size = bytespaces(swapEndian(fieldSize1(dechex(strlen($payload) / 2), 4)));
	$checksum = checksum($payload);

	$header_array = [
		'magicbytes'	=> $magicbytes,
		'command'		=> $command,
		'payload_size'	=> $payload_size,
		'checksum'		=> $checksum,
	];

	$header = str_replace(' ', '', implode($header_array));
	// echo 'Header: '; print_r($header_array);
	
	return $header.$payload;

}

function makeVersionPayload($version, $node_ip, $node_port, $local_ip, $local_port) {
	
	// settings
	$services = '0D 00 00 00 00 00 00 00'; // (1 = NODE_NETORK), (D = what I've got from my 0.13.1 node)
	$user_agent = '00';
	$start_height = 0;
	
	// prepare
	$version = bytespaces(swapEndian(fieldSize1(dechex($version), 4)));
	$timestamp = timestamp(time()); // 73 43 c9 57 00 00 00 00
	$recv = networkaddress($node_ip, $node_port);
	$from = networkaddress($local_ip, $local_port);
	$nonce = bytespaces(swapEndian(fieldSize1(dechex(1), 8)));
	$start_height = bytespaces(swapEndian(fieldSize1(dechex($start_height), 4)));

	$version_array = [ // hexadecimal, network byte order
		'version'   	=> $version,		// 4 bytes (60002)
		'services'  	=> $services,		// 8 bytes
		'timestamp' 	=> $timestamp,		// 8 bytes
		'addr_recv' 	=> $recv,			// 26 bytes (8 + 16 + 2) 
		'addr_from' 	=> $from,			// 26 bytes (8 + 16 + 2)
		'nonce'			=> $nonce,			// 8 bytes
		'user_agent'	=> $user_agent,		// varint
		'start_height'	=> $start_height	// 4 bytes
	];
	
	$version_payload = str_replace(' ', '', implode($version_array));
	
	return $version_payload;

}

// message header commands
function commandName($data) { // http://www.asciitohex.com/
	if     ($data == '76657273696f6e0000000000') { $command = 'version'; }
	elseif ($data == '76657261636b000000000000') { $command = 'verack'; }
	elseif ($data == '70696e670000000000000000') { $command = 'ping'; }
	elseif ($data == '706f6e670000000000000000') { $command = 'pong'; }
	elseif ($data == '616464720000000000000000') { $command = 'addr'; }
	elseif ($data == '676574686561646572730000') { $command = 'getheaders'; }
	elseif ($data == '696e76000000000000000000') { $command = 'inv'; }
	elseif ($data == '676574646174610000000000') { $command = 'getdata'; }
	elseif ($data == '747800000000000000000000') { $command = 'tx'; }
	elseif ($data == '626c6f636b00000000000000') { $command = 'block'; }
	else { $command = $data; }
	
	return $command;
}
