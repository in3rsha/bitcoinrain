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
    if (this.y > windowHeight - this.height) {
      this.y -= this.velocity;
    }
    else {
      this.y = windowHeight - this.height;
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
