require 'open-uri'
require 'json'

# Get BTC prices from learnmeabitcoin.com HTTP API
def getprices
  open("http://learnmeabitcoin.com/api/btc.php") do |f|
    data = f.read            # read the page contents (a json result from the RPC request the page returns)
    hash = JSON.parse(data)  # convert json data to a ruby hash

    # convert each price from string to number (without commas) so that sketch.js can easily use it
    hash = hash.map{ |k,v| [k, v.tr(',', '').to_f] }.to_h # map returns array, so convert it back to a hash

    hash["type"] = "prices" # add "type":"prices" to hash
    return hash.to_json     # convert hash back to json (so sketch.js can use it)
  end
end

# puts getprices()
