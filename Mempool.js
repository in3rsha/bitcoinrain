// Mempool Object
function Mempool() {
  // {"type":"mempool","count":5151,"size":4503792}

  // Count
  this.count = 0;
  this.count_max = 20000; // the max size of the mempool before its display is at its maximum height

  // Font Size (for the count)
  this.textsize = 0;

  // Bytes
  this.size = 0; // bytes
  this.size_max = 40 * 1000 * 1000; // 40MB

  // State
  this.expanded = false;
  this.raised = false;

  // Transition
  this.expanded_complete = false;

  // Expanding Physics
  this.velocity = 0;
  this.gravity  = 1;

  // Raising Physics
  this.raise_velocity = 8;

  // Box
  this.x = 0;
  this.width = windowWidth;

  this.max = windowHeight / 10;  // percentage of the screen when mempool is "full"
  this.min = windowHeight / 1.15; // percentage of the screen when mempool is empty
  this.height = map(this.size, 0, this.size_max, this.min, this.max); // map mempool size to between the min and max values
  this.height = Math.max(this.height, this.max); // prevent the height from exceeding the maximum height due to exceeding the mapping
  this.length = windowHeight - this.height; // the total length of the mempool box (for use when positioning text in the center of it)
  this.base = windowHeight; // the y position of the top of the mempool when it is closed (not toggled)

  this.y = this.base; // starting y position for the top of the mempool (closed)

  //this.ratio = map(this.count, 0, 100000, 1.2, 10);
  //this.ratio = 1.33;
  //this.max = windowHeight / this.ratio; // max height of the box
  //this.min = windowHeight;        // min height of the box
  //this.y = this.min;              // starting position
  //this.length = windowHeight - (windowHeight / this.ratio); // the length of the box
  //this.height = windowHeight - this.y; // the height of the box from the bottom

  this.show = function() {
    // Mempool Box
    // fill(0, 54, 112);
    // fill(0, 76, 109);
    // fill(0, 109, 144);
    this.mempoolfill = fill(195, 100, 66);
    this.mempoolbox = rect(this.x, this.y, this.width, this.y + this.length);
    // box.mousePressed(changeGrey);
    stroke(0);
    strokeWeight(1);
    line(this.x, this.y, this.width, this.y)

    // Title
    noStroke();
    fill(195, 100, 20);
    textSize(32);
    textAlign(LEFT);
    text("mempool", 10, this.y + 40);

    // Mempool Size
    fill(195, 100, 20);
    textSize(22);
    textAlign(LEFT);
    size_mb = (this.size / 1000 / 1000).toFixed(2);
    text(size_mb + " mb", 10, this.y + this.length - 10);

    // Mempool Count
    //fill(0, 89, 186);
    fill(195, 100, 20);
    textSize(this.textsize);
    textAlign(CENTER);
    text(this.count, windowWidth/2, this.y + ((windowHeight - this.height) / 2 ));

    // Block Count
    textSize(14);
    if (block_count == 0) {
      fill(0, 0, 69);      // grey if no blocks arrived
    } else {
      fill(120, 100, 100); // green if blocks have passed through
    }
    text(block_count + " Blocks Mined", windowWidth/2, this.y + this.length - 6);
  }

  this.expand = function() {
    if (this.y > this.height) { // if bar is below the top point
      this.velocity += this.gravity;
      this.y -= this.velocity;
    } else {
      this.y = this.height;
      this.velocity = 0;
      this.expanded_complete = true;
    }

    // scale size of text based on size of mempool box
    this.textsize = map(windowHeight - this.y, 0, windowHeight - this.height, 16, 42);
  }

  this.contract = function() {
    this.expanded_complete = false;

    if (this.y < this.base) { // if top of box is above its base
      this.velocity += this.gravity;
      this.y += this.velocity;
    } else {
      this.y = this.base;
      this.velocity = 0;
    }

    this.textsize = map(windowHeight - this.y, 0, windowHeight - this.height, 16, 42); // scale size of text based on size of mempool box
    // Update the height of the mempool box
    //this.height = windowHeight - this.y;
  }

  this.raise = function() {
    this.y = blockchain.y - this.length;
  }

  this.lower = function() {
    this.y = blockchain.y - this.length;
  }

  this.update = function() {
    // Update Box dimensions if window is resized
    this.max = windowHeight / 10;  // percentage of the screen when mempool is "full"
    this.min = windowHeight / 1.15; // percentage of the screen when mempool is empty
    this.height = map(this.size, 0, this.size_max, this.min, this.max); // map mempool size to between the min and max values
    this.height = Math.max(this.height, this.max); // prevent the height from exceeding the maximum height due to exceeding the mapping
    this.width = windowWidth;
    this.length = windowHeight - this.height; // the total length of the mempool box (for use when positioning text in the center of it)
    this.base = windowHeight; // the y position of the top of the mempool when it is closed (not toggled)
  }

  this.clicked = function() {
    if (mouseX > this.x && mouseX < (this.x + this.width) && mouseY > this.y && mouseY < (this.y + this.length)) {
      return true;
    } else {
      return false;
    }
  }

}
