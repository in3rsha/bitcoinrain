require 'socket'
require_relative '../lib/bitcoin.rb'
require_relative 'requests/getmempoolinfo.rb' # Get an up to date mempool count after new block arrives

# A. Create socket for clients to read from
File.unlink('stream.sock') # delete socket file if it already exists (otherwise error)
clientsocket = UNIXServer.new('stream.sock')

clients = [] # hold clients in an array
Thread.new do # Thread for handling new connections
  loop do # Continuously accepting new connections and all them to array

    # Accept new connection
    Thread.new(clientsocket.accept) do |client| # args given to Thread.new are passed to the block
      puts "New Client: #{client}"
      clients << client # Add connection to list of connected clients
    end

  end
end

# B. Connect to the decoder programs (write to them and they will return a json result back)
txdecoder = IO.popen("php ../decoders/txdecoder.php", "r+")
blockdecoder = IO.popen("php ../decoders/blockdecoder.php", "r+")


# 1. Connect to a bitcoin server
puts "Connecting to the internets!"
socket = Bitcoin.connect('46.19.137.74') # TCPSocket
puts "Welcome to the Bitcoin Network: #{socket.inspect}"

# 2. Handshake (also made convenience function `socket.handshake` if you like)
# i. send version
version = Bitcoin::Protocol::Message.version # create a version message to send
socket.write version.binary # Send binary across the wire
puts "version->"

# ii. get the version
message = socket.gets
puts "<-#{message.type}"

# iii. get the verack
message = socket.gets
puts "<-#{message.type}"

# iv. reply to verack
verack = Bitcoin::Protocol::Message.new('verack') # "F9BEB4D9 76657261636b000000000000 00000000 5df6e0e2"
socket.write verack.binary
puts "verack->"

# 3. Receive Messages
loop do

  message = socket.gets
  puts "<-#{message.type}"

  # 4. Respond to pings (keeps connection alive)
  if message.type == 'ping' # 70696E670000000000000000
    puts "pong->"
    pong = Bitcoin::Protocol::Message.new('pong', message.payload) # reply with ping's payload
    socket.write pong.binary
  end

  # 5. Respond to invs (with getdata (to get txs...))
  if message.type == 'inv'
    # Segwit - Must explicitly ask for witness data by changing the inv types used in getdata
    message.payload.gsub!("01000000", "01000040") # MSG_WITNESS_TX
    message.payload.gsub!("02000000", "02000040") # MSG_WITNESS_BLOCK
    # https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki#relay

    puts " getdata->"
    getdata = Bitcoin::Protocol::Message.new('getdata', message.payload)
    socket.write getdata.binary

    # Get Mempool for Debugging Purposes
    mempoolinfo = getmempoolinfo() # returns json (using function from getmempoolcount.rb)
    puts mempoolinfo

    # Write message to every connected client
    clients.each do |client|
      begin
        client.puts mempoolinfo  # Send an updated mempool count message too
      rescue
        clients.delete(client) # remove client from list because it has disconnected
      end
    end
  end

  # 6. Receive txs (in response to our getdata)
  if message.type == 'tx'
    # Decode tx to json
    txdecoder.puts message.payload # write raw tx to decoder
    json = txdecoder.gets          # read decoded json from it

    # Write tx to every connected client
    clients.each do |client|
      begin
        client.puts json       # try writing to this client
      rescue
        clients.delete(client) # remove client from list because it has disconnected
      end
    end
  end

  if message.type == 'block'
   # Decode block to json
    blockdecoder.puts message.payload # write block data to decoder
    json = blockdecoder.gets          # read decoded json from it

    # Get an up to date mempool count, because a new block reduces the size of the mempool
    mempoolinfo = getmempoolinfo() # returns json (using function from getmempoolcount.rb)

    # Add info about mempool to the block message (so that it can be used to update mempool as block passes through it in the sketch)
    mempoolinfojson = JSON.parse(mempoolinfo) # convert mempool json to a ruby hash
    minimempool = {"count"=>mempoolinfojson["count"], "size"=>mempoolinfojson["size"]} # create a subhash with information about mempool
    blockjson = JSON.parse(json) # convert block json to a ruby hash
    blockjson["mempool"] = minimempool # add subhash to block message hash
    block = blockjson.to_json # convert block message hash back to json

    # Write message to every connected client
    clients.each do |client|
      begin
        client.puts block       # try writing to this client
        # client.puts mempoolinfo  # Send an updated mempool count message too
      rescue
        clients.delete(client) # remove client from list because it has disconnected
      end
    end
  end

  # dummy blocks
  # if rand(10) == 1
  #   json = '{"hash":"00000000000000000023f47aa216aa1664da0a838634ac13859c431c11360f11","version":536870912,"prevblock":"0000000000000000001f95d35034a87dab03a51ba9ba0b0c0d175fe16eaf1b83","merkleroot":"fe20a7dbd7d6d18cfbdf974d04b2674ca388426a1fd7f8ec11d7d72819716358","timestamp":1537743126,"bits":"17275a1f","nonce":1284452078,"txcount":2690,"size":' + rand(1526958).to_s + ',"type":"block"}'
  #   puts "DUMMY BLOCK!"
  #
  #   # Get an up to date mempool count, because a new block reduces the size of the mempool
  #   mempoolinfo = getmempoolinfo() # returns json (using function from server/getmempoolinfo.rb)
  #
  #   # Add info about mempool to the block message
  #   mempoolinfojson = JSON.parse(mempoolinfo) # convert mempool json to a ruby hash
  #   minimempool = {"count"=>mempoolinfojson["count"], "size"=>mempoolinfojson["size"]} # create a subhash with information about mempool
  #   blockjson = JSON.parse(json) # convert block json to a ruby hash
  #   blockjson["mempool"] = minimempool # add subhash to block message
  #   block = blockjson.to_json # convert hash back to json
  #   puts block
  #
  #   # Write tx to every connected client
  #   clients.each do |client|
  #     begin
  #       client.puts block       # try writing to this client
  #     rescue
  #       clients.delete(client) # remove client from list because it has disconnected
  #     end
  #   end
  # end

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
