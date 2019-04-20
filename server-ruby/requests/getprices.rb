require 'open-uri'
require 'json'

# Get BTC prices from learnmeabitcoin.com HTTP API
def getprices
  open("https://learnmeabitcoin.com/api/btc.php") do |f|
    # Create hash of "type":"prices"
    hash = Hash.new();
    hash["type"] = "prices"

    # Get the hash of prices from the API
    data = f.read            # read the page contents (a json result from the RPC request the page returns)
    prices = JSON.parse(data)  # convert json data to a ruby hash

    # Convert each price from string to number (without commas) so that sketch.js can easily use it
    prices = prices.map{ |k,v| [k, v.tr(',', '').to_f] }.to_h # map returns array, so convert it back to a hash

    # Add hash of prices to the original hash
    hash = hash.merge(prices)

    return hash.to_json     # convert hash back to json (so sketch.js can use it)
  end
end

# puts getprices()
