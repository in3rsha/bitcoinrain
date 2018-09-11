require 'socket'
require_relative 'lib/bitcoin.rb'

# 0. Connect to bitcoin server port
# socket = TCPSocket.new('46.19.137.74', 8333)
socket = Bitcoin::Protocol::Connection.new('46.19.137.74')
puts "Welcome to the Bitcoin Network: #{socket.inspect}"

# 1. Send Version

# https://github.com/bitcoin/bitcoin/blob/master/src/version.h
# 60002 = 62EA0000
# 70011 = 7b110100
# 70012 = 7c110100
# 70013 = 7d110100 <- ! socket.recv(0) on a verack payload blocks on this version
# 70014 = 7e110100 <-   this is what PHP script uses
# 70015 = 7f110100 <-   this is the version of the remote node

payload =  "7f110100" #  protocol version
payload += "0D 00 00 00 00 00 00 00" # services (NODE_NETWORK = 1) (Segwit: NODE_WITNESS = (puts 1 << 3))
payload += Time.now.to_i.to_s(16).rjust(16, '0').upcase.scan(/../).reverse.join(" ")       # unixtime
payload += "01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 FF FF 2E 13 89 4A 20 8D" # remote address
payload += "01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 FF FF 7F 00 00 01 20 8D" # local address
payload += "DB 91 32 2C EF B4 57 13" # nonce
payload += "00" # sub-version string
payload += "00 00 00 00" # last block we have

puts "version->"
version = Bitcoin::Protocol::Message.new('version', payload.delete(" "))
socket.write version.binary # Send binary across the wire

# This funking works!
# while true
#   grab = socket.gets
#   print grab.unpack("H*").join
#   sleep 1
# end

# 2. Receive Messages
loop do

  grab = socket.gets
  message = Bitcoin::Protocol::Message.from_binary(grab)
  # begin
  #   message = read_message(socket) # returns Message Object
  # rescue
  #   puts "Message Checksum Invalid"
  #   retry
  # end

  puts "<-#{message.type}"

  # 3. Respond to verack (completes handshake)
  if message.type == 'verack' # 76657261636b000000000000
    puts "verack->"
    verack = Bitcoin::Protocol::Message.new('verack') # "F9BEB4D9 76657261636b000000000000 00000000 5df6e0e2"
    socket.write verack.binary
  end

  # 4. Respond to pings (keeps connection alive)
  if message.type == 'ping' # 70696E670000000000000000
    puts "pong->"
    pong = Bitcoin::Protocol::Message.new('pong', message.payload) # reply with ping's payload
    socket.write pong.binary
  end

  if message.type == 'addr'
    # puts message.payload
  end

  # 5. Respond to invs (with getdata (to get txs...))
  if message.type == 'inv'
    #puts message.payload

    # Segwit - Must explicitly ask for witness data by changing the inv types used in getdata
    message.payload.gsub!("01000000", "01000040") # MSG_WITNESS_TX
    message.payload.gsub!("02000000", "02000040") # MSG_WITNESS_BLOCK
    # https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki#relay

    puts " getdata->"
    getdata = Bitcoin::Protocol::Message.new('getdata', message.payload)
    socket.write getdata.binary
  end

  # 6. Receive txs (in response to our getdata)
  if message.type == 'tx'

    # Decode tx to json
    json = `decoderawtransaction #{message.payload}`
    puts json

  end

  if message.type == 'block'
    # do stuff
  end

end

# <-version
# <-verack
# verack->

# <-alert
# <-ping
#   pong->
# <-addr
# <-getheaders

# <-inv
#   getdata->
#     <-tx
# ...
