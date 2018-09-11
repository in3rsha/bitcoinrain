require 'socket'
require_relative 'lib/bitcoin.rb'

# 0. Connect to bitcoin server port
socket = Bitcoin.connect('46.19.137.74') # takes care of handshake

# 1. Receive Messages
loop do

  message = socket.gets_message
  puts "<-#{message.type}"

  # 2. Respond to pings (keeps connection alive)
  if message.type == 'ping' # 70696E670000000000000000
    puts "pong->"
    pong = Bitcoin::Protocol::Message.new('pong', message.payload) # reply with ping's payload
    socket.write pong.binary
  end

  if message.type == 'addr'
    # puts message.payload
  end

  # 3. Respond to invs (with getdata (to get txs...))
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

  # 4. Receive txs (in response to our getdata)
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
