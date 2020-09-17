// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

new WebSocketClient().onmessage = (data) => {
// console.log(data)
	addParticle();
}
///////////////////////// GUI Element Global Variables///////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////// Global Variables///////////////////////////////////////

let windows = [];
windows.push({x: 2, y: 0, w: 36, h: 35});
windows.push({x: 86, y: 0, w: 36, h: 35});
windows.push({x: 170, y: 0, w: 36, h: 35});

windows.push({x: 2, y: 66, w: 36, h: 49});
windows.push({x: 86, y: 66, w: 36, h: 49});
windows.push({x: 170, y: 66, w: 36, h: 49});

windows.push({x: 2, y: 150, w: 36, h: 49});
windows.push({x: 86, y: 150, w: 36, h: 49});
windows.push({x: 170, y: 150, w: 36, h: 49});

windows.push({x: 2, y: 234, w: 36, h: 49});
windows.push({x: 86, y: 234, w: 36, h: 49});
windows.push({x: 170, y: 234, w: 36, h: 49});

windows.push({x: 2, y: 316, w: 36, h: 44});
windows.push({x: 86, y: 316, w: 36, h: 44});
windows.push({x: 170, y: 316, w: 36, h: 44});

let centerWindow = windows[7];

const MAX_PARTICLE_COUNT = 250;
let particles = []

var canvasX = 208;
var canvasY = 360;

var inc = 0.05;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var flowfield;

/////////////////////////////////////////////////////////////////////////////////////////////

// Preload Function
    function preload() { 
 
    } // End Preload

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
    function setup() {

	    // Create canvas 
	    canvas = createCanvas(canvasX, canvasY);

	    // Send canvas to CSS class through HTML div
		canvas.parent('sketch-holder');

		// Set up flow field
		cols = floor(width / scl);
		rows = floor(height / scl);
		fr = createP('');

		flowfield = new Array(cols * rows);

		background('#000000');

	    // Set canvas framerate
	    // frameRate(25);

    } // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
	function draw() {

        // Clear if needed
        // clear();

        // Set canvas background
		// background('#000000');

		// Update flow field
		var yoff = 0;
		for (var y = 0; y < rows; y++) {
			var xoff = 0;
			for (var x = 0; x < cols; x++) {
				var index = x + y * cols;
				var angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
				var v = p5.Vector.fromAngle(angle);
				v.setMag(0.2);
				flowfield[index] = v;
				xoff += inc;
				// stroke(150, 50);
				// push();
				// translate(x * scl, y * scl);
				// rotate(v.heading());
				// strokeWeight(1);
				// line(0, 0, scl, 0);
				// pop();
			}
			yoff += inc;

			zoff += 0.0003;
		}
		
		// Update and draw particles
		for(p of particles) {
			fill(p.color);
			noStroke();
			ellipse(p.pos.x, p.pos.y, 2, 2);
			let localVel = p.vel.copy().add(getFlowfieldForce(p.pos, flowfield));
			p.pos.add(localVel);
		}

		particles = particles.filter(p => !windowContains(centerWindow, p.pos));

		// Draw the windows
        fill(0, 50);
        for(win of windows) {
            rect(win.x, win.y, win.w, win.h);
		}
		
		fill(255, 100, 50, 50);
		rect(centerWindow.x, centerWindow.y, centerWindow.w, centerWindow.h);

	} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

function addParticle() {
	let windowOrigin = windows[Math.floor(Math.random() * windows.length)];
	let pos = createVector(windowOrigin.x + (windowOrigin.w * Math.random()), windowOrigin.y + (windowOrigin.h * Math.random()));
	// Move towards the center
	let vel = createVector(canvasX/2, canvasY/2).sub(pos).normalize().mult(0.5);
	colorMode(HSB, 100);
	particles.push({
		pos: pos,
		vel: vel,
		color: color(Math.random() * 100, 100, 70, 10),
	})
}

function getFlowfieldForce(pos, vectors) {
	var x = floor(pos.x / scl);
    var y = floor(pos.y / scl);
    var index = x + y * cols;
	var force = vectors[index];
	return force;
}

function windowContains(win, pos) {
	if(pos.x >= win.x && pos.x <= (win.x+win.w)
	&& pos.y >= win.y && pos.y <= (win.y+win.h)
	) {
		return true;
	} else {
		return false;
	}
}