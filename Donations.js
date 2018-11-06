// Donations Object
function Donations() {

  // Donation Address HTML Text
  this.box = select("#donate");
  this.active = false;

  this.x = windowWidth/2 - 200;
  this.y = windowHeight/2 - 100;

  this.box.style("width", "400px");
  this.box.style("font-family", myFont);
  this.box.style("color", "#999"); // ccc = 80 brightness, bbb=73, aaa=67, 999=60
  this.box.position(this.x, this.y);

  this.threshold = Math.floor(Math.random() * (10 - 5)) + 5;

  this.opacity = 1;
  this.opacity_reduce = 0.05;

  this.incoming = 0;


  this.show = function() {

    if (this.active) {
      // Donations Address HTML Text
      this.box.show(); // use p5js show() instead of donate.style("display", "block");

      // Try Donating!
      fill(0, 0, 60, this.opacity); // 60=#999, 67=#aaa, 73=#bbb, 80=#ccc
      textSize(15);
      textAlign(CENTER);
      text("Try Donating!", windowWidth/2, this.y + 40);
    }
    else {
      this.box.hide();
    }

    // Donations Incoming
    if (this.incoming > 0) {
      textAlign(CENTER);
      textSize(16);
      fill(51, 100, 100); // gold color
      text("Donation Incoming!", windowWidth/2, 12);
    }

  }

  this.update = function() {

    if (this.active) {
      // Donation Box
      this.x = windowWidth/2 - 200;
      this.y = windowHeight/2 - 100;
      this.box.position(this.x, this.y);
    }

    // Display Donation Box after a number of balls above screen (and there is no problem with the connection)
    if (bounces_above >= this.threshold && !problem) {
      // Start displaying donations box
      this.active = true;

      // Hide donation box once it has fully faded out
      if (this.opacity <= 0) {
        this.active = false;
      }

    }

  }

}
