// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

let SINGLE_COLOR = true;

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

let num = 0;
new WebSocketClient().onmessage = (data) => {
  if(num < 10) {
    console.log(data)
    console.log(JSON.parse(data.data));
  }
  let internalData = JSON.parse(data.data);
  if(internalData.remote_location.country != "Sweden"
  && internalData.remote_location.country != undefined) {
    lastCountry = internalData.remote_location.country;
  } else if(internalData.local_location.country != "Sweden"
  && internalData.local_location.country != undefined) {
    lastCountry = internalData.local_location.country;
  }
  
    
  addParticle(internalData.len);
  num++;
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

let columns = [];
columns.push({x: 38, y: 0, w: 48, h: 360});
columns.push({x: 122, y: 0, w: 48, h: 360});

const MAX_PARTICLE_COUNT = 250;
let particles = [];
const NUM_TRAILS = 10;

var canvasX = 208;
var canvasY = 360;

var inc = 0.15;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var flowfield;

let lastChange = Date.now();

let lastCountry = "";

let myFont;

/////////////////////////////////////////////////////////////////////////////////////////////

// Preload Function
function preload() {
  myFont = loadFont('assets/fonts/InconsolataSemiExpanded-Light.ttf');
} // End Preload

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

  textFont('sans');
  textSize(24);
  textAlign(CENTER, CENTER);
  textFont(myFont);

  // Set canvas framerate
  // frameRate(25);
} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  // Clear if needed
  // clear();

  // Set canvas background
  background("rgba(0,0,0,0.1)");

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
      // if (inside && inside != centerWindow) {

      //   const deltaY = Math.abs(inside.center.y - y * scl);
      //   const deltaX = Math.abs(inside.center.x - x * scl);
      //   angle = Math.atan2(deltaY, deltaX);
      //   if (inside.center.y > y * scl && inside.center.x < x * scl) {
      //     angle *= -1;
      // 	}
      // 	if (inside.center.y < y * scl && inside.center.x > x * scl) {
      //     angle *= -1;
      // 	}
      // 	angle += TWO_PI / 2;
      // }

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
    
    
    // strokeWeight(p.size);
    // for(let i = p.trails.length-2; i >= 0; i--) {
    //   p.color.setAlpha(100/(i+1));
    //   stroke(p.color);
    //   line(p.trails[i].x, p.trails[i].y, p.trails[i+1].x, p.trails[i+1].y);
    // }
    noStroke();
    fill(p.color);
    ellipse(p.pos.x, p.pos.y, p.size, p.size);
    p.vel = createVector(centerWindow.center.x, centerWindow.center.y)
      .sub(p.pos)
      .normalize()
      .mult(0.8);
    p.vel = createVector(0, 1);
    let localVel = p.vel.copy().add(getFlowfieldForce(p.pos, flowfield));
    for (w of windows) {
      localVel.add(windowForce(w, p.pos));
    }
    if(frameCount % 10 == 0) {
      p.trails.unshift(createVector(p.pos.x, p.pos.y)) // insert position at the beginning of the array
    }
    
    while(p.trails.length > NUM_TRAILS) {
      p.trails.pop();
    }
    p.pos.add(localVel);
  }

  particles = particles.filter((p) => p.pos.y <= height);

  // Draw the windows
  fill(50, 100);
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

  let now = Date.now(); // current time in milliseconds
  if (now - lastChange > 10000) {
    centerWindow = windows[Math.floor(Math.random() * windows.length)];
    lastChange = Date.now();
  }

  // Draw text
  colorMode(HSL, 100);
  fill(75, 100, 100, 100);
  text("LAST COUNTRY:", width/2, 48);
  // lastCountry = "Hong Kong (China)";
  if(lastCountry.length >= 13) {
    textSize(37 - lastCountry.length);
  }
  text(lastCountry.toUpperCase(), width/2, 130);
  textSize(24);
  text('STOCKHOLM', width/2, 297);

  if(Math.random() > 0.997) {
    SINGLE_COLOR = !SINGLE_COLOR;
  }

  // fill(255, 100, 50, 50);
  // rect(centerWindow.x, centerWindow.y, centerWindow.w, centerWindow.h);
} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

function addParticle(len) {

  let column = Math.floor(Math.random() * columns.length);
  let origin = columns[column];
  let pos = createVector(
    origin.x + origin.w * Math.random(),
    0
  );
  // Move towards the center
  let vel = createVector(canvasX / 2, canvasY / 2)
    .sub(pos)
    .normalize()
    .mult(0.5);
  colorMode(RGB, 100);
  let weight = Math.max(Math.min(Math.pow(len/1000, 0.4)/4, 1.0), 0.0);
  let red = Math.max(1 - weight, 0);
  let blue = Math.max(weight, 0);
  let green = 0.1;
  if(SINGLE_COLOR) {
    red = 0;
    blue = 0.5;
    green = 1
  }
  particles.push({
    pos: pos,
    vel: vel,
    color: color(red * 100, green * 100, blue * 100, 100),
    size: Math.max(Math.pow(len/1000, 0.4), 2),
    trails: [],
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

const FORCE = 10;
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
