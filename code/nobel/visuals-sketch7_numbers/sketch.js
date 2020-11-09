// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

/// TEXT CLASS

class TextObject {
  constructor(texts, line, timeOn, timeOff) {
    if(texts.length != timeOn.length || texts.length != timeOff.length) {
      console.log("ERROR: arrays of different length supplied to TextObject");
    }
    this.height = height;
    this.width = width;
    this.texts = texts;
    this.line = line;
    this.timeOn = timeOn;
    this.timeOff = timeOff;
    this.blinking = false;
    this.currentTextIndex = 0;
    this.currentState = 1; // 1 = text, 0 = off
    this.countdown = this.timeOn[0];
    this.fullCountdownTime = this.timeOn[this.currentTextIndex];
    this.textSize = 16;
    this.textGrowth = 24.0 / 5000;
    this.crossedHalfWay = false;
  }
  setVariant(index, text) {
    this.texts[index] = text;
  }
  draw() {
    if(this.currentState == 1) {
      const lines = [48, 130, 214, 297];
      const texts = this.texts[this.currentTextIndex];
      textSize(this.textSize);
      if (typeof texts === 'string' || texts instanceof String) {
        let y = lines[this.line];
        text(texts, width/2, y);
      } else if(Array.isArray(texts)) {
        for(let i = 0; i < texts.length; i++) {
          let y = lines[this.line + i];
          text(texts[i], width/2, y);
        }
      }
      
    }
  }
  update(dt) {
    this.textSize += this.textGrowth * dt;
    this.countdown -= dt;
    if(this.countdown/this.fullCountdownTime <= 0.8 && this.currentState == 1 && this.crossedHalfWay == false) {
      backgroundAlphaChange *= -1;
      console.log("Change direction");
      this.crossedHalfWay = true;
      if(backgroundAlphaChange > 0) {
        particleDir = (particleDir + 1) % particleDirections.length;
      }
    }
    if(this.countdown <= 0) {
      this.currentState = 1 - this.currentState;
      if(this.currentState == 0) {
        this.countdown = this.timeOff[this.currentTextIndex];
        this.fullCountdownTime = this.timeOff[this.currentTextIndex];
      } else if(this.currentState == 1) {
        this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
        this.countdown = this.timeOn[this.currentTextIndex];
        this.fullCountdownTime = this.timeOn[this.currentTextIndex];
        this.textSize = 16;
        this.textGrowth = 24.0 / 5000;
        this.crossedHalfWay = false;
      }
    }
  }
}


let metrics = {
  countries: new Map(),
  continents: new Map(),
  ports: new Map(),
  numPackets: 0,
  numInPackets: 0,
  numOutPackets: 0,
  totalLen: 0,
};

let metricsPerUpdate = {
  numPackets: 0.0,
  numInPackets: 0.0,
  numOutPackets: 0.0,
  totalLen: 0.0,
}

// a number of datapoints, every datapoint having a timestamp
let metricsDatapoints = {
  numPackets: [],
  totalLen: [],
}

function registerMetric(d, country, continent) {
  metrics.numPackets += 1;
  metrics.totalLen += d.len;
  metricsPerUpdate.numPackets += 1;
  metricsPerUpdate.totalLen += d.len;
  if(d.out) {
    metrics.numOutPackets += 1;
    metricsPerUpdate.numOutPackets += 1;
  } else {
    metrics.numInPackets += 1;
    metricsPerUpdate.numInPackets += 1;
  }
  if(metrics.countries.has(country)) {
    metrics.countries.set(country, metrics.countries.get(country));
  } else {
    metrics.countries.set(country, 1);
  }
  if(metrics.continents.has(continent)) {
    metrics.continents.set(continent, metrics.continents.get(continent));
  } else {
    metrics.continents.set(continent, 1);
  }
  let port = d.remove_port;
  if(metrics.ports.has(port)) {
    metrics.ports.set(port, metrics.ports.get(port)+1);
  } else {
    metrics.ports.set(port, 1);
  }
  port = d.local_port;
  if(metrics.ports.has(port)) {
    metrics.ports.set(port, metrics.ports.get(port)+1);
  } else {
    metrics.ports.set(port, 1);
  }
}


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
  } else if(internalData.local_location.country != undefined) {
    lastCountry = internalData.local_location.country;
    continent = internalData.local_location.continent;
  }
  
  registerMetric(internalData, lastCountry, continent)
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
var subsampling = 1;
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
let imgMask;

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
let backgroundAlpha = 0;
let backgroundAlphaChange = 0.01;

let particleDirections = ['down', 'right', 'left', 'up'];
let particleDir = 3;

let textObjects = [];

function addParticle(len) {
  averageLen = averageLen* 0.9 + len*0.1;
  if(len > 1) {
    let lightness = (1.0 - Math.pow( 1.0 - (averageLen / 20000.0), 3.0));
    let x, y;
    switch(particleDirections[particleDir]) {
      case 'right':
        x = -10; y = Math.random() * canvasY * subsampling;
        break;
      case 'left':
        x = canvasX*subsampling + 10; y = Math.random() * canvasY * subsampling;
        break;
      case 'up':
        y = canvasY*subsampling + 10; x = Math.random() * canvasX * subsampling;
        break;
      case 'down':
        y = -10; x = Math.random() * canvasX * subsampling;
        break;
    } 
    particles.push({
      x: x,
      y: y,
      vel: Math.random() * 10 + 5,
      size: Math.min(Math.max(len/10000, 1), 8.0) + 1.0,
      hue: Math.pow(lightness, 2.0) * 15, //Math.pow( 1.0 - (len / 20000.0), 5.0) * 100,
      saturation: 100,
      lightness: lightness * 70 + 10,
    })
  }
}

let pg;
let canvasRotation = 0;

// Preload Function
function preload() {
  myFont = loadFont('assets/fonts/Anton-Regular.ttf');
} // End Preload

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  // Create canvas
  canvas = createCanvas(canvasX, canvasY);

  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");

  let sketchHolder = document.getElementById("sketch-holder");
  sketchHolder.onclick = (e) => {
    console.log(metrics.ports);
    const mapSort1 = new Map([...metrics.ports.entries()].sort((a, b) => b[1] - a[1]));
    console.log(mapSort1);
  }

  imgMask = loadImage('assets/paths_mask.png'); // Load the image

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

  pg = createGraphics(canvasX * subsampling, canvasY * subsampling);
  pg.clear();

  background("#000000");

  // textFont('sans');
  textSize(24);
  textAlign(CENTER, CENTER);
  textFont(myFont);

  textObjects.push(new TextObject(["INTERNET PACKETS", "0", ["INTO", "STOCKHOLM"], "0", ["OUT FROM", "STOCKHOLM"], "0", "DATA SIZE", "0"], 1, [4000, 10000, 4000, 10000, 4000, 10000, 4000, 10000], [500, 500, 500, 500, 500, 500,500, 500]));

  // Set canvas framerate
  // frameRate(25);
} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////
let lastOneSecond = 0;
// Draw Function
function draw() {

  let now = Date.now(); // current time in milliseconds
  if(lastNow == 0) {
    lastNow = now;
  }
  let dt = now - lastNow;

  // Update metrics

  metricsDatapoints.numPackets = metricsDatapoints.numPackets.filter((e) => {return now - e.ts < 1000; });
  metricsDatapoints.totalLen = metricsDatapoints.totalLen.filter((e) => {return now - e.ts < 1000; });

  metricsDatapoints.numPackets.push({value: metricsPerUpdate.numPackets, ts: now});
  metricsDatapoints.totalLen.push({value: metricsPerUpdate.totalLen, ts: now});

  metricsPerUpdate.totalLen = 0;
  metricsPerUpdate.numInPackets = 0;
  metricsPerUpdate.numOutPackets = 0;
  metricsPerUpdate.numPackets = 0;

  // let rollingNumPackets = metricsDatapoints.numPackets.reduce((a, b) => { return a + b.value; }, 0);
  let rollingTotalLen = metricsDatapoints.totalLen.reduce((a, b) => { return a + b.value; }, 0);

  let rollingNumPackets = 0;
  for(let d of metricsDatapoints.numPackets) {
    rollingNumPackets += d.value;
  }

  // Clear if needed
  // clear();
  background("rgba(1.0,1.0,1.0,1.0)");

  // for(let i = 0; i < 100; i++) {
  //   addParticle(Math.pow(Math.random(), 2) * 20000);
  // }

  // Draw particles to Graphics
  pg.noStroke();
  pg.colorMode(HSL, 100);
  // let backgroundHue = rollingNumPackets / 100.0 - 2.0;
  let backgroundHue = Math.min((rollingTotalLen / 1000000.0 - 2.0) * 8.0, 20.0);
  // console.log(backgroundHue);
  pg.fill(backgroundHue, 100, 85, 50);
  pg.rect(0, 0, canvasX * subsampling, canvasY * subsampling);
  for(let p of particles) {
    pg.fill(p.hue, p.saturation, p.lightness);
    pg.ellipse(p.x, p.y, p.size, p.size);
    switch(particleDirections[particleDir]) {
      case 'right':
        p.x += p.vel;
        break;
      case 'left':
        p.x -= p.vel;
        break;
      case 'up':
        p.y -= p.vel;
        break;
      case 'down':
        p.y += p.vel;
        break;
      default:

    }
  }

  switch(particleDirections[particleDir]) {
    case 'right':
      particles = particles.filter((p) => p.x < (canvasX * subsampling))
      break;
    case 'left':
      particles = particles.filter((p) => p.x > 0)
      break;
    case 'up':
      particles = particles.filter((p) => p.y > 0)
      break;
    case 'down':
      particles = particles.filter((p) => p.y < (canvasY * subsampling))
      break;
  } 

  tint(0, 100, 100, Math.pow(backgroundAlpha, 2) * 100);
  image(pg, 0, 0, canvasX, canvasY);

  backgroundAlpha += backgroundAlphaChange;
  // if(backgroundAlpha >= 100 || backgroundAlpha <= 0) {
  //   backgroundAlpha = Math.max(Math.min(backgroundAlpha, 100.0), 0);
  // }
  backgroundAlpha = Math.max(Math.min(backgroundAlpha, 1.0), 0);

  fill(75, 100, 0, 100);
  let totalLen = formatBytes(rollingTotalLen);
  // text(totalLen, width/2, 130);
  // text(Math.round(rollingNumPackets), width/2, 48);
  textObjects[0].setVariant(1, metrics.numPackets.toString());
  textObjects[0].setVariant(3, metrics.numInPackets.toString());
  textObjects[0].setVariant(5, metrics.numOutPackets.toString());

  textObjects[0].setVariant(7, metrics.totalLen.toString());


  let ratioThatAreHTTP = metrics.ports.get(80)/metrics.numPackets;
  let ratioThatAreHTTPS = metrics.ports.get(443)/metrics.numPackets;



  for(let to of textObjects) {
    to.draw();
    to.update(dt);
  }
  

  colorMode(HSL, 100);
  // Draw the windows
  fill(50, 100);
  noStroke();
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

  // let numCallsPerSecond = 1.0/(dt*0.001);
  // console.log(numCallsPerSecond);
  // let coeff = Math.pow(0.001, 1.0/numCallsPerSecond); // The coefficient for 60db falloff in a second
  // metricsPerUpdate.totalLen *= coeff;
  // metricsPerUpdate.numInPackets *= coeff;
  // metricsPerUpdate.numOutPackets *= coeff;
  // metricsPerUpdate.numPackets *= coeff;
  
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

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

