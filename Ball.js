// Ball Object
function Ball(data) {
    // console.log(data);
    // {"type":"tx","txid":"ca96348d07f0a92825cfc56db724f77128fcd6bb3ef17d30225e0dbfc366aa24","size":226,"value":2513177}

    // position
    // this.x = random(windowWidth);
    this.y = 0;

    // randomly set x position using the randomness of the txid
    txid_slice = data.txid.slice(-8); // get last 8 characters of txid
    txid_decimal = parseInt(txid_slice, 16); // convert hex to decimal
    this.x = txid_decimal % windowWidth; // randomly position using modulus

    // diameter (map to size based on its value)
    //this.d = map(data.value, 0, 20000000000, 10, 160, true) // value - 200 btc max
    this.d = map(data.size, 190, 30000, 10, 160, true)        // size - 190 (1+1) to 30,000 bytes (214 inputs+outputs)

    // counting
    this.counted = false;

    // value
    this.value = data.value;
    this.btc = (data.value/100000000).toFixed(2); // 2 decimal places

    // size
    this.size = data.size;
    this.size_kb = (this.size / 1000).toFixed(2);

    // donation
    this.donation = data.donation; // json message has a donation:true/false field

    // drop
    this.velocity = 0;
    this.gravity  = 0.25;

    // bounce - this is a function of the amount moved to tx size (in bytes)
    this.bounce_coefficient = data.value/data.size; // multiple of amount moved to size (in bytes)
    this.bounce_coefficient_mapped = map(this.bounce_coefficient, 0, 8000000, 0.15, 0.4, true); // multiple of 8000000 gives max bounce (e.g. ~24btc/256b)
    this.bounce_coefficient_mapped_variable = this.bounce_coefficient_mapped + randomGaussian(-0.00, 0.05); // a nice deviation from it's actual bounce

    this.elasticity = this.bounce_coefficient_mapped_variable; // [x] bounce height determined by size to value (big value, small size is bounciest)
    this.bounce = 0;     // bounce count
    this.bounce_max = 1; // maximum number of bounces to do

    // color
    //this.r = random(255);
    //this.g = random(255);
    //this.b = random(255);

    // Blue
    value_mapped = map(this.value, 0, 10000000000, 0, 100); // 100 btc

    // Single Hue scale
    if (value_mapped > 0)   { this.color = color(0, 172, 202); } // #00acca
    if (value_mapped > 10)  { this.color = color(0, 172, 202); }
    if (value_mapped > 20)  { this.color = color(0, 153, 186); } // #0099ba
    if (value_mapped > 30)  { this.color = color(0, 153, 186); }
    if (value_mapped > 40)  { this.color = color(0, 153, 186); }
    if (value_mapped > 50)  { this.color = color(0, 133, 168); } // #0085a8
    if (value_mapped > 60)  { this.color = color(0, 133, 168); }
    if (value_mapped > 70)  { this.color = color(0, 133, 168); }
    if (value_mapped > 80)  { this.color = color(0, 114, 150); } // #007296
    if (value_mapped > 90)  { this.color = color(0, 114, 150); }
    if (value_mapped > 100) { this.color = color(0, 114, 150); }
                                                                          // #006083

    // Give Segwit transactions their own color
    if (data.segwit !== false)  { this.color = color(200, 96, 198); }

    // donations - 125T7hdVSaMXstpy4UWWm4RKTcTSfttYUb
    if (this.donation) { // donation field is set by txdecoder.php
      this.color = color(255, 215, 0); // golden ball!
      // this.elasticity = 0.5            // super bouncy!
      this.bounce_max = 20;            // bounces loads!
      console.log("DONATION");
    }

    // Create a faded color in case it goes above the screen (for the placeholder)
    // Manually
    this.faded = color(red(this.color), green(this.color), blue(this.color), 64); // same, just with alpha property (25%)

    // console.log(alpha(this.color));
    // console.log(alpha(this.faded));


    // Blue
    // if (value_mapped > 0)   { [this.r, this.g, this.b] = [0, 124, 255]; }
    // if (value_mapped > 10)  { [this.r, this.g, this.b] = [0, 118, 244]; } // 10 btc
    // if (value_mapped > 20)  { [this.r, this.g, this.b] = [0, 113, 234]; } // 20 btc
    // if (value_mapped > 30)  { [this.r, this.g, this.b] = [0, 108, 224]; }
    // if (value_mapped > 40)  { [this.r, this.g, this.b] = [0, 101, 209]; }
    // if (value_mapped > 50)  { [this.r, this.g, this.b] = [200, 96, 198]; } // 50 btc
    // if (value_mapped > 60)  { [this.r, this.g, this.b] = [200, 89, 186]; }
    // if (value_mapped > 70)  { [this.r, this.g, this.b] = [200, 77, 174]; }
    // if (value_mapped > 80)  { [this.r, this.g, this.b] = [200, 65, 162]; }
    // if (value_mapped > 90)  { [this.r, this.g, this.b] = [200, 53, 150]; }
    // if (value_mapped > 100) { [this.r, this.g, this.b] = [200, 41, 138]; } // 100+ btc

    // Rainbow
    //if (this.d > 0)   { [this.r, this.g, this.b] = [0, 124, 255]; }
    //if (this.d > 24)  { [this.r, this.g, this.b] = [69, 0, 234]; }
    //if (this.d > 48)  { [this.r, this.g, this.b] = [87, 0, 158]; }
    //if (this.d > 62)  { [this.r, this.g, this.b] = [179, 0, 0]; }
    //if (this.d > 86) { [this.r, this.g, this.b] = [255, 99, 0]; }
    //if (this.d > 110) { [this.r, this.g, this.b] = [255, 236, 0]; }
    //if (this.d > 134) { [this.r, this.g, this.b] = [40, 255, 0]; }

    // D  = 0   124 255 #007cff
    // E  = 69    0 234 #4500ea
    // F  = 87    0 158 #58009e
    // G  = 179   0   0 #b30000
    // A  = 255  99   0 #ff6300
    // Bb = 255 236   0 #ffec00
    // C  =  40 255   0 #28ff00

    // [ ] makes noise at a frequency based on color when hits bottom
    this.show = function() {
        // [x] color is based on value (using D-minor colours over ~2 octaves for set ranges of tx values)
        noStroke();
        fill(this.color);
        ellipse(this.x, this.y, this.d, this.d);

        // Put value inside ball
        // if (this.btc > 10) { // ...only if it's big enough
        //     fill(255);
        //     textSize(13);
        //     textAlign(CENTER);
        //
        //     text(this.btc, this.x, this.y+5)
        // }

        // Put size (kb) inside ball
        if (this.d > 50) { // ...only if it's big enough
            fill(255);
            textSize(13);
            textAlign(CENTER);

            text(this.size_kb + "kb", this.x, this.y+5)
        }

        // Put donation message outside ball
        if (data.donation == true) {
            fill(255);
            textSize(13);
            textAlign(LEFT);
            text("Thanks!", this.x + this.d + 2, this.y + 4);
        }

        // text(data.size, this.x, this.y-60);
        // text(data.value, this.x, this.y-40);
        // text(this.bounce_co, this.x, this.y-40);
        // text(this.bounce_co_mapped, this.x, this.y-60);
        // text(this.elasticity, this.x, this.y+40);
    }

    this.update = function(mempool) {
        // this.y += 2;

        // drop
        this.velocity += this.gravity;
        this.y += this.velocity;

        // [x] bounce
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

                if (togglemempool == true) {
                  this.velocity -= mempool.velocity; // add velocity of mempool bar
                  // this.gravity *= 3; // increase speed of drop after it has been bounced up
                }
                this.bounce += 1; // add to bounce count

                // play sound! (loaded in preload)
                // sound.play(); // makes animation slow down a lot with lots of balls
            } else {
              this.below = this.y - mempool.y; // get the number of pixels the ball is below the mempool line
              // text(this.below.toFixed(1), this.x, this.y+15)
              // Try and fade out the ball
              if (this.below > this.d) {
                //noFill();
                //stroke(5);
                // lerpColor
                //color(100, 200, 50);
              }
            }
        }

        // put marker if ball goes above top of screen (for funsies)
        if (this.y < 0) {
          fill(this.faded); // same color, just with alpha to make it look faded out a bit
          ellipse(this.x, 0, this.d, this.d);

          textAlign(CENTER);
          // Store the world record bounce height!
          if (-this.y > bounce_record) {
            bounce_record = -this.y;
            fill(255, 215, 0); // gold color if we're breaking the bounce record
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
