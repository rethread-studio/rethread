const Nx = 10; // number of LEDs in the x-direction
const Ny = 7; // number of LEDs in the y-direction
const Nz = 7; // number of LEDs in the z-direction
const diam = 5; // diameter of each sphere (LED)
const s = 25; // space between two spheres

let data; // data from the json
let len; // length of the json file, size of data
let maxLength; // max value of length
let allDeps; // array with all dependencies
let allSups; // array with all suppliers
let nDeps; // number of dependencies
let nSups; // number of suppliers

function preload() {
  //data = loadJSON("data-varna-copy-paste-isolated.json", getLength);
  //data = loadJSON("data-jedit-copy-paste-shorter.json", getLength);
  data = loadJSON("data-imagej-copy-paste-shorter.json", getLength);
}

function setup() {
  createCanvas(500, 500, WEBGL);
  noStroke();
  colorMode(HSB);
  //ortho();
  
  //console.log(getAllSuppliers());
  //console.log(getStacktrace(0));
  
  maxLength = getMaxLength();
  console.log("Max length: ", getMaxLength());
  console.log("Mean length: ", getMeanLength());
  allDeps = getAllDependencies().sort();
  allSups = getAllSuppliers().sort();
  nDeps = allDeps.length;
  nSups = allSups.length;
  console.log("Number of dependencies: ", nDeps);
  console.log("Numer of suppliers: ", nSups);
}

function draw() {
  background(30);
  
  orbitControl(); // allow movement around the sketch using a mouse or trackpad
  lights(); // add lights to the scene
  //rotateX(PI/12);
  //rotateY(PI/12);
  translate((s-Nx*s)/2, (s-Ny*s)/2, (s-Nz*s)/2); // center the cube
  
  
  drawLEDs();
}

function drawLEDs() {
  for (let k = 0; k < Nz; k++) { // z axis
    let idx = abs(k-~~(frameCount/3))%len;
    let d = data[idx];
    let st = getStacktrace(idx);
    push();
    for (let j = 0; j < Ny; j++) { // y axis
      let limitJ = ~~(d.length*j/Ny);
      let call = st[~~(d.length*j/Ny)];
      let [supplier, dependency] = getSupAndDep(call);
      let limitI = ~~map(allDeps.indexOf(dependency), 0, allDeps.length, 1, Nx/2);
      push();
      for (let i = 0; i < Nx; i++) { // x axis
        //let hu = (cos(3*i/Nx + frameCount/15)+1)*128;
        //let sa = (cos(3*j/Ny + frameCount/15)+1)*128;
        //let br = (cos(3*k/Nz + frameCount/15)+1)*128;
        
        let hu = allSups.indexOf(supplier)*255/allSups.length;
        let sa = 255;
        let br = (i < Nx/2 + limitI && i >= Nx/2 - limitI) ? 255 : 0;
        fill(hu, sa, br);
        sphere(diam*map(br, 0, 255, 1/2, 1));
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
  len = Object.keys(data).length;
}

function countCalleeCaller(callee, caller) {
  // find how many have that particular callee and caller, and find their max and min length
  let count = 0;
  let min = 50, max = 0;
  for (let i = 0; i < len; i++) {
    let d = data[i];
    if (d.callee.fqn == callee && d.caller.fqn == caller) {
      count++;
      let l = d.length;
      if (l < min) min = l;
      if (l > max) max = l;
    }
  }
  console.log(count);
  console.log("Min length: ", min);
  console.log("Max length: ", max);
}

function getAllSuppliers() {
  // find all suppliers
  let allSuppliers = [];
  for (let i = 0; i < len; i++) {
    let d = data[i];
    let sup1 = d.callee.supplier, sup2 = d.caller.supplier;
    if (allSuppliers.indexOf(sup1) == -1) allSuppliers.push(sup1);
    if (allSuppliers.indexOf(sup2) == -1) allSuppliers.push(sup2);
    
    // check in the stacktrace as well
    let stacktrace = getStacktrace(i);
    for (let s of stacktrace) {
      let func = (s.indexOf("/") == -1) ? s : s.split("/")[1]; // find the function
      let idx = func.indexOf(".", func.indexOf(".")+1); // find the second occurence of "."
      let sup = func.slice(0, idx); // find the supplier
      if (allSuppliers.indexOf(sup) == -1) allSuppliers.push(sup);
    }
  }
  return allSuppliers;
}

function countStacktrace(stacktrace) {
  // count how many have that particular stacktrace
  let count = 0;
  let min = 50, max = 0;
  for (let i = 0; i < len; i++) {
    let d = data[i];
    if (d.stackTrace == stacktrace) {
      count++;
    }
  }
  console.log(count);
}

function getStacktrace(i) {
  // get the stacktrace of element i in a proper javascript array
  let el = data[i];
  let stackTrace = el.stackTrace;
  stackTrace = stackTrace.substring(1, stackTrace.length-1).split(", ");
  return stackTrace;
}

function getAllDependencies() {
  // find all dependencies
  let allDependencies = [];
  for (let i = 0; i < len; i++) {
    let d = data[i];
    let dep1 = d.callee.dependency, dep2 = d.caller.dependency;
    if (allDependencies.indexOf(dep1) == -1) allDependencies.push(dep1);
    if (allDependencies.indexOf(dep2) == -1) allDependencies.push(dep2);
    
    // check in the stacktrace as well
    let stacktrace = getStacktrace(i);
    for (let s of stacktrace) {
      let func = (s.indexOf("/") == -1) ? s : s.split("/")[1]; // find the function
      let idx1 = func.indexOf(".", func.indexOf(".")+1); // find the second occurence of "."
      let idx2 = func.indexOf(".", idx1+1); // find the first occurence of "." after idx1
      let idx3 = func.indexOf("$", idx1+1); // find the first occurence of "$" after idx1
      if (idx3 == -1) idx3 = idx2; // ignore idx3 if there is no "$" found
      let dep = func.slice(idx1+1, min(idx2, idx3)); // find the supplier
      if (allDependencies.indexOf(dep) == -1) allDependencies.push(dep);
    }
  }
  return allDependencies;
}

function getMaxLength() {
  let max = 0;
  for (let i = 0; i < len; i++) {
    let l = data[i].length;
    if (l > max) max = l;
  }
  return max;
}

function getMeanLength() {
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += data[i].length;
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