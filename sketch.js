// config
var websocket_uri = "ws://bitcoinrain.io:8080"; // Connect to the websocket that proviedes a stream of tx, block, and mempool data

// Connection
var problem = false;
var problem_message;

// Style
var bg = 55;

// Meters
var tx_total_value = 0;
var tx_total_size = 0;
var tx_count = 0;
var block_count = 0;

// Record!
var bounce_record = 0;

// Donation Box
var donate; // donate box dom element handle
var donate_show = false;
var clicks = 0; // click counter
var donate_threshold = 7; // number of clicks before donation box appears
var donate_grey = 121; // starting color (grey) of font
var donate_grey_reduce = 4; // how many degrees to fade grey out per click
var donations_incoming = 0;
var donate_x;
var donate_y;

// Regulation
var balls_waiting = []; // this is global in scope (i.e. for the draw() loop)
var balls = [];
let next_tx = 0;
let interval_tx = 500; // milliseconds between new balls

var blocks_waiting = [];
var blocks = [];
let next_block = 0;
let interval_block = 1000; // milliseconds between new blocks

// BTC Prices
var price = {};
var currency_select = 1;
var price_array = [];
var currency_array = []; // match indexes with price_array - [ ] can do better than having 2 separate arrays for this
var currency_color = 151;

// Sound
var sound;

function preload() { // preload stuff (before setup() and all other p5 stuff)
    // Sound
    // sound = loadSound("droplet.mp3");
    // sound.rate(1); // change speed and pitch of the sound

    // Font
    myFont = loadFont('assets/whitrabt.ttf');
}

function setup() {

    // Canvas
    var myCanvas = createCanvas(windowWidth, windowHeight);
    myCanvas.parent('sketch'); // show the sketch in a specific div

    // Font
    textFont(myFont);

    // Create Mempool area
    mempool = new Mempool();

    // Donation Box
    donate = select("#donate");
    donate.style("width", "400px");
    donate.style("font-family", myFont);
    donate.style("color", "rgb("+donate_grey+", "+donate_grey+", "+donate_grey+")");
    donate_x = windowWidth/2 - 200;
    donate_y = windowHeight/2 - 100;
    donate.position(donate_x, donate_y);
    // donate.center();

    // Attach callback function to websocket event in the setup...
    var ws = new WebSocket(websocket_uri);
    ws.onmessage = function(s) { // s contains everything about the message

        // [x] parse json data
        json = JSON.parse(s.data);

        if (json.type == 'status') {
          if (json.message == 'fail') { // e.g. server.rb not running
          	problem = true;
            problem_message = "Couldn't connect to live transaction stream.";
          }
          if (json.message == 'closed') { // e.g. server.rb stops running
          	problem = true;
            problem_message = "Connection to live transaction stream has closed. Try refreshing browser in a sec.";
          }
        }

				if (json.type == 'tx') {
          // Donation Incoming!
          if (json.donation) {
            donations_incoming++; // add to number of donations incoming
          }

					// Only add balls to array if the window is focused (prevent a torrent of backed up balls)
					if (focused) {
        		// [x] Create a new transaction object (just a circle), pass it data
        		ball = new Ball(json);
        		// [x] 3. Add transaction to waiting list
        		balls_waiting.push(ball);

            //console.log(json);
        	}

          // Add to meters while away (instead of adding after ball is dropped below window)
          if (!focused) {
            // Add ball to list to be dropped even if the window isn't focused
            if (json.donation) {
        		  ball = new Ball(json);
        		  balls_waiting.push(ball);
            }
            // Otherwise, don't add ball to waiting list and just update meters instead
            else {
              tx_total_value += json.value;
              tx_total_size += json.size;
              mempool.count += 1; // mempool object count
              mempool.size += json.size; // mempool object count

              // tx/s
          	  tx_count += 1;
            }
          }
        }

        if (json.type == 'block') {
          if (focused) {
        	   block = new Block(json);
        	   blocks_waiting.push(block);
          }

          // Add to meters while away
          if (!focused) {
          	block_count += 1; // tx/s
          }
        }

        if (json.type == 'mempool') {
        	mempool.count = json.count;
          mempool.size  = json.size;
        }

        if (json.type == 'prices') {
          price = json;
          // console.log(price.USD);

          // Arrays of prices [ ] Must be a better way than having 2 separate arrays (one for the currency name)
          price_array[0] = 1; // ["BTC", 1];
          price_array[1] = price.USD; // ["USD", price.USD];
          price_array[2] = price.GBP; // ["GBP", price.GBP];
          price_array[3] = price.EUR; // ["GBP", price.GBP];
          price_array[4] = price.JPY; // ["GBP", price.GBP];
          price_array[5] = price.CNY; // ["GBP", price.GBP];
          price_array[6] = price.CHF; // ["GBP", price.GBP];
          price_array[7] = price.AUD; // ["GBP", price.GBP];

          currency_array[0] = "BTC"; // ["BTC", 1];
          currency_array[1] = "USD"; // ["USD", price.USD];
          currency_array[2] = "GBP"; // ["GBP", price.GBP];
          currency_array[3] = "EUR"; // ["GBP", price.GBP];
          currency_array[4] = "JPY"; // ["GBP", price.GBP];
          currency_array[5] = "CNY"; // ["GBP", price.GBP];
          currency_array[6] = "CHF"; // ["GBP", price.GBP];
          currency_array[7] = "AUD"; // ["GBP", price.GBP];
        }
    };

}

function draw() {
    // Redraw background constantly
    background(bg); // Single Color Hue website background = 46

    // Problem?
    if (problem) {
      fill(255, 0, 50);
      textSize(28);
      textAlign(CENTER);
      text(problem_message, windowWidth/2, 56);
    }

    // Logo
    noStroke();
    fill(21);
    textSize(56);
    textAlign(CENTER);
    text("bitcoinrain", windowWidth/2, windowHeight/2);

    // tx/s
    tps = (tx_count / (millis() / 1000)).toFixed(1);
    textSize(26);
    text(tps + " tx/s", windowWidth/2, (windowHeight/2)+36);   // p5js time since program started

    // btc/s
    fill(currency_color);
    textSize(22);
    textAlign(RIGHT);
    //total_btc = (tx_total_value / 100000000);
    //btc_per_s = (total_btc / (millis() / 1000)).toFixed(2);
    //text(btc_per_s + " BTC/s", width - 10, mempool.y - 10);

    //total_usd = total_btc * price.USD;
    //usd_per_s = (total_usd / (millis() / 1000)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'); // .replace code adds commas

    // price_per_s (based on selected currency on mouseWhel, using an array of currency values)
    total_in_currency = (tx_total_value / 100000000) * price_array[currency_select]; // using chosen currency to display
    currency_per_s = (total_in_currency / (millis() / 1000)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    text(currency_per_s + " " + currency_array[currency_select] + "/s", width - 10, mempool.y - 10);

    // kb/s
    fill(21);
    textSize(22);
    textAlign(LEFT);
    kb_per_s = (tx_total_size / 1000 / (millis() / 1000)).toFixed(2);
    text(kb_per_s + " kb/s", 10, mempool.y - 10);


    // Transactions
    // Regulate the interval of adding balls if the number of waiting balls starts to back up
    // if (balls_waiting.length <= 10) { interval_tx = 500; }
    // if (balls_waiting.length > 20)  { interval_tx = 450; }
    // if (balls_waiting.length > 30)  { interval_tx = 400; }
    // if (balls_waiting.length > 40)  { interval_tx = 350; }
    // if (balls_waiting.length > 50)  { interval_tx = 300; }
    // if (balls_waiting.length > 60)  { interval_tx = 250; }
    // if (balls_waiting.length > 70)  { interval_tx = 200; }
    // if (balls_waiting.length > 80)  { interval_tx = 150; }
    // if (balls_waiting.length > 90)  { interval_tx = 100; }
    // if (balls_waiting.length > 100)  { interval_tx = 50; }
    interval_tx = map(balls_waiting.length, 0, 100, 500, 50);

    if (millis() > next_tx) { // millis() = time since program started
        // Add a ball to live balls only if we have one
        if (balls_waiting.length > 0) {
            a = balls_waiting.shift(); // get the first one
            balls.push(a); // add it to end of live balls

            // Remove donation incoming message if we have just made a donation ball go live
            if (a.donation) {
              donations_incoming--; // subtract from incoming donations count
            }

            // tx/s
            tx_count += 1;
        }
        // set the time the next ball can be added
        next_tx += interval_tx;
    }

		// Transactions Show
    if (balls.length > 0) { // Display and update live balls if there are any
        // [x] Constantly draw .show each ball in array
        for (i=0; i<balls.length; i++) {
            balls[i].show();
        }

        // [x] Constantly .update each ball in array
        for (i=0; i<balls.length; i++) {
            balls[i].update(mempool); // Uses mempool so that they know when to bounce

            // Do stuff if ball goes past the mempool line
            if (balls[i].y - mempool.y > balls[i].d / 2) { // distance below mempool line > ball radius

                // Only add balls to meter if they have not already passed the mempool line
                if (balls[i].counted == false) {
                  // Add ball to mempool count
                  mempool.count += 1;
                  mempool.size += balls[i].size;

                  // Add it's value to the counter
                  tx_total_value = tx_total_value + balls[i].value;

                  // Add it's size to meter (for kb/s)
                  tx_total_size = tx_total_size + balls[i].size;


                  // Mark it as counted so it isn't constantly increasing counts
                  balls[i].counted = true;
                }

            }

            // [x] Remove ball from array if runs below bottom of window
            if (balls[i].y > windowHeight + (balls[i].r * 2) + 200) {
                // Remove ball
                balls.splice(i, 1);
            }

        }
    }

    // Mempool
    mempool.show();
    mempool.update(); // update the top height of box based on number of txs in the mempool

    if (mempool.active === true) { // Move mempool up on mousePressed
      mempool.up();
    }
    if (mempool.active === false) { // Move mempool down on mousePressed
      mempool.down();
    }

    // Blocks
    // Regulator
    if (millis() > next_block) { // millis() = time since program started
        // Add a ball to live balls only if we have one
        if (blocks_waiting.length > 0) {
            a = blocks_waiting.shift(); // get the first one
            blocks.push(a); // add it to end of live balls
        }
        // set the time the next ball can be added
        next_block += interval_block;
    }

    // Show Blocks
    for (i=0; i<blocks.length; i++) { // Constantly .show each block in array
        blocks[i].show();
    }

    for (i=0; i<blocks.length; i++) { // Constantly .update each block in array
      // stacking
      // if (i == 0) {
      //   blocks[i].update();
      // } else {
      //   blocks[i].stop = blocks[i-1].y; // set the stopping point
      //   blocks[i].update(); // stack block on top of previous one's y position
      // }

      // drop
      blocks[i].update();

      // [x] Remove ball from array if runs below bottom of window
      if (blocks[i].y > windowHeight+100) {
          block_count += 1;
          blocks.splice(i, 1);
      }

    }

    // Donations Incoming
    if (donations_incoming > 0) {
      textAlign(CENTER);
      textSize(16);
      fill(255, 215, 0); // gold color
      text("Donation Incoming!", windowWidth/2, 12);
    }

    donate_x = windowWidth/2 - 200;
    donate_y = windowHeight/2 - 100;
    donate.position(donate_x, donate_y);

    if (donate_show) {
      // Try Donating message
      fill(donate_grey);
      textSize(15);
      textAlign(CENTER);
      text("Try Donating!", windowWidth/2, donate_y + 40);
    }


    // Info
    fill(200);
    textSize(16);
    textAlign(CENTER);

    //text(balls_waiting.length, 48, 40);
    //text(balls.length, 48, 64);
    //text(interval_tx, 48, 88);
    //text(next_tx, 48, 112);
    //text(tx_count, 48, 142);

    //text(blocks_waiting.length, 48, 180);
    //text(blocks.length, 48, 204);
    //text(interval_block, 48, 228);
    //text(next_block, 48, 252);

    //text(deviceOrientation, 48, 252);
    //text(clicks, 48, 252);

    // text(millis() + " ms", windowWidth-100, 40);   // p5js time since program started
    // text(frameCount + " frames", windowWidth-100, 80); // p5js frames since program started
}

function touchStarted() { // touch for mobiles (will use mousePressed instead if this is not defined)
    mempool.active = !mempool.active; // toggle true/false
    mempool.velocity = 4;

    // Increment Click Counter (do stuff after number of clicks)
    clicks++;

    // Display Donation Box after a number of clicks
    if (clicks >= donate_threshold) {

      //donate.style("display", "block");
      donate.show(); // use p5js show() instead of donate.style("display", "block");
      // Reduce lightness of font color so it fades out
      donate_grey = donate_grey - donate_grey_reduce; // reduce lightness
      donate_grey = Math.max(donate_grey, bg); // don't fade darker than the background color
      donate.style("color", "rgb("+donate_grey+", "+donate_grey+", "+donate_grey+")"); // update font color

      donate_show = true;

      // Hide donation box once it has fully faded out
      if (donate_grey == bg) {
        donate_show = false;
        donate.hide();
      }

    }
}

function mouseWheel(event) {
  if (event.delta > 0) {
    if (currency_select < currency_array.length -1) { // do not scroll beyond the length of the array
      currency_select += 1; // select a different currency from the array
      // currency_color = random(150, 255); // change color of currency
    }
  }
  if (event.delta < 0) {
    if (currency_select > 0) { // do not scroll beyond the first element in the array
      currency_select -= 1; // select a different currency from the array
      // currency_color = random(150, 255); // // change color of currency
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (mempool.active == false) {
    mempool.y = mempool.closed; // Down not show the mempool at any time if it is not active
  }

  if (mempool.active == true) {
    mempool.y = mempool.height; // Keep the mempool at its maximum position
  }
}

// function mousePressed() {
//    ...
// }
