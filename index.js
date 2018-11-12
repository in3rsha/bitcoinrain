var myCanvas;
var about;
var about_active = false;
var about_button;

// config
var websocket_uri = "ws://bitcoinrain.io:8082"; // Connect to the websocket that proviedes a stream of tx, block, and mempool data
var debug = false; // set this to true to show debug stats on the screen

// Actual Mempool Size (for comparison and debugging)
var mempool_messages = 0;
var actual_mempool = {};

// Clicks
var clicks = 0;

// Connection
var problem = false;
var problem_message;

// Style
var bg = 22;

// Display
var show_values = true; // toggle btc price of each ball on/off with ENTER Key
var ball_dimension = 'value';

// Meters
var tx_total_value = 0;
var tx_total_size = 0;
var tx_count = 0;
var block_count = 0;

// Record!
var bounce_record = 0;
var records_set = 0; // keep track of how many times a new record has been set
var bounces_above = 0; // keep track of how many balls make it above the top of the screen

// Regulation
var balls_waiting = []; // this is global in scope (i.e. for the draw() loop)
var balls = [];
let next_tx = 0;
let interval_tx = 500; // milliseconds between new balls

var blocks_waiting = [];
var blocks = [];
let next_block = 0;
let interval_block = 1000; // milliseconds between new blocks

// Time
var unixtime = Math.floor(Date.now() / 1000); // for calculating time since last block

// BTC Prices
var price = {};
var currency_select = 1;
var price_array = [];
var currency_array = []; // e.g. BTC, USD, GBP - match indexes with price_array - [ ] can do better than having 2 separate arrays for this
var currency_sign_array = []; // e.g. $, £

// Sound
var sound;

function preload() { // preload stuff (before setup() and all other p5 stuff)
    // Sound
    // sound = loadSound("droplet.mp3");
    // sound.rate(1); // change speed and pitch of the sound

    // Font
    myFont = loadFont('assets/whitrabt.ttf');
}

function aboutSwitch() {
  if (about_active == false) {
    myCanvas.hide();
    about.show();
    about_active = true;
  } else {
    myCanvas.show();
    about.hide();
    about_active = false;
  }
}

function setup() {

    // Color
    colorMode(HSB); // 360, 100, 100, 1

    // Canvas
    myCanvas = createCanvas(windowWidth, windowHeight);
    myCanvas.parent('sketch'); // show the sketch in a specific div

    // About
    about = select("#about");
    about_button = select("#button");
    about_button.position(8, 8);
    about_button.mousePressed(aboutSwitch);

    // Font
    textFont(myFont);

    // Create Mempool area
    mempool = new Mempool();

    // Create Blockchain area
    blockchain = new Blockchain();

    // Create Donations box
    donations = new Donations();

    // Attach callback function to websocket event in the setup...
    var ws = new WebSocket(websocket_uri);
    ws.onmessage = function(s) { // s contains everything about the message

        // Parse json data
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
            donations.incoming++; // add to number of donations incoming
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

          console.log("Block Message...");

          // Allow block to update mempool as it passes over it
          if (focused) {
            let block = new Block(json, true); // block was in focus, so it will update mempool as it passes through it
        	  blocks_waiting.push(block);
            console.log("Block Added Focused: " + block.count);
            console.log("Mempool Count: " + block.mempool_count);
          }

          // Immediately update mempool and start block in bottom position
          if (!focused) {
            let block = new Block(json, false); // let block know that we were not focused when it was created
            blocks.push(block); // still want blocks to be added to array for displaying purposes

            // Get count and size of all live balls that are yet to enter and update the mempool
            let balls_active_count = balls.length + balls_waiting.length;
            let balls_active_size = 0;
            for (let ball of balls) {
              balls_active_size += ball.size;
            }
            for (let ball_waiting of balls_waiting) {
              balls_active_size += ball_waiting.size;
            }

            // Update mempool seeing as we are away from the screen
            block_count += 1; // count block as mined
            mempool.count = block.mempool_count - balls_active_count; // update mempool with information contained in the block
            mempool.size  = block.mempool_size - balls_active_size;

            console.log("Block Added Not Focused: " + block.count);
            console.log("Mempool Count: " + block.mempool_count);
          }

        }

        if (json.type == 'mempool') { // mempool message gets sent early so you get a starting state for the mempool

          // Only use first mempool message to set initial state
          if (mempool_messages < 1) {
        	   mempool.count = json.count; // set initial mempool count
             mempool.size  = json.size;  // set initial mempool size

             mempool_messages += 1; // counter
           }

           // Use all messages to store actual mempool for comparison and debugging
           actual_mempool = json;

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

          currency_sign_array[0] = "Ƀ"; // ["BTC", 1];
          currency_sign_array[1] = "$"; // ["USD", price.USD];
          currency_sign_array[2] = "$"; // ["GBP", price.GBP];
          currency_sign_array[3] = "€"; // ["GBP", price.GBP];
          currency_sign_array[4] = "¥"; // ["GBP", price.GBP];
          currency_sign_array[5] = "¥"; // ["GBP", price.GBP];
          currency_sign_array[6] = "CHF"; // ["GBP", price.GBP];
          currency_sign_array[7] = "$"; // ["GBP", price.GBP];
        }
    };

}

function draw() {
    // myCanvas.hide();

    // Redraw background constantly
    background(0, 0, bg); // Single Color Hue website background = 46

    // Problem?
    if (problem) {
      fill(0, 100, 100); // red
      textSize(28);
      textAlign(CENTER);
      text(problem_message, windowWidth/2, 56);
    }

    // Logo
    noStroke();
    fill(0, 0, 8);
    textSize(56);
    textAlign(CENTER);
    text("bitcoinrain", windowWidth/2, windowHeight/2);

    // tx/s
    tps = (tx_count / (millis() / 1000)).toFixed(1); // millis() = p5js time since program started
    textSize(26);
    text(tps + " tx/s", windowWidth/2, (windowHeight/2)+36);

    // btc/s
    if (ball_dimension == 'value') {
      fill(0, 0, 59);
    } else {
      fill(0, 0, 8);
    }
    textSize(22);
    textAlign(RIGHT);

    // price_per_s (based on selected currency on mouseWhel, using an array of currency values)
    total_in_currency = (tx_total_value / 100000000) * price_array[currency_select]; // using chosen currency to display
    currency_per_s = (total_in_currency / (millis() / 1000)).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    text(currency_per_s + " " + currency_array[currency_select] + "/s", width - 10, mempool.y - 10);

    // kb/s
    if (ball_dimension == 'size') {
      fill(0, 0, 59);
    } else {
      fill(0, 0, 8);
    }
    textSize(22);
    textAlign(LEFT);
    kb_per_s = (tx_total_size / 1000 / (millis() / 1000)).toFixed(2);
    text(kb_per_s + " kb/s", 10, mempool.y - 10);


    // Transactions

    // Regulate the interval of adding balls if the number of waiting balls starts to back up
    interval_tx = map(balls_waiting.length, 0, 100, 500, 50);

    if (millis() > next_tx) { // millis() = time since program started
        // Add a ball to live balls only if we have one
        if (balls_waiting.length > 0) {
            let a = balls_waiting.shift(); // get the first one
            balls.push(a); // add it to end of live balls

            // Remove donation incoming message if we have just made a donation ball go live
            if (a.donation) {
              donations.incoming--; // subtract from incoming donations count
            }

            // tx/s
            tx_count += 1;
        }
        // set the time the next ball can be added
        next_tx += interval_tx;
    }

		// Transactions
    if (balls.length > 0) { // Display and update live balls if there are any

        // Show
        for (i=0; i<balls.length; i++) {
            balls[i].show();
        }

        // Update
        for (i=0; i<balls.length; i++) {
            balls[i].update(); // Uses mempool so that they know when to bounce

            // Do stuff if ball goes past the mempool line
            if (balls[i].y > mempool.y + (balls[i].d/2)) { // distance below mempool line > ball radius

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

            // [x] Remove ball from array if runs well below mempool line
            if (balls[i].y > mempool.y + (balls[i].d*2)) {
                // Remove ball
                balls.splice(i, 1);
            }

        }
    }

    // Mempool
    mempool.show();
    mempool.update(); // update the top height of box based on number of txs in the mempool

    // Blockchain
    blockchain.show();
    blockchain.update(); // update the width when canvas expands

    // Donations
    donations.show();
    donations.update();

    // Update Time
    unixtime = Math.floor(Date.now() / 1000);

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

      // do not show any blocks that have been marked as hidden
      if (blocks[i].hidden == false) {

        blocks[i].show();

      }

    }

    for (i=0; i<blocks.length; i++) { // Constantly .update each block in array

      // do not update any blocks that have been marked as hidden (ones that have dropped well below bottom of blockchain box)
      if (blocks[i].hidden == false) {

        // drop
        if (i == blocks.length - 1) { // if this is the most recently added block to the array (last one in array)
          blocks[i].update(true); // hold the block at the base of the blockchain box
        }
        else {
          blocks[i].update(false); // let box fall
        }

        // Block Passes Top of Mempool Box
        if (blocks[i].y > mempool.y) {

          // Update mempool if it has not already been updated
          if (blocks[i].mempool_updated == false) {

            // Blocks come with new information about the size of the mempool, so update mempool as block passes across it
            // Need to subtract balls that are yet to visually enter the mempool also

            // Get count and size of all live balls that are yet to enter and update the mempool
            let balls_active_count = balls.length + balls_waiting.length;
            let balls_active_size = 0;
            for (let ball of balls) {
              balls_active_size += ball.size;
            }
            for (let ball_waiting of balls_waiting) {
              balls_active_size += ball_waiting.size;
            }

            // Update mempool using information contained in the block
            mempool.count = blocks[i].mempool_count - balls_active_count; // subtract active balls that are yet to update the mempool
            mempool.size  = blocks[i].mempool_size - balls_active_size; // size will increase to current value after live balls have updated it

            // Mark block as updated so it only updates the mempool once
            blocks[i].mempool_updated = true;
          }
        }

        // Block Passes Top of Blockchain Box
        if (blocks[i].y > blockchain.y) {
            if (blocks[i].counted == false) {
              block_count += 1; // count block as mined

              // Mark it as counted so it isn't constantly increasing counts
              blocks[i].counted = true;
            }
          }

          // Block Passes Well Below Bottom of Blockchain Box
          if (blocks[i].y > blockchain.y + blockchain.height + blocks[i].d) {

            // stop showing and updating block
            blocks[i].hidden = true;

            // remove block from array
            //blocks.splice(i, 1);
          }

        } // hidden == false

    }


    // Mempool Not Expanded
    if (mempool.expanded === false) {
      mempool.contract();
      blockchain.lower();
    }

    // Mempool Expanded
    else {
      mempool.expand(); // sets mempool.expansion_complete=true when done

      // Only activate raising and "lowering" of the boxes when mempool expansion has finished
      if (mempool.expanded_complete) {

        // Blockchain Raising
        if (blockchain.raised === false) { // Raise blockchain first because mempool depends on its y position
          blockchain.lower();
        }
        else {
          blockchain.raise();
        }

        // Mempool Raising
        if (mempool.raised === false) {
          mempool.lower();
        }
        else {
          mempool.raise();
        }

      }

    }

    // Debugging Info
    if (debug) {
      fill(100);
      textSize(16);
      textAlign(LEFT);

      text("Balls Waiting:  " + balls_waiting.length, 24, 40);
      text("Balls Active:   " + balls.length, 24, 64);
      text("Interval:       " + interval_tx, 24, 88);
      text("Next Tx:        " + next_tx, 24, 112);
      text("Total Txs:      " + tx_count, 24, 136);

      text("Actual Mempool Count: " + actual_mempool.count, 24, 180);
      text("Actual Mempool Size:  " + actual_mempool.size, 24, 204);

      // text("Blocks Waiting: " + blocks_waiting.length, 24, 180);
      // text("Blocks Active:  " + blocks.length, 24, 204);
      // text("Interval:       " + interval_block, 24, 228);
      // text("Next Block:     " + next_block, 24, 252);
      //
      // text("Orientation:    " + deviceOrientation, 24, 300);
      // text("Clicks:         " + clicks, 24, 324);

      text("Bounces Above:  " + bounces_above, 24, 396);
      text("Records Set:    " + records_set, 24, 420);
      text("Donate Bounces: " + donations.threshold, 24, 444);

      textAlign(RIGHT);
      text("Millisconds:    " + millis(), windowWidth-24, 40);   // p5js time since program started
      // text("Frame Count:    " + frameCount, windowWidth-24, 80); // p5js frames since program started
      // if (frameRate() < 50) { fill(255, 0, 0); } // show frame count in red if it drops a lot
      // text("Frame Rate:     " + frameRate().toFixed(0), windowWidth-24, 104);
      // fill(200);
    }
}

function touchStarted() { // touch for mobiles (will use mousePressed instead if this is not defined)

    // State
    if (mempool.expanded == false) {
      //  _______
      // |       |
      // |       |
      // |       |
      // |_______|

      mempool.expanded = true;
      // console.log("mempool.expanded=true");
    }

    else {
      if (blockchain.raised) {
        //  _______
        // |       |
        // |_______|
        // |__mem__|
        // |__blk__|

        mempool.raised = false;     // lower it
        blockchain.raised = false;  // lower it
        // console.log("mempool.raised=false");
        // console.log("blockchain.raised=false");
      }
      else {
        //  _______
        // |       |
        // |       |
        // |_______|
        // |__mem__|

        if (mempool.clicked()) {
          //  _______
          // |       |
          // |       |
          // |_______|
          // |__mem__| <- click here

          mempool.raised = true;
          blockchain.raised = true;
          // console.log("mempool.raised=true");
          // console.log("blockchain.raised=true");
        }
        else {
          //  _______
          // |       |
          // |       | <- click here
          // |_______|
          // |__mem__|

          mempool.expanded = false;
          // console.log("mempool.expanded=false");
        }
      }
    }

    // Increment Click Counter (do stuff after number of clicks)
    clicks++;

    // Donations Box - Reduce lightness so it fades out on each click
    if (donations.active) {
      donations.opacity -= donations.opacity_reduce;
      donations.box.style("opacity", donations.opacity); // update font opacity
    }
}

function keyPressed() {
  if (keyCode === ESCAPE) {
    if (about_active == false) {
      myCanvas.hide();
      about.show();
      about_active = true;
    } else {
      myCanvas.show();
      about.hide();
      about_active = false;
    }
  }

  if (keyCode === ENTER) {
    show_values = !show_values;
  }

  if (keyCode === SHIFT) {
    debug = !debug;
  }

  if (keyCode === DOWN_ARROW) {
    if (currency_select < currency_array.length -1) { // do not scroll beyond the length of the array
      currency_select += 1; // select a different currency from the array
    }
  }
  if (keyCode === UP_ARROW) {
    if (currency_select > 0) { // do not scroll beyond the first element in the array
      currency_select -= 1; // select a different currency from the array
    }
  }

  if (keyCode === LEFT_ARROW) {
    ball_dimension = 'size';

    // update every ball to let them know they need to switch their dimensions
    for (i=0; i<balls_waiting.length; i++) {
        balls_waiting[i].switch_dimension = true;
    }

    for (i=0; i<balls.length; i++) {
        balls[i].switch_dimension = true;
    }

    //ball_dimension_switch = true; // every ball needs to update its dimensions
    //console.log("ball_dimesion='size'");
  }
  if (keyCode === RIGHT_ARROW) {
    ball_dimension = 'value';

    // update every ball to let them know they need to switch their dimensions
    for (i=0; i<balls_waiting.length; i++) {
        balls_waiting[i].switch_dimension = true;
    }

    for (i=0; i<balls.length; i++) {
        balls[i].switch_dimension = true;
    }

    //ball_dimension_switch = true; // every ball needs to update its dimensions
    //console.log("ball_dimesion='value'")
  }
}

function mouseWheel(event) {
  if (event.delta > 0) {
    if (currency_select < currency_array.length -1) { // do not scroll beyond the length of the array
      currency_select += 1; // select a different currency from the array
    }
  }
  if (event.delta < 0) {
    if (currency_select > 0) { // do not scroll beyond the first element in the array
      currency_select -= 1; // select a different currency from the array
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Keep expanded boxes at their final resting position when canvas is being resized
  if (mempool.expanded == false) {
    mempool.y = mempool.closed; // Down not show the mempool at any time if it is not active
  }

  if (mempool.expanded == true) {
    mempool.y = mempool.height;

    if (mempool.raised == true) {
      blockchain.y = windowHeight - blockchain.height;
      mempool.y = blockchain.y - mempool.length;
    }

    if (mempool.raised == false) {
      blockchain.y = windowHeight;
      mempool.y = blockchain.y - mempool.length;
    }
  }
  // If Mempool is not expanded
  else {
    blockchain.y = windowHeight; // always keep blockchain box lowered
  }
}

// function mousePressed() {
//    ...
// }

// Utility Functions
function fancyTimeFormat(time)
{
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + " hours, " + (mins < 10 ? "0" : "");
    }

    if (mins > 0) {
      ret += "" + mins + " mins, " + (secs < 10 ? "0" : "");
    }

    ret += "" + secs + " secs";

    return ret;
}
