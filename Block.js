// Block Object
function Block(data) {

    // counting
    this.counted = false; // do not add me to any counters if I have already been counted

    // mempool updating (block data comes with information about the new size of the mempool)
    this.mempool_updated = false; // switch to only update the mempool once as the block crosses the mempool line
    this.mempool_count = data.mempool.count
    this.mempool_size = data.mempool.size

    // store the time this block object was initialized (for debugging - make sure it is created as soon as websocket message received)
    this.time_initialized = hour() + ":" + minute() + ":" + second();
    console.log("Block Object Created: " + this.time_initialized);
    console.log("New Mempool Count: " + data.mempool.count);
    console.log("New Mempool Size: " + data.mempool.size);

		// diameter
    this.d = map(data.size, 0, 1600000, 20, 180, true) // 1.6MB is max size
    this.strokewidth = 4;

    // position
    this.x = width/2 - this.d/2; // center the block
    this.y = 0;

    // drop
    this.velocity = 0;
    this.gravity  = 0.25;

    // stick
    this.sticky = false;

		// bounce
    this.elasticity = 0.6 + randomGaussian(0.0, 0.05); // add some noise
    this.bounce = 0; // bounce count
    this.chained = false; // switch to indicate if a block has hit the stack yet

    // color
    //this.r = 100;
    //this.g = 100;
    //this.b = 100;

    this.show = function() {
    		strokeWeight(this.strokewidth);
				stroke(0);
        fill(mempool.c); // use same color as mempool
        rect(this.x, this.y, this.d, this.d);

        // Details

        // Size (MB)
        if (data.size > 10) {
            fill(0);
            textSize(16);
            noStroke();
            textAlign(RIGHT);

						sizemb = (data.size/1000/1000).toFixed(2);
            text(sizemb + " MB", this.x - this.strokewidth*2, this.y + this.d - this.strokewidth*2)
        }

        // Tx Count
        if (data.size > 10) {
            fill(0);
            textSize(20);
            noStroke();
            textAlign(CENTER);

            text(data.txcount.toLocaleString(), this.x + this.d/2, this.y + this.d/2)
        }

        // Time
        if (data.size > 10) {
            fill(22);
            textSize(18);
            noStroke();
            textAlign(LEFT);

            text((fancyTimeFormat(unixtime - data.timestamp) + " ago"), this.x + this.d + this.strokewidth*3, this.y + this.d/2)
        }
    }

    this.stop = height;

    this.update = function(hold) {
        // Canvas Resizing
        this.x = width/2 - this.d/2; // center the block

        // set default value for whether to hold the block
        hold = hold || false;

        // Keep block stuck to bottom if it is being held and it has already hit the bottom
        if (hold && this.sticky) {
          this.y = blockchain.y + blockchain.height - this.d - this.strokewidth/2;
          this.velocity = 0;
        }
        // keep block at bottom if it is being held and hitting the bottom for the first time
        else if (hold && this.y >= blockchain.y + blockchain.height - this.d - this.strokewidth/2) {
          this.y = blockchain.y + blockchain.height - this.d - this.strokewidth/2;
          this.velocity = 0;
          this.sticky = true; // keep it at bottom next time now that it has hit it (e.g. when resizing canvas)
        }
        // drop as normal
        else {
          // drop
          this.velocity += this.gravity;
          this.y += this.velocity;
        }

    }

}
