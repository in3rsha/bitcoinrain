// Ball Object
// {"type":"tx","txid":"ca96348d07f0a92825cfc56db724f77128fcd6bb3ef17d30225e0dbfc366aa24","size":226,"value":2513177}

function Ball(data) {

    // position
    this.y = 0;

    // set x position using the randomness of the txid
    txid_slice = data.txid.slice(-8); // get last 8 characters of txid
    txid_decimal = parseInt(txid_slice, 16); // convert hex to decimal
    this.x = txid_decimal % windowWidth; // randomly position modulo the width of the window

    // dimensions
    this.switch_dimension = false; // switch to indicate that we need to change this ball's dimensions during the update() function

    if (ball_dimension == 'size') {
      this.d = map(data.size, 190, 30000, 10, 160, true)        // size - 190 (1+1) to 30,000 bytes (214 inputs+outputs)
    }
    if (ball_dimension == 'value') {
      this.d = map(data.value, 0, 20000000000, 10, 160, true)    // value - 200 btc max
    }

    // counting
    this.counted = false; // do not add me to any counters if I have already been counted
    this.gone_above = false; // keep track of if I have gone above the top of the screen or not
    this.record_set = false; // keep track of if I have set a new record or not

    // value
    this.value = data.value;
    this.btc = (data.value/100000000).toFixed(2); // 2 decimal places
    this.currency = (data.value/100000000 * price_array[currency_select]).toFixed(2);

    // size
    this.size = data.size;
    this.size_kb = (this.size / 1000).toFixed(2);

    // donation
    this.donation = data.donation; // json message has a donation:true/false field (output contains donation address)

    // drop
    this.velocity = 0;
    this.gravity  = 0.25;

    // elasticity - this is a function of the amount moved to tx size (in bytes)
    this.bounce_coefficient = data.value/data.size; // multiple of amount moved to size (in bytes)
    this.bounce_coefficient_mapped = map(this.bounce_coefficient, 0, 8000000, 0.15, 0.4, true); // multiple of 8000000 gives max bounce (e.g. ~24btc/256b)
    this.bounce_coefficient_mapped_variable = this.bounce_coefficient_mapped + randomGaussian(-0.00, 0.05); // a nice deviation from it's actual bounce
    this.elasticity = this.bounce_coefficient_mapped_variable; // [x] bounce height determined by size to value (big value, small size is bounciest)

    // bounces
    this.bounce = 0;     // bounce count
    this.bounce_max = 1; // maximum number of bounces to do


    // HSB Colors

    // Blue (Normal)
    this.h = 195;
    // this.s = 100;
    this.s = map(data.value, 0, 10000000000, 80, 100, true); // map saturation based on value (0BTC to 100BTC)
    this.b = 100;

    // Purple (Segwit)
    if (data.segwit !== false)  {
      this.h = 283; // green=105, purple=288
    }

    // Gold (Donation)
    if (this.donation) { // donation field is set by txdecoder.php
      this.h = 51;
      this.bounce_max = 20;            // bounces loads!
    }

    this.color = color(this.h, this.s, this.b);

    // Create a faded color in case it goes above the screen (for the placeholder)
    this.fade = 0.8;
    this.faded = color(this.h, this.s, this.b, this.fade); // add alpha value

    // Show
    this.show = function() {
        noStroke();
        fill(this.color);
        ellipse(this.x, this.y, this.d, this.d);

        if (show_values === true) { // show_values is a global variable (controlled by ENTER)
          // Put size (kb) inside ball
          if (ball_dimension == 'size') { // ...only if it's big enough
            fill(0); // black for bytes
            textSize(13);
            textAlign(LEFT);

            text(this.size_kb + " kb", this.x+(this.d/2)+6, this.y+4)
          }

          if (ball_dimension == 'value') { // show_values is a global variable
            fill(59); // grey for value
            textSize(13);
            textAlign(LEFT);
            text(this.currency.replace(/\d(?=(\d{3})+\.)/g, '$&,') + " " + currency_array[currency_select], this.x+(this.d/2)+6, this.y+4);
          }

        }

        // Put donation message outside ball
        if (data.donation == true) {
            fill(100);
            textSize(13);
            textAlign(LEFT);
            text("Thanks!", this.x + this.d + 2, this.y + 4);
        }


        // text(data.size, this.x, this.y-60);
        // text(this.elasticity, this.x, this.y+40);
    }

    this.update = function() {

        // currency - keep updating incase selected currency changes
        this.currency = (data.value/100000000 * price_array[currency_select]).toFixed(2);

        // If a switch between bytes to value is made, update the ball dimensions
        if (this.switch_dimension === true) { // switch turned on by changing from size to value (preventing us from constantly having to set the size of the ball)
          if (ball_dimension == 'size') {
            this.d = map(data.size, 190, 30000, 10, 160, true)        // size - 190 (1+1) to 30,000 bytes (214 inputs+outputs)
          }
          if (ball_dimension == 'value') {
            this.d = map(data.value, 0, 20000000000, 10, 160, true)    // value - 200 btc max
          }

          this.switch_dimension = false; // turn off switch so that we're not constantly setting the diameter
        }

        // drop
        this.velocity += this.gravity;
        this.y += this.velocity;

        // bounce
        if (this.y >= mempool.y - (this.d/2)) {
            if (this.bounce < this.bounce_max) { // number of bounces to do
                this.y = mempool.y - (this.d/2);
                this.velocity = - (this.velocity * this.elasticity); // reduce return velocity due to elasticity

                // Don't let donation balls degrade to having no bounce
                if (this.donation) {
                  if (this.velocity > -6) { // -velocity means going up
                    this.velocity = -6; // make sure velocity never goes below 8
                  }
                }

                // Mempool Expanding?
                if (mempool.expanded == true) {
                  this.velocity -= mempool.velocity * this.elasticity; // add velocity of mempool bar
                  // this.gravity *= 3; // increase speed of drop after it has been bounced up
                }

                // Blockchain/Mempool Raising?
                if (blockchain.raising === true) {
                  this.velocity -= blockchain.velocity * this.elasticity; // Mempool moves with blockchain and with same velocity
                }

                this.bounce += 1; // add to bounce count

                // play sound! (loaded in preload)
                // sound.play(); // makes animation slow down a lot with lots of balls
            }

        }

        // Placeholder if ball goes above top of screen (for funsies)
        if (this.y < 0) {
          if (this.gone_above == false) {
            bounces_above++; // increment the global counter for balls that have gone above the top of the screen
            this.gone_above = true; // only add to counter once
          }

          // Change alpha transparency the higher it goes
          this.fade = map(-this.y, 0, 600, 0.8, 0.1, true);
          this.faded = color(this.h, this.s, this.b, this.fade); // add alpha value

          // Draw placeholder ball
          fill(this.faded); // same color, just with alpha to make it look faded out a bit
          ellipse(this.x, 0, this.d, this.d);

          textAlign(CENTER);
          // Store the world record bounce height!
          if (-this.y > bounce_record) {

            // Keep track of number of new records set
            if (this.record_set == false) {
              records_set++; // increment global counter for the number of new records we have set
              this.record_set = true; // only count once
            }

            bounce_record = -this.y;
            fill(51, 100, 100); // gold color if we're breaking the bounce record
            textSize(13);
            text("New Record!", this.x, this.d/2 + 36);
          } else {
            fill(0); // black otherwise
          }

          // Display the bounce height
          textSize(14);
          text(-this.y.toFixed(0) + " px", this.x, this.d/2 + 20); // -this.y because above sceen is a minus number, so make it positive

        }

    }

}
