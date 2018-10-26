First of all, you need to use a webserver like nginx to serve the main index.html page in the project root:

```
server {
    listen 80;
    server_name www.bitcoinrain.io; # check againt HTTP header
    # return 301 http://bitcoinrain.io$request_uri; # redirect www to non-www
    return 301 $scheme://bitcoinrain.io$request_uri;
}

server {
    listen 80;
    server_name bitcoinrain.io;
    location / {
        root /home/greg/inersha/projects/bitcoinrain/;
    }
}
```

Then to get it running you need to start the main server, which provides all of the data. It connects to a connects to a Bitcoin node and writes a stream of transactions to a UNIX Socket.

```
cd ~/inersha/projects/bitcoinrain/server/
ruby server.rb
```

Next you need to run websocketd to turn client.rb in to a websocket server, which reads the data that server.rb spits out and passes writes it to the websocket:

```
cd ~/inersha/projects/bitcoinrain/server/
bash websocketd.sh
```
