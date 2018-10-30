function Blockchain(data) {
  this.raised = false;

  this.velocity = 8;

  this.c = 255;

  this.x = 0;
  this.y = windowHeight;
  this.width = windowWidth;
  this.height = 120;

  this.show = function() {
    fill(this.c);
    rect(this.x, this.y, this.x + this.width, this.y + this.height);
  }

  this.raise = function() {
    if (this.y > windowHeight - this.height) { // if bar is below the top point
      this.y -= this.velocity;
    } else {
      this.y = windowHeight - this.height;
    }
  }

  this.lower = function() {
    //this.c = random(250);
    if (this.y < windowHeight) {
      this.y += this.velocity;
    }
    else {
      this.y = windowHeight;
    }
    // if (this.y < windowHeight) {
    //   this.y -= 1;
    //   // this.y += this.velocity;
    // } else {
    //   this.y = windowHeight;
    //   this.velocity = 0;
    // }
  }

  this.update = function() {
    this.width = windowWidth;
  }

}
