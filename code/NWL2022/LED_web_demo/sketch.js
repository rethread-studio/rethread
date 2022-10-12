// Global variables 🌐

const Nx = 5; // number of LEDs in the x-direction
const Ny = 15; // number of LEDs in the y-direction
const diam = 6; // diameter of each sphere (LED)
const s = 24; // space between two spheres

let data; // data from the json
let trace; // array with the trace
let len; // length of the json file, size of data
let maxDepth; // max depth
let allDeps; // array with all dependencies
let allSups; // array with all suppliers
let nDeps; // number of dependencies
let nSups; // number of suppliers

let t = 0; // time
let ledsLeft = [], ledsRight = []; // LEDs on the left, and on the right. Both are 2D-arrays of size Ny*Nx



// GUI 🖱️

let params = {
  speed: 3,
  separation: 0,
  angle: Math.PI/4,
  hueGradient: 5,
  vizStyle: "In/out"
}

let gui = new dat.GUI();
gui.add(params, "speed", 1, 20, 1).name("Slowness")
gui.add(params, "separation", 0, 100, 1).name("Separation");
gui.add(params, "angle", 0, 2*Math.PI, Math.PI/16).name("Angle");
gui.add(params, "hueGradient", 0, 360/Ny, 1).name("Hue gradient");
gui.add(params, "vizStyle", ["In/out", "Right/left", "Up/down"]).name("Style");



// p5.js 🎨

function preload() {
  //data = loadJSON("data-varna-copy-paste-isolated.json");
  //data = loadJSON("data-jedit-copy-paste-shorter.json");
  //data = loadJSON("data-imagej-copy-paste-shorter.json");
  //data = loadJSON("data-imagej-copy-paste_parsed.json");
  //data = loadJSON("data-varna-startup-shutdown_parsed.json");
  data = loadJSON("data-varna-copy-paste-isolated_parsed.json");
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  colorMode(HSB);
  //ortho();

  trace = data.draw_trace;
  maxDepth = data.max_depth;
  getLength();
  console.log("Max length: ", maxDepth);
  console.log("Mean length: ", getMeanDepth());
  getAllSuppliersAndDependencies();
  allDeps.sort();
  allSups.sort();
  nDeps = allDeps.length;
  nSups = allSups.length;
  console.log("Number of dependencies: ", nDeps);
  console.log("Numer of suppliers: ", nSups);

  // build the leds arrays
  for (let j = 0; j < Ny; j++) {
    let lineLeft = [], lineRight = [];
    for (let i = 0; i < Nx; i++) {
      lineLeft.push([0, 0, 0]);
      lineRight.push([0, 0, 0]);
    }
    ledsLeft.push(lineLeft);
    ledsRight.push(lineRight);
  }
}

function draw() {
  background(30);

  orbitControl(); // allow movement around the sketch using a mouse or trackpad
  lights(); // add global lights to the scene
  translate(-Nx*s/2, -Ny*s/2); // center the LEDs

  if (frameCount % params.speed == 0) {
    updateLeds();
    t++;
  }

  // Left LEDs
  push();
  translate(-params.separation, 0, 0);
  rotateY(params.angle);
  translate((1-Nx)*s/2, 0, 0);
  drawLEDs(ledsLeft);
  pop();

  // Right LEDs
  push();
  translate(Nx*s+params.separation, 0, 0);
  rotateY(-params.angle);
  translate((1-Nx)*s/2, 0, 0);
  drawLEDs(ledsRight);
  pop();
}

function updateLeds() {
  switch (params.vizStyle) {

    case "In/out":
      for (let i = 0; i < Nx; i++) {
        let tr = trace[(i+t)%len];
        let [sup, dep] = getSupAndDep(tr.name);
        let depth = ~~(tr.depth*Ny/(maxDepth+1));
        for (let j = 0; j < Ny; j++) {
          let huLeft = (allDeps.indexOf(dep)*360/allDeps.length + j*params.hueGradient)%360;
          let huRight = (allSups.indexOf(sup)*360/allSups.length + j*params.hueGradient)%360;
          let sa = 100;
          let br = (j < depth) ? 100 : 0;
          ledsLeft[j][i] = [huLeft, sa, br];
          ledsRight[j][Nx-i-1] = [huRight, sa, br];
        }
      }
      break;

    case "Right/left":
      for (let i = 0; i < Nx; i++) {
        let tr = trace[abs(i-t)%len];
        let [sup, dep] = getSupAndDep(tr.name);
        let depth = ~~(tr.depth*Ny/(maxDepth+1));
        for (let j = 0; j < Ny; j++) {
          let huLeft = (allDeps.indexOf(dep)*360/allDeps.length + j*params.hueGradient)%360;
          let sa = 100;
          let br = (j < depth) ? 100 : 0;
          ledsLeft[j][i] = [huLeft, sa, br];
        }
      }
      for (let i = 0; i < Nx; i++) {
        let tr = trace[abs(i-t+Nx)%len];
        let [sup, dep] = getSupAndDep(tr.name);
        let depth = ~~(tr.depth*Ny/(maxDepth+1));
        for (let j = 0; j < Ny; j++) {
          let huRight = (allSups.indexOf(sup)*360/allSups.length + j*params.hueGradient)%360;
          let sa = 100;
          let br = (j <= depth) ? 100 : 0;
          ledsRight[j][i] = [huRight, sa, br];
        }
      }
      break;

    case "Up/down":
      for (let j = 0; j < Ny; j++) {
        let tr = trace[abs(j+t)%len];
        let [sup, dep] = getSupAndDep(tr.name);
        let depth = ~~(tr.depth*Nx/(maxDepth+1));
        for (let i = 0; i < Nx; i++) {
          let huLeft = (allDeps.indexOf(dep)*360/allDeps.length + i*params.hueGradient)%360;
          let huRight = (allSups.indexOf(sup)*360/allSups.length + i*params.hueGradient)%360;
          let sa = 100;
          let br = (i <= depth) ? 100 : 0;
          ledsLeft[j][Nx-i-1] = [huLeft, sa, br];
          ledsRight[j][i] = [huRight, sa, br];
        }
      }
      break;

  }
}

function drawLEDs(leds) {
  push();
  for (let j = 0; j < Ny; j++) { // y axis
    push();
    for (let i = 0; i < Nx; i++) { // x axis
      let hu, sa, br;
      [hu, sa, br] = leds[j][i];
      fill(hu, sa, br);
      sphere(diam*map(br, 0, 100, 1/2, 1));
      translate(s, 0, 0);
    }
    pop();
    translate(0, s, 0);
  }
  pop();
}



// data analysis 🧮

function getLength() {
  // gets the lengths of data and stores it in variable "len"
  len = Object.keys(trace).length;
}

function getAllSuppliersAndDependencies() {
  // find all suppliers, all dependencies, and save them in the global variables allSups and allDeps
  allSups = [];
  allDeps = [];
  for (let i = 0; i < len; i++) {
    let t = trace[i];
    let [sup, dep] = getSupAndDep(t.name);
    if (allSups.indexOf(sup) == -1) allSups.push(sup);
    if (allDeps.indexOf(dep) == -1) allDeps.push(dep);
  }
}

function getMaxDepth() {
  let max = 0;
  for (let i = 0; i < len; i++) {
    let d = trace[i].depth;
    if (d > max) max = d;
  }
  return max;
}

function getMeanDepth() {
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += trace[i].depth;
  }
  return sum/len;
}

function getSupAndDep(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[method name]"
  // return: an array, the first value is the supplier, the second is the dependency
  let func = (s.indexOf("/") == -1) ? s : s.split("/")[1]; // remove the eventual prefix, find the interesting part
  let idx1 = func.indexOf(".", func.indexOf(".")+1); // find the second occurence of "."
  let idx2 = func.indexOf(".", idx1+1); // find the first occurence of "." after idx1
  let idx3 = func.indexOf("$", idx1+1); // find the first occurence of "$" after idx1
  if (idx3 == -1) idx3 = idx2; // ignore idx3 if there is no "$" found
  let supplier = func.slice(0, idx1); // find the supplier
  let dependency = func.slice(idx1+1, min(idx2, idx3)); // find the supplier
  return [supplier, dependency];
}
