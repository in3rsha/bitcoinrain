# Ruby

Most of the websocket server stuff is written in Ruby. I'm currently using 2.5+

```
sudo apt install ruby
```

# PHP

The decoders are written in PHP, and also require the PHP Gnu Multiple Precision library to work.

```
sudo apt install php7.3      # first time using 7.3 :)
sudo apt install php7.3-gmp  # Gnu Multiple Precision (needed for bitcoin library stuff)
```

# websocketd

This is a cool tool written in Go that turns any program's STDOUT in to a websocket server. So the program is written in Ruby, and websocketd turns it in to a server that the code in the browser can read from.

```
sudo apt install golang-go # websocketd is built in Go
set -U -x GOPATH $HOME/.go # Set GOPATH (Fish Shell)
export GOPATH=$HOME/.go     # Set GOPATH (Bash Shell - add this to .bashrc to make permanent)

# websocketd
go get -u github.com/joewalnes/websocketd  # Binary will be in: ~/.go/bin/websocketd or ~/go/bin/websocketd
```

# p5js

The visualisation in the browser uses a JavaScript library called p5js, which is awesome. These libraries are in the `js/` folder.

```
js/p5.js         # main library
js/p5.min.js     # minified version loads much faster

js/p5.dom.js     # add on for creating and working with dom objects
js/p5.dom.min.js
```
