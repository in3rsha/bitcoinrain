// [x] create a list (array) of transaction objects
var balls_waiting = []; // this is global in scope (i.e. for the draw() loop)
var balls = [];

var blocks = [];

var sound;

// Transactions Per Second
var count = 0;

let next = 0;
let interval = 500; // milliseconds between new balls


function preload() { // preload stuff (before setup() and all other p5 stuff)
    sound = loadSound("droplet.mp3");
    sound.rate(1); // change speed and pitch of the sound
}

// Ball Object
function Ball(data) {
    // console.log(data);
    // console.log(data.value);

    // position
    this.x = random(windowWidth);
    this.y = random(0);

    // diameter (map to size based on its value)
    this.d = map(data.value, 0, 20000000000, 10, 160, true) // 200 btc max

    // value
    this.btc = (data.value/100000000).toFixed(2); // 2 decimal places

    // drop
    this.velocity = 0;
    this.gravity  = 0.25;

    // bounce - this is a function of the amount moved to tx size (in bytes)
    this.bounce_coefficient = data.value/data.size; // multiple of amount moved to size (in bytes)
    this.bounce_coefficient_mapped = map(this.bounce_coefficient, 0, 8000000, 0.2, 0.6, true); // multiple of 8000000 gives max bounce (e.g. ~24btc/256b)
    this.bounce_coefficient_mapped_variable = this.bounce_coefficient_mapped + randomGaussian(-0.00, 0.05); // a nice deviation from it's actual bounce

    this.elasticity = this.bounce_coefficient_mapped_variable; // [x] bounce height determined by size to value (big value, small size is bounciest)
    this.bounce = 0; // bounce count

    // color
    this.r = random(255);
    this.g = random(255);
    this.b = random(255);

    if (this.d > 0)   { [this.r, this.g, this.b] = [0, 124, 255]; }
    if (this.d > 24)  { [this.r, this.g, this.b] = [69, 0, 234]; }
    if (this.d > 48)  { [this.r, this.g, this.b] = [87, 0, 158]; }
    if (this.d > 62)  { [this.r, this.g, this.b] = [179, 0, 0]; }
    if (this.d > 86) { [this.r, this.g, this.b] = [255, 99, 0]; }
    if (this.d > 110) { [this.r, this.g, this.b] = [255, 236, 0]; }
    if (this.d > 134) { [this.r, this.g, this.b] = [40, 255, 0]; }

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
        fill(this.r, this.g, this.b);

        ellipse(this.x, this.y, this.d, this.d);

        // ...only if it's big enough
        // [x] put value inside ball
        if (this.btc > 10) {
            fill(255);
            textSize(13);
            textAlign(CENTER);

            text(this.btc, this.x, this.y+5)
        }

        // text(data.size, this.x, this.y-60);
        // text(data.value, this.x, this.y-40);
        // text(this.bounce_co, this.x, this.y-40);
        // text(this.bounce_co_mapped, this.x, this.y-60);
        // text(this.elasticity, this.x, this.y+40);



    }

    this.update = function() {
        // this.y += 2;

        // drop
        this.velocity += this.gravity;
        this.y += this.velocity;

        // [x] bounce
        if (this.y > windowHeight - (this.d/2)) {
            if (this.bounce < 1) { // number of bounces to do
                this.y = windowHeight - (this.d/2);
                this.velocity = - (this.velocity * this.elasticity);
                this.bounce += 1; // add to bounce count

                // play sound! (loaded in preload)
                // sound.play(); // makes animation slow down a lot with lots of balls
            }
        }

    }

}


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

    this.update = function() {
        // drop
        this.velocity += this.gravity;
        this.y += this.velocity;

        // bounce
        if (this.y > windowHeight - this.d) {
            if (this.bounce < 1) { // number of bounces to do
                this.y = windowHeight - this.d; // blocks are drawn from the top left corner, so no need to half it
                this.velocity = - (this.velocity * this.elasticity);
                this.bounce += 1; // add to bounce count
            }
        }

    }

}


function setup() {
    var width = windowWidth;
    var height = windowHeight;

    createCanvas(width, height);

    // Attach callback function to websocket event in the setup...
    var ws = new WebSocket("ws://localhost:8080");
    ws.onmessage = function(s) { // s contains everything about the message

        // [x] parse json data
        json = JSON.parse(s.data);

				if (json.type == 'tx') {
					// Only add balls to array if the window is focused (prevent a torrent of backed up balls)
					if (focused) {
        		// [x] Create a new transaction object (just a circle), pass it data
        		ball = new Ball(json);
        		// [x] 3. Add transaction to waiting list
        		balls_waiting.push(ball);
        	}
        	// tx/s
        	count += 1;
        }

        if (json.type == 'block') {
        	block = new Block(json);
        	blocks.push(block);
        }
    };

}

function draw() {
    // Redraw background constantly
    background(51);

    // Logo
    noStroke();
    fill(31);
    textSize(56);
    textAlign(CENTER);
    text("bitcoinrain", width/2, height/2);

    // tx/s
    tps = (count / (millis() / 1000)).toFixed(1);
    textSize(24);
    text(tps + " tx/s", width/2, (height/2)+36);   // p5js time since program started

    // Regulate the interval of adding balls if the number of waiting balls starts to back up
    if (balls_waiting.length <= 10) { interval = 500; }
    if (balls_waiting.length > 20)  { interval = 450; }
    if (balls_waiting.length > 30)  { interval = 400; }
    if (balls_waiting.length > 40)  { interval = 350; }
    if (balls_waiting.length > 50)  { interval = 300; }
    if (balls_waiting.length > 60)  { interval = 250; }
    if (balls_waiting.length > 70)  { interval = 200; }
    if (balls_waiting.length > 80)  { interval = 150; }
    if (balls_waiting.length > 90)  { interval = 100; }
    if (balls_waiting.length > 100)  { interval = 50; }

		// Transactions Regulator
    if (millis() > next) { // millis() = time since program started
        // Add a ball to live balls only if we have one
        if (balls_waiting.length > 0) {
            a = balls_waiting.shift(); // get the first one
            balls.push(a); // add it to end of live balls
        }
        // set the time the next ball can be added
        next += interval;
    }

		// Transactions
    if (balls.length > 0) { // Display and update live balls if there are any
        // [x] Constantly draw .show each ball in array
        for (i=0; i<balls.length; i++) {
            balls[i].show();
        }

        // [x] Constantly .update each ball in array
        for (i=0; i<balls.length; i++) {
            balls[i].update();

            // [x] Remove ball from array if runs below bottom of window
            if (balls[i].y > windowHeight+100) {
                balls.splice(i, 1);
            }

        }
    }

    // Blocks
    // Constantly .show each block in array
    for (i=0; i<blocks.length; i++) {
        blocks[i].show();
    }

    // Constantly .update each block in array
    for (i=0; i<blocks.length; i++) {
        blocks[i].update();

        // Remove block from array if runs below bottom of window
        if (blocks[i].y > windowHeight+100) {
            blocks.splice(i, 1);
        }

    }


    // Info
    fill(200);
    textSize(16);
    textAlign(CENTER);

    text(balls_waiting.length, 48, 40);
    text(balls.length, 48, 64);
    text(interval, 48, 100);
    text(count, 48, 140);

    // text(millis() + " ms", windowWidth-100, 40);   // p5js time since program started
    // text(frameCount + " frames", windowWidth-100, 80); // p5js frames since program started
}
