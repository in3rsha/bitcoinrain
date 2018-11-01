function Blockchain(data) {
  this.raised = false;
  this.raising = false;

  this.velocity = 12;

  this.c = 80;

  this.x = 0;
  this.y = windowHeight;
  this.width = windowWidth;
  this.height = 190;

  this.show = function() {
    fill(this.c);
    rect(this.x, this.y, this.x + this.width, this.y + this.height);

    // Title
    noStroke();
    fill(0, 0, 20);
    textSize(30);
    textAlign(LEFT);
    text("latest block", 10, this.y + 40);

    // No Blocks Mined Placeholder
    if (block_count === 0) {
      textAlign(CENTER);
      fill(0, 0, 40);
      textSize(24);
      text("No Blocks Mined In The Last", this.width/2, this.y+(this.height/2));
      text(fancyTimeFormat(Math.floor(millis()/1000)), this.width/2, this.y+(this.height/2)+32);
    }
  }

  this.raise = function() {
    if (this.y > windowHeight - this.height) {
      this.y -= this.velocity;
      this.raising = true;
    }
    else {
      this.y = windowHeight - this.height;
      this.raising = false;
    }
  }

  this.lower = function() {
    if (this.y < windowHeight) {
      this.y += this.velocity;
    }
    else {
      this.y = windowHeight;
    }
  }

  this.update = function() {
    this.width = windowWidth;
  }

}
