// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

// Performance - Disables FES
// p5.disableFriendlyErrors = true;



let num = 0;
new WebSocketClient().onmessage = (data) => {
  if(num < 10) {
    console.log(data)
    console.log(JSON.parse(data.data));
  }
  let internalData = JSON.parse(data.data);
  let continent;
  if(internalData.remote_location.country != "Sweden"
  && internalData.remote_location.country != undefined) {
    lastCountry = internalData.remote_location.country;
    continent = internalData.remote_location.continent;
  } else if(internalData.local_location.country != "Sweden"
  && internalData.local_location.country != undefined) {
    lastCountry = internalData.local_location.country;
    continent = internalData.local_location.continent;
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

var canvasX = 208;
var canvasY = 360;
var numPixels = canvasX * canvasY;
var subsampling = 8;
var skySize = canvasY * subsampling;

var inc = 0.15;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var flowfield;

let lastChange = Date.now();
let lastNow = 0;

let lastCountry = "";

let myFont;
let worldMapImages = [];
let worldMapImagePaths = ["frame-2020-11-06-13-53-48-320.png", "frame-2020-11-06-12-54-00-444.png", "frame-2020-11-06-12-31-03-764.png", "frame-2020-11-06-12-06-31-437.png"];
let translationAngle = 0;
let translationRadius = 0;
let translationCoordinates;
let translationVel;
let translationIterations = 0;

let particles = [];
let particlePosX = 0;
let particlePosY = canvasY-1;
let positionSeed = Math.random() * 748236.0;
positionSeed = 1;
var clearScreen = false;
let positionMode = 0; // 0 = linear position, 1 = sine curved position
let averageLen = 0;
let step = 2;
let pixelSize = 4;
let zoom = 1;

function addParticle(len) {
  averageLen = averageLen* 0.9 + len*0.1;
  if(len > 1) {
    particles.push({
      x: Math.random() * skySize,
      y: Math.random() * skySize,
      size: Math.min(Math.max(len/100000, 1), 8.0),
      hue: 1, //Math.pow( 1.0 - (len / 20000.0), 5.0) * 100,
      lightness: (Math.pow( 1.0 - (averageLen / 20000.0), 3.0)) * 100,
    })
  }
}

let pg;
let canvasRotation = 0;

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

  // Load images of the world map
  for(let path of worldMapImagePaths) {
    worldMapImages.push(loadImage('assets/world_map/' + path));
  }

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

  for(let i = 0; i < windows.length-2; i++) {
    let center = (windows[i].center.y + windows[i+1].center.y)/2;
    console.log("center: " + ((center/height)-0.5));
  }

  pg = createGraphics(skySize, skySize);
  pg.clear();

  background("#000000");

  textFont('sans');
  textSize(24);
  textAlign(CENTER, CENTER);
  textFont(myFont);

  // Set canvas framerate
  // frameRate(25);

  translationCoordinates = createVector(0, 0);
  translationVel = createVector(0, 0);
} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  // Clear if needed
  // clear();
  background("rgba(0,0,0,1.0)");

  // Set canvas background

  particles = [];

  image(worldMapImages[0], 0 / 2, 0, canvasX, canvasY);
  push();
  translate(width / 2, height / 2);
  rotate(canvasRotation * 0.0002);
  translate(-width / 2, -height / 2);
  
  let w = worldMapImages[0].width;
  let h = worldMapImages[0].height;
  // TWEEN to a different place on the map instead of a polar coordinate
  // let a = Math.sin(translationAngle) * Math.PI * 2;
  // let r = Math.sin(translationRadius) * (h * zoom) * 0.5;
  // translate(Math.cos(a) * r, Math.sin(a) * r);
  translate(translationCoordinates.x * zoom, translationCoordinates.y * zoom);
  image(worldMapImages[0], (canvasX - (w * zoom)) / 2, (canvasY - (h * zoom)) / 2, w * zoom, h * zoom);
  pop();

  translationCoordinates.add(translationVel);
  translationIterations -= 1;
  if(translationIterations <= 0) {
    // new target
    let newTarget = createVector(Math.random() * w * 0.7 - (w*0.5), Math.random() * h * 0.7 - (h*0.5));
    translationIterations = 120;
    translationVel = newTarget.copy().sub(translationCoordinates).div(translationIterations);
  }
  
  // image(pg2, 0, particlePosY - canvasY/2, canvasX, canvasY);

  colorMode(HSL, 100);
  // Draw the windows
  fill(50, 100);
  noStroke();
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

  let now = Date.now(); // current time in milliseconds
  if(lastNow == 0) {
    lastNow = now;
  }
  let dt = now - lastNow;
  

  zoom = Math.sin(now * 0.0001) * 0.5 + 0.5;
  zoom = Math.pow(zoom, 2.0) + 1.0;
  zoom = 0.5;
  console.log("zoom: " + zoom);
  canvasRotation += dt * 0.1;

  translationAngle += dt * 0.000005;
  translationRadius += dt * 0.0015523464;
  
  lastNow = now;
  // console.log("num packets: " + num + " elements in particles: " + particles.size);
} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

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
