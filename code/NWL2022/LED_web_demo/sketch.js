const Nx = 10; // number of LEDs in the x-direction
const Ny = 7; // number of LEDs in the y-direction
const Nz = 7; // number of LEDs in the z-direction
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

let currentFrame = 0;
let frames = []; // array containing the Nz frames of the animation (from the new one, the one at the front of the LED cube, to the last one, at the back). Each frame is a Ny*Nx matrix containing an array with the hue, saturation, value of each LED

let slider; // speed slider
let checkbox; // checkbox that determines whether the cube is complete or cut in half
let completeCube = true;

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

  slider = createSlider(1, 20, 3, 1);
  checkbox = createCheckbox('Complete cube', false);
  checkbox.changed(() => completeCube = !completeCube);

  trace = data.draw_trace;
  maxDepth = data.max_depth;
  getLength();
  //maxDepth = getMaxDepth();
  console.log("Max length: ", maxDepth);
  console.log("Mean length: ", getMeanDepth());
  getAllSuppliersAndDependencies();
  allDeps.sort();
  allSups.sort();
  nDeps = allDeps.length;
  nSups = allSups.length;
  console.log("Number of dependencies: ", nDeps);
  console.log("Numer of suppliers: ", nSups);

  // build the frames array
  for (let k = 0; k < Nz; k++) {
    let matrix = [];
    for (let j = 0; j < Ny; j++) {
      let line = [];
      for (let i = 0; i < Nx; i++) {
        line.push([0, 0, 0]);
      }
      matrix.push(line);
    }
    frames.push(matrix);
  }
}

function draw() {
  background(30);

  orbitControl(); // allow movement around the sketch using a mouse or trackpad
  lights(); // add global lights to the scene
  rotateY(PI); // put it in the right direction
  translate((s-Nx*s)/2, (s-Ny*s)/2, (s-Nz*s)/2); // center the cube

  if (frameCount % slider.value() == 0) updateFrames();
  drawLEDs();
}

function updateFrames() {
  let newFrame = [];
  // deep copy of the first frame
  for (let j = 0; j < Ny; j++) {
    let line = [];
    for (let i = 0; i < Nx; i++) {
      let f0 = frames[0][j][i];
      line.push([f0[0], f0[1], f0[2]]);
    }
    newFrame.push(line);
  }

  // modify the new frame with the latest data point
  let t = trace[currentFrame%len];
  let lineIdx = ~~(t.depth*Ny/(maxDepth+1));
  let [sup, dep] = getSupAndDep(t.name);
  let limitI = ~~map(allDeps.indexOf(dep), 0, allDeps.length, 1, Nx/2);
  let hu = allSups.indexOf(sup)*360/allSups.length;
  let sa = 100;
  for (let i = 0; i < Nx; i++) {
    let br = (i < Nx/2 + limitI && i >= Nx/2 - limitI) ? 100 : 0;
    newFrame[lineIdx][i] = [hu, sa, br];
  }
  for (let j = lineIdx+1; j < Ny; j++) {
    for (let i = 0; i < Nx; i++) {
      newFrame[j][i] = [0, 0, 0];
    }
  }

  //console.log(newFrame)

  // add the new frame at the top and delete oldest one
  frames.shift();
  frames.push(newFrame);
  currentFrame++;
}

function drawLEDs() {
  for (let k = 0; k < Nz; k++) { // z axis
    push();
    for (let j = 0; j < Ny; j++) { // y axis
      push();
      for (let i = 0; i < Nx; i++) { // x axis
        let hu, sa, br;
        [hu, sa, br] = frames[k][j][i];
        fill(hu, sa, br);
        if (j+k < (Ny+Nz)/2 || completeCube)
          sphere(diam*map(br, 0, 100, 1/2, 1));
        translate(s, 0, 0);
      }
      pop();
      translate(0, s, 0);
    }
    pop();
    translate(0, 0, s);
  }
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
