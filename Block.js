// Block Object
function Block(data) {

		// diameter
    this.d = map(data.size, 0, 2000000, 10, 280, true) // 2MB

    // position
    this.x = width/2 - this.d/2; // center the block
    this.y = 0;

    // drop
    this.velocity = 0;
    this.gravity  = 0.25;

		// bounce
    this.elasticity = 0.6 + randomGaussian(0.0, 0.05); // add some noise
    this.bounce = 0; // bounce count
    this.chained = false; // switch to indicate if a block has hit the stack yet

    // color
    this.r = 100;
    this.g = 100;
    this.b = 100;

    this.show = function() {
    		strokeWeight(4);
				stroke(0);
        fill(this.r);
        rect(this.x, this.y, this.d, this.d);

        if (data.size > 10000) {
            fill(0);
            textSize(15);
            noStroke();
            textAlign(CENTER);

						sizemb = (data.size/1000/1000).toFixed(2);
            text(sizemb + " MB", this.x + this.d/2, this.y + this.d/2)
        }
    }

    this.stop = height;

    this.update = function() {
        // drop
        this.velocity += this.gravity;
        this.y += this.velocity;

        // bounce
        if (this.y > this.stop - this.d) {
          //this.y = this.stop - this.d;
          //this.velocity = 0; // blocks are drawn from the top left corner, so no need to half it
          //this.gravity = 0;
          this.chained = true;
        }

    }

}
