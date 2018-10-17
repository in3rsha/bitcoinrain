require 'open-uri'
require 'json'

# Get mempool count from blockchain.info API
# def getmempoolcount
#   open("https://blockchain.info/q/unconfirmedcount") do |f|
#     count = f.read
#     return '{"type":"mempool","count":' + count + '}'
#   end
# end

# Get mempool info from the same node we're connected to using learnmeabitcoin.com HTTP API
def getmempoolinfo
  open("http://learnmeabitcoin.com/api/getmempoolinfo.php") do |f|
    data = f.read            # read the page contents (a json result from the RPC request the page returns)
    hash = JSON.parse(data)  # convert json data to a ruby hash

    count = hash["size"].to_s
    size  = hash["bytes"].to_s

    # sketch.js expects "type":"mempool" to be in the json so it knows what kind of message it is
    return '{"type":"mempool","count":' + count + ',"size":' + size + '}'

    # hash["type"] = "mempool" # add "type":"mempool" to hash
    # return hash.to_json      # convert hash back to json (so sketch.js can use it) [!] sketch.js expects count and size keys, and for values to be integers (not strings)
  end
end

# [ ] Get mempool count from a remote RPC call to my node...
