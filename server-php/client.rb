#!/usr/bin/env ruby
require 'socket'
require_relative '../server-ruby/requests/getmempoolinfo.rb' # learnmeabitcoin.com API
require_relative '../server-ruby/requests/getprices.rb'      # learnmeabitcoin.com API

# Autoflush output (always gotta flush to STDOUT)
STDOUT.sync = true

# Could just use netcat for testing: nc -U stream.sock

# 0. Try connecting to stream.sock that server.rb is writing to
begin
  stream = UNIXSocket.new('stream.sock') # stream.sock or server-php/stream.sock - server.rb writes to this socket
rescue
  puts '{"type":"status","message":"fail"}' # sent a status message to websocket if can't connect
  exit # exit if problem
end

# 1. Get initial mempool count
puts getmempoolinfo() # returns json e.g. {"type":"mempool","count":1234}

# 2. Get BTC Prices
puts getprices() # returns json

# 3. Keep reading txs and block from server socket
while data = stream.gets # loop exits when stream fails
  puts data
end # should keep going forever if stream is running

# 4. If loop falls through to here, send a message to say the stream has been closed
puts '{"type":"status","message":"closed"}'
