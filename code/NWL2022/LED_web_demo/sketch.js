const Nx = 5; // number of LEDs in the x-direction
const Ny = 15; // number of LEDs in the y-direction
const diam = 5; // diameter of each sphere (LED)
const s = 25; // space between two spheres

let data; // data from the json
let trace; // array with the trace
let len; // length of the json file, size of data
let maxDepth; // max depth
let allDeps; // array with all dependencies
let allSups; // array with all suppliers
let nDeps; // number of dependencies
let nSups; // number of suppliers

let t = 0; // time
let ledsLeft = [], ledsRight = []; // leds on the left, and on the right. Both are

let speedSlider; // animation speed
let sepSlider; // separation between the two curtains
let angleSlider; // angle they make with the camera plane

// change LEDs on top that don't change much, change hue, brightness, pulse

function preload() {
  //data = loadJSON("data-varna-copy-paste-isolated.json");
  //data = loadJSON("data-jedit-copy-paste-shorter.json");
  //data = loadJSON("data-imagej-copy-paste-shorter.json");
  //data = loadJSON("data-imagej-copy-paste_parsed.json");
  //data = loadJSON("data-varna-startup-shutdown_parsed.json");
  data = loadJSON("data-varna-copy-paste-isolated_parsed.json");
}

function setup() {
  createCanvas(500, 500, WEBGL);
  noStroke();
  colorMode(HSB);
  //frameRate(10)
  //ortho();

  speedSlider = createSlider(1, 20, 3, 1);
  sepSlider = createSlider(0, 64, 0, 1);
  angleSlider = createSlider(0, PI, PI/4, 0.01);

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
  translate(-Nx*s/2, -Ny*s/2);

  if (frameCount % speedSlider.value() == 0) {
    updateLeds();
    t++;
  }

  push();
  translate(-sepSlider.value(), 0, 0);
  rotateY(angleSlider.value());
  translate((1-Nx)*s/2, 0, 0);
  drawLEDs(ledsLeft);
  pop();

  push();
  translate(Nx*s+sepSlider.value(), 0, 0);
  rotateY(-angleSlider.value());
  translate((1-Nx)*s/2, 0, 0);
  drawLEDs(ledsRight);
  pop();
}

function updateLeds() {
  for (let i = 0; i < Nx; i++) {
    let tr = trace[(i+t)%len];
    let [sup, dep] = getSupAndDep(tr.name);
    let depth = ~~(tr.depth*Ny/(maxDepth+1));
    for (let j = 0; j < Ny; j++) {
      let huLeft = allDeps.indexOf(dep)*360/allDeps.length;;
      let huRight = allSups.indexOf(sup)*360/allSups.length;
      let sa = 100;
      let br = (j < depth) ? 100 : 0;
      ledsLeft[j][i] = [huLeft, sa, br];
      ledsRight[j][Nx-i-1] = [huRight, sa, br];
    }
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



// data analysis 🤓

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
