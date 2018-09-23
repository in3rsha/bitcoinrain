#!/usr/bin/env ruby
require 'socket'

# Autoflush output (always gotta flush to STDOUT)
STDOUT.sync = true

# Could just use netcat for testing: nc -U stream.sock
stream = UNIXSocket.new('stream.sock')

while true
  puts stream.gets
end
