require "test/unit"
require_relative "../lib/bitcoin.rb"

class TestBitcoin < Test::Unit::TestCase

  def test_new()
    #verack
    verack = Bitcoin::Protocol::Message.new("verack")
    assert_equal(verack.type, "verack")
    assert_equal(verack.payload, nil)
    assert_equal(verack.hex, "f9beb4d976657261636b000000000000000000005df6e0e2")
  end

  def test_from_binary()
    # Make sure the message hex we create from binary is same as the hex of original binary data

    # version
    hex = "f9beb4d976657273696f6e00000000007700000038bbd9457f1101000d04000000000000ba4b965b00000000000000000000000000000000000000000000ffffc1b7690eba9a0d0400000000000000000000000000000000000000000000000066b940e5dc708482212f5361746f7368693a302e31362e30284c6561726e4d6541426974636f696e292f7140080001"
    message = Bitcoin::Protocol::Message.from_binary([hex].pack("H*"))
    assert_equal(hex, message.hex)

    # verack
    hex = "f9beb4d976657261636b000000000000000000005df6e0e2"
    message = Bitcoin::Protocol::Message.from_binary([hex].pack("H*"))
    assert_equal(hex, message.hex)

    # ping
    hex = "f9beb4d970696e6700000000000000000800000061faea66779fdb7adc1df763"
    message = Bitcoin::Protocol::Message.from_binary([hex].pack("H*"))
    assert_equal(hex, message.hex)

    # inv
    hex = "f9beb4d9696e760000000000000000006d000000f868785c03010000009a4c260f54fbf97dc6e5491c3920fb130cc47decee8400bf558e9190b4e00759010000006fdb8671008e05829179e82f165eef2da5d8062cf60be8a28893d5e2a7c6ee36010000004e8c716e3ed0ae83d31045111c095e7e8f878e9b8dc820b685ce000bcf6fc4cb"
    message = Bitcoin::Protocol::Message.from_binary([hex].pack("H*"))
    assert_equal(hex, message.hex)

  end

end
