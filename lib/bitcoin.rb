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

  # Add padding to create a fixed-size field (e.g. 4 => 00000004)
  def self.field(field, size=4)
    return field.to_s.rjust(size*2, '0')
  end
end

module Bitcoin

  # Quickly connect to the bitcoin network
  def self.connect(ip, port=8333)
    socket = Bitcoin::Protocol::Connection.new(ip, port)
    puts "Welcome to the Bitcoin Network: #{socket.inspect}"

    # Hand the socket over
    return socket
  end

  module Protocol

    MAGIC_BYTES = "f9beb4d9"

    class Connection < TCPSocket
      attr_reader :ip, :port

      def initialize(ip, port=8333)
        @ip = ip
        @port = port
        super ip, port
      end

      # Read binary message from the wire and return a message object
      def gets
        magic_bytes = self.read(4).unpack("H*").join # .read seems to be easier than the lower-level recv
        raise "Magic Bytes Problem" if magic_bytes != "f9beb4d9"

        command_type = self.read(12)
        raise "Command Type Problem" if command_type.length != 12
        command_type = command_type.to_s.delete("\x00")           # ascii string (remove hex literals)

        payload_size = self.read(4)
        raise "Payload Size Problem" if payload_size.length != 4
        payload_size = payload_size.unpack("V").join.to_i         # V = 32-byte unsigned, little-endian

        payload_checksum = self.read(4)
        raise "Payload Checksum Problem" if payload_checksum.length != 4
        payload_checksum = payload_checksum.unpack("H*").join

        # get payload in one go (I think this works best)
        # stackoverflow.com/questions/19037879/problems-receiving-large-amount-of-data-through-ruby-tcp-socket
        payload = nil
        if payload_size
          payload = self.read(payload_size).unpack("H*").join
        end

        # Create a message object
        message = Bitcoin::Protocol::Message.new(command_type, payload)
        return message
      end

      # Perform the handshake
      def handshake
        # send version
        version = Bitcoin::Protocol::Message.version # create a version message to send
        self.write version.binary # Send binary across the wire
        puts "version->"

        # get the version
        message = gets
        puts "<-#{message.type}"

        # get the verack
        message = gets
        puts "<-#{message.type}"

        # reply to verack
        verack = Bitcoin::Protocol::Message.new('verack') # "F9BEB4D9 76657261636b000000000000 00000000 5df6e0e2"
        write verack.binary
        puts "verack->"
      end

    end

    class Message
      attr_reader :type, :size, :checksum, :payload

      def initialize(type, payload=nil)
        @type = type
        @size = payload ? payload.length/2 : 0
        @checksum = checksum
        @payload = payload
      end

      # Serialize this message data in to hexadecimal for the bitcoin network
      def hex
        magic    = MAGIC_BYTES                                         # F9 BE B4 D9
        command  = Utils.ascii2hex(@type).ljust(24, '0')               # 76 65 72 73 69 6F 6E 00 00 00 00 00
        size     = Utils.reversebytes((@size).to_s(16).rjust(8, '0'))  # 55 00 00 00
        checksum = Utils.checksum(@payload)                            # D6 A3 4B 77

        return @payload ? magic+command+size+checksum+@payload : magic+command+size+checksum
      end

      def binary
        return [hex].pack("H*")
      end

      def self.version(version=70015, services=13, lastblock=0)
        # https://github.com/bitcoin/bitcoin/blob/master/src/version.h
        # 60002 = 62EA0000
        # 70011 = 7b110100
        # 70012 = 7c110100
        # 70013 = 7d110100 <- ! socket.recv(0) on a verack payload blocks on this version
        # 70014 = 7e110100 <-   this is what PHP script uses
        # 70015 = 7f110100 <-   this is the version of the remote node

        payload =  Utils.reversebytes(Utils.field(version.to_s(16))) #  protocol version
        payload += "0D 00 00 00 00 00 00 00" # services (NODE_NETWORK = 1) (Segwit: NODE_WITNESS = (puts 1 << 3))
        payload += Time.now.to_i.to_s(16).rjust(16, '0').upcase.scan(/../).reverse.join(" ")       # unixtime
        payload += "01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 FF FF 2E 13 89 4A 20 8D" # remote address
        payload += "01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 FF FF 7F 00 00 01 20 8D" # local address
        payload += Utils.reversebytes(Utils.field(rand(18446744073709551615).to_s(16), 4)) # nonce
        payload += "00" # sub-version string
        payload += Utils.reversebytes(Utils.field(lastblock.to_s(16), 4)) # last block we have

        return Message.new('version', payload.delete(" "))
      end

    end
  end
end
