// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

new WebSocketClient().onmessage = (data) => {
  // console.log(data)
  addParticle();
};
///////////////////////// GUI Element Global Variables///////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////// Global Variables///////////////////////////////////////

let windows = [];
windows.push({ x: 2, y: 0, w: 36, h: 35 });
windows.push({ x: 86, y: 0, w: 36, h: 35 });
windows.push({ x: 170, y: 0, w: 36, h: 35 });

windows.push({ x: 2, y: 66, w: 36, h: 49 });
windows.push({ x: 86, y: 66, w: 36, h: 49 });
windows.push({ x: 170, y: 66, w: 36, h: 49 });

windows.push({ x: 2, y: 150, w: 36, h: 49 });
windows.push({ x: 86, y: 150, w: 36, h: 49 });
windows.push({ x: 170, y: 150, w: 36, h: 49 });

windows.push({ x: 2, y: 234, w: 36, h: 49 });
windows.push({ x: 86, y: 234, w: 36, h: 49 });
windows.push({ x: 170, y: 234, w: 36, h: 49 });

windows.push({ x: 2, y: 316, w: 36, h: 44 });
windows.push({ x: 86, y: 316, w: 36, h: 44 });
windows.push({ x: 170, y: 316, w: 36, h: 44 });

let centerWindow = windows[7];

const MAX_PARTICLE_COUNT = 250;
let particles = [];

var canvasX = 208;
var canvasY = 360;

var inc = 0.05;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var flowfield;

let lastChange = Date.now();

/////////////////////////////////////////////////////////////////////////////////////////////

// Preload Function
function preload() {} // End Preload

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  // Create canvas
  canvas = createCanvas(canvasX, canvasY);

  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");

  // Set up flow field
  cols = floor(width / scl);
  rows = floor(height / scl);
  fr = createP("");

  flowfield = new Array(cols * rows);

  // Calculate window center points
  for (w of windows) {
    w.center = createVector(w.x + w.w / 2, w.y + w.h / 2);
    w.halfWidthSq = Math.pow(w.w / 2, 2);
    w.halfHeightSq = Math.pow(w.h / 2, 2);
  }

  background("#000000");

  // Set canvas framerate
  // frameRate(25);
} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  // Clear if needed
  // clear();

  // Set canvas background
  //background("#000000");

  // Update flow field
  var yoff = 0;
  for (var y = 0; y < rows; y++) {
    var xoff = 0;
    for (var x = 0; x < cols; x++) {
      var index = x + y * cols;

      let inside = false;
      for (let win of windows) {
        if (windowContains(win, { x: x * scl, y: y * scl })) {
          inside = win;
          break;
        }
      }

      var angle = noise(xoff, yoff, zoff) * TWO_PI * 4;

      var v = p5.Vector.fromAngle(angle);
      if (inside && inside != centerWindow) {
        v.setMag(1);
      } else {
				v.setMag(0.3);
      }
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

    zoff += 0.0001;
  }

  // Update and draw particles
  for (p of particles) {
    fill(p.color);
    noStroke();
    ellipse(p.pos.x, p.pos.y, 2, 2);
    p.vel = createVector(centerWindow.center.x, centerWindow.center.y)
      .sub(p.pos)
      .normalize()
      .mult(0.8);
    let localVel = p.vel.copy().add(getFlowfieldForce(p.pos, flowfield));
    for (w of windows) {
      localVel.add(windowForce(w, p.pos));
    }
    p.pos.add(localVel);
  }

  particles = particles.filter((p) => !windowContains(centerWindow, p.pos));

  // Draw the windows
  fill(150, 50);
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

  let now = Date.now(); // current time in milliseconds
  if (now - lastChange > 10000) {
    centerWindow = windows[Math.floor(Math.random() * windows.length)];
    lastChange = Date.now();
  }

  // fill(255, 100, 50, 50);
  // rect(centerWindow.x, centerWindow.y, centerWindow.w, centerWindow.h);
} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

function addParticle() {
  let windowIndex = Math.floor(Math.random() * windows.length);
  let windowOrigin = windows[windowIndex];
  while (windowOrigin == centerWindow) {
    windowIndex = Math.floor(Math.random() * windows.length);
    windowOrigin = windows[windowIndex];
  }
  let pos = createVector(
    windowOrigin.x + windowOrigin.w * Math.random(),
    windowOrigin.y + windowOrigin.h * Math.random()
  );
  // Move towards the center
  let vel = createVector(canvasX / 2, canvasY / 2)
    .sub(pos)
    .normalize()
    .mult(0.5);
  colorMode(HSB, 100);
  particles.push({
    pos: pos,
    vel: vel,
    color: color((windowIndex * 523) % 100, 100, 100, 10),
  });
}

function getFlowfieldForce(pos, vectors) {
  var x = floor(pos.x / scl);
  var y = floor(pos.y / scl);
  var index = x + y * cols;
  var force = vectors[index];
  return force;
}

function windowContains(win, pos) {
  if (
    pos.x >= win.x &&
    pos.x <= win.x + win.w &&
    pos.y >= win.y &&
    pos.y <= win.y + win.h
  ) {
    return true;
  } else {
    return false;
  }
}

const FORCE = 1;
function windowForce(win, pos) {
  let distX = win.center.x - pos.x;
  let distY = win.center.y - pos.y;
  let vel = createVector(0, 0);
  if (Math.abs(distX) < win.w / 2 && Math.abs(distY) < win.h / 2) {
    if (distX < 0) {
      vel.x = FORCE;
    } else {
      vel.x = -FORCE;
    }
    if (distY < 0) {
      vel.y = FORCE;
    } else {
      vel.y = -FORCE;
    }
  }
  return vel;
}
