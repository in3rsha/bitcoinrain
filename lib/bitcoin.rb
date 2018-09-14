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

  # Connect (convenience funtction)
  def self.connect(ip, port=8333)
    return Bitcoin::Protocol::Connection.new(ip, port)
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
        # Keep reading until you get 4 bytes of magic
        buffer = ""
        loop do
          byte = self.recv(1)
          byte = byte.unpack("H*").join
          # STDOUT.print byte
          buffer += byte
          if buffer.size == 8
            if buffer == "f9beb4d9"
              # STDOUT.puts "GOT THE MAGIC"
              buffer = "" # reset the buffer
              break # Break Out!
            else
              STDOUT.puts "THAT AINT NO MAGIC: #{buffer}"
              buffer = buffer[2..-1] # remove first 2 bytes and keep reading...
            end
          end
        end

        # Just reading 4 bytes reliably would be fucking nice...
        # magic_bytes = self.recv(4, Socket::MSG_WAITALL) # make it wait for all 4 bytes using this flag!

        # MSG_OOB        process out-of-band data
        # MSG_PEEK       peek at incoming message
        # MSG_WAITALL    wait for full request or error

        # The MSG_OOB flag requests receipt of out-of-band data that would not be
        # received in the normal data stream.  Some protocols place expedited data
        # at the head of the normal data queue, and thus this flag cannot be used
        # with such protocols.
        # The MSG_PEEK flag causes the receive operation to
        # return data from the beginning of the receive queue without removing that
        # data from the queue.  Thus, a subsequent receive call will return the
        # same data.
        # The MSG_WAITALL flag requests that the operation block until
        # the full request is satisfied.  However, the call may still return less
        # data than requested if a signal is caught, an error or disconnect occurs,
        # or the next data to be received is of a different type than that
        # returned.

        # https://stackoverflow.com/questions/1527895/where-are-msg-options-defined-for-ruby-sockets

        # begin
        #   magic_bytes = self.recv(4) # .read seems to be easier than the lower-level recv
        #   STDOUT.puts magic_bytes.inspect
        #   STDOUT.puts magic_bytes.class
        #   STDOUT.puts magic_bytes.size
        #   STDOUT.puts magic_bytes.unpack("H*").join
        #   magic_bytes = magic_bytes.unpack("H*").join
        #   raise "Magic Bytes Problem" if magic_bytes != "f9beb4d9"
        # rescue
        #   STDOUT.puts "Aint got no MAGIC, trying again..."
        #   sleep 0.5
        #   retry
        # end

        # CAUTION!
        # puts here will call .puts on this socket, so use $stdoup.puts instead

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

      def handshake
        # i. send version
        version = Bitcoin::Protocol::Message.version # create a version message to send
        write version.binary # Send binary across the wire
        # $stdout.puts "version->" # .puts on its own will write to the socket, not STDOUT! (use STDOUT or $stdout)

        # # ii. get the version
        message = gets
        # $stdout.puts "<-#{message.type}"

        # # iii. get the verack
        message = gets
        # $stdout.puts "<-#{message.type}"

        # # iv. reply to verack
        verack = Bitcoin::Protocol::Message.new('verack') # "F9BEB4D9 76657261636b000000000000 00000000 5df6e0e2"
        write verack.binary
        # $stdout.puts "verack->"
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
