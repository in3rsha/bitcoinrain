#!/usr/bin/env ruby
require 'socket'
require_relative '../rpc/getmempoolinfo.rb' # learnmeabitcoin.com API
require_relative '../rpc/getprices.rb'      # learnmeabitcoin.com API

# Autoflush output (always gotta flush to STDOUT)
STDOUT.sync = true

# Could just use netcat for testing: nc -U stream.sock
stream = UNIXSocket.new('stream.sock') # server.rb writes to this socket

# 0. Get initial mempool count
puts getmempoolinfo() # returns json e.g. {"type":"mempool","count":1234}

# 0. Get BTC Prices
puts getprices() # returns json

# 1. Keep reading txs and block from server socket
while true
  puts stream.gets
end
