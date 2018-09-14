require 'socket'

# Could just use netcat for testing: nc -U stream.sock
stream = UNIXSocket.new('stream.sock')

while true
  puts stream.gets
end
