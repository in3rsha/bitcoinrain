require 'digest'

module Utils
  def self.checksum(hex)
    binary = [hex].pack("H*")
    hash1 = Digest::SHA256.digest(binary)
    hash2 = Digest::SHA256.digest(hash1)
    result = hash2.unpack("H*")[0]
    return result[0...8]
  end

  def self.reversebytes(hex)
    return hex.to_s.scan(/../).reverse.join
  end

  def self.ascii2hex(ascii)
    hex = ascii.each_byte.map {|c| c.to_s(16) }.join
    return hex
  end
end

module Bitcoin

  module Protocol

    MAGIC_BYTES = "f9beb4d9"

    class Connection < TCPSocket
      def initialize(ip, port=8333)
        super ip, port
      end

      # Get a message from the wire (overwrite default gets method)
      def gets
        # This custom grabbing something from the socket stream works!
        # You could use gets with a custom separator though (nah, too tricky to get first version message)
        magic_bytes = self.recv(4)
        command_type = self.recv(12)
        payload_size = self.recv(4)
        payload_checksum = self.recv(4)

        # Return binary message
        if payload_size.unpack("V").join.to_i > 0
          payload = recv(payload_size.unpack("V").join.to_i) # get the payload if there is one
          return magic_bytes + command_type + payload_size + payload_checksum + payload
        else
          return magic_bytes + command_type + payload_size + payload_checksum
        end
      end

      def gets_message # Conveniently return a message object instead of just binary data
        binary = gets # get a message (in binary)
        return Message.from_binary(binary) # return a message object
      end

    end

    class Message
      attr_reader :type, :payload, :size, :checksum, :payload, :binary, :hex

      def initialize(type, payload=nil)
        @type = type
        @size = payload ? payload.length/2 : 0

        # header
        magic    = MAGIC_BYTES                                         # F9 BE B4 D9
        command  = Utils.ascii2hex(type).ljust(24, '0')                # 76 65 72 73 69 6F 6E 00 00 00 00 00
        size     = Utils.reversebytes((@size).to_s(16).rjust(8, '0'))  # 55 00 00 00
        checksum = Utils.checksum(payload)                             # D6 A3 4B 77

        @checksum = checksum

        @payload = payload
        @hex = payload ? magic+command+size+checksum+payload : magic+command+size+checksum
        @binary = [@hex].pack("H*")
      end

      def self.from_binary(binary)
        data = StringIO.new(binary)

        magic     = data.read(4).unpack("H*").join
        type      = data.read(12).to_s.delete("\x00")  # ascii string (remove hex literals)
        size      = data.read(4).unpack("V").join.to_i # V = 32-byte unsigned, little-endian
        checksum  = data.read(4).unpack("H*").join

        payload = size > 0 ? data.read(size).unpack("H*").join : nil

        return Message.new(type, payload)
      end
    end

  end
end



def read_message(socket)
  buffer = []

  # Keep trying to read invididual bytes from the socket
  while true
    data = socket.recv(1)

    # Got a byte
    if data

      buffer << data # Store bytes received from socket in temporary buffer

      # Keep reading streams of 4 bytes until you hit Magic Bytes (start of new message)
      if buffer.size == 4

        # If first 4 bytes isn't magic, remove first byte and keep reading 4-byte streams to look for it
        unless buffer.map {|byte| byte.unpack("H*").join} == ["f9", "be", "b4", "d9"]
          buffer.shift
        else
          # Header
          magic = buffer.join
          command = socket.recv(12)
          payload_size = socket.recv(4)
          payload_checksum = socket.recv(4)

          buffer = [] # Clear Buffer

          # Payload
          payload = ""
          payloadhex = ""
          payload_size.unpack("V").join.to_i.times do # Just read 1 until got all
            byte = socket.recv(1)
            payload << byte
            payloadhex << byte.unpack("H*").join
          end

          # If the payload's checksum matches the checksum in header
          if Utils.checksum(payloadhex) == payload_checksum.unpack("H*").join
            return Bitcoin::Protocol::Message.from_binary(magic+command+payload_size+payload_checksum+payload)
          else
            raise "Checksum Err: #{command}, #{payload_checksum}, #{checksum(payload)}, #{payload_size}, #{payload}"
          end

        end
      end
    end
  end
end

# def reversebytes(hex)
#   return hex.to_s.scan(/../).reverse.join
# end

# def ascii2hex(ascii)
#     hex = ascii.each_byte.map {|c| c.to_s(16) }.join
#     return hex
# end

# def create_message(command, payload='')
#   # "F9 BE B4 D9"                         # magic bytes
#   # "76 65 72 73 69 6F 6E 00 00 00 00 00" # command name (e.g. version)
#   # "55 00 00 00"                         # payload size
#   # "D6 A3 4B 77"                         # payload checksum

#   header  = "f9beb4d9"                                              # magic bytes
#   header += ascii2hex(command).ljust(24, '0')                       # command name
#   header += reversebytes((payload.length/2).to_s(16).rjust(8, '0')) # payload size
#   header += checksum(payload)                                       # payload checksum

#   return header + payload
# end
