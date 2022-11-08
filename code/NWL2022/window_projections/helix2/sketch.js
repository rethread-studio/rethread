let data;
let trace_len; // length of trace
let w, h; // width and height of each rectangle
let hGap; // gap between rectangles vertically
let wMargin; // margin on the sides

let scale;
const WINDOW_WIDTH = 57;
const WINDOW_HEIGHT = 112;
let mWindows = 1; // how many windows in width
let nWindows = 2; // how many windows in height
let showWindowFrame = true, orthoMode = false, showText = true;

let allDeps; // array with all dependencies
let allSups; // array with all suppliers
let nDeps; // number of dependencies
let nSups; // number of suppliers

let cnv, ctx; // canvas and its context

let myFont;
let keywords = ["copy", "paste", "search", "replace", "find", "write"];

function preload() {
  //data = loadJSON("../../LED_web_demo/data-imagej-copy-paste_parsed.json");
  //data = loadJSON("../../LED_web_demo/data-varna-startup-shutdown_parsed.json");
  data = loadJSON("../../LED_web_demo/data-varna-copy-paste-isolated_parsed.json");
  myFont = loadFont("../helix/IBMPlexMono-Medium.ttf");
}

function setup() {
  determineScale();
  cnv = createCanvas(WINDOW_WIDTH*mWindows*scale, WINDOW_HEIGHT*nWindows*scale, WEBGL);
  if (orthoMode) ortho();
  noStroke();
  colorMode(HSB);
  ctx = canvas.getContext("webgl");

  //console.log(data)
  trace_len = data.draw_trace.length;
  wMargin = WINDOW_WIDTH*scale/10;

  centerCanvas();
  initParams();

  getAllSuppliersAndDependencies();
  allDeps.sort();
  allSups.sort();
  nDeps = allDeps.length;
  nSups = allSups.length;

  textFont(myFont);
  textAlign(LEFT, CENTER);

  console.log("Instructions:\n- arrow keys to change window dimensions\n- space to show/hide window separations\n- p to change projection mode\n- t to show/hide text keywords");
}

function draw() {
  background(0);
  translate(-width/2, -height/2);

  let t = frameCount/2;
  let x = wMargin, y = -t%h-height/3, i = floor(t/h);
  while (y < height+height/3) {
    let d = data.draw_trace[(i++)%trace_len];
    let [sup, dep] = getSupAndDep(d.name);
    let hu1 = 360*allDeps.indexOf(dep)/allDeps.length;
    let hu2 = 360*allSups.indexOf(sup)/allSups.length;
    let sa = 90;
    let va = 90;

    push();

    translate(x+w/2, y+h/2, 0);
    rotateY(frameCount/50 + y/50);

    fill(94);
    rotateX(3*PI/2);
    cylinder(h/5, w-2*wMargin);
    rotate(PI/2);

    push();
    fill(hu1, sa, va);
    translate(-w/2+wMargin, 0);
    sphere(h/2);
    fill(hu2, sa, va);
    translate(w-2*wMargin, 0);
    sphere(h/2);
    pop();

    if (showText) {
      rotateX(-3*PI/2);
      let funcName = getActualName(d.name);
      for (let wo of keywords) {
        let idx = funcName.toLowerCase().indexOf(wo);
        if (idx >= 0) {
          fill(94);
          text(wo, w/2-wMargin/2+h/4, -hGap*2);
          /*
          translate(0, -hGap, 10);
          text(wo, 0, 0);
          translate(0, 0, -20);
          text(wo, 0, 0);
          */
          break;
        }
      }
    }

    pop();

    y += h;
  }

  //console.log(frameRate());
  if (showWindowFrame) drawWindowsOutline();
}

function determineScale() {
  scale = windowHeight/(WINDOW_HEIGHT*nWindows);
}

function initParams() {
  w = width-wMargin*2;
  h = 20;
  hGap = h/8;
  textSize(h);
}

function centerCanvas() {
  // centering canvas
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  cnv.position(x, y);
}

function drawWindowsOutline() {
  stroke(255);
  strokeWeight(2);
  for (let x = WINDOW_WIDTH*scale; x < width; x += WINDOW_WIDTH*scale) {
    line(x, 0, 0, x, height, 0);
  }
  for (let y = WINDOW_HEIGHT*scale; y < height; y += WINDOW_HEIGHT*scale) {
    line(0, y, 0, width, y, 0);
  }
  noStroke();
}

function getSupAndDep(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[actual function name]"
  // return: an array, the first value is the supplier, the second is the dependency
  let func = (s.indexOf("/") == -1) ? s : s.split("/")[1]; // remove the eventual prefix, find the interesting part
  let idx1 = func.indexOf(".", func.indexOf(".")+1); // find the second occurence of "."
  let idx2 = func.indexOf(".", idx1+1); // find the first occurence of "." after idx1
  let idx3 = func.indexOf("$", idx1+1); // find the first occurence of "$" after idx1
  if (idx3 == -1) idx3 = idx2; // ignore idx3 if there is no "$" found
  let supplier = func.slice(0, idx1); // find the supplier
  let dependency = func.slice(idx1+1, min(idx2, idx3)); // find the dependency
  return [supplier, dependency];
}

function getAllSuppliersAndDependencies() {
  // find all suppliers, all dependencies, and save them in the global variables allSups and allDeps
  allSups = [];
  allDeps = [];
  for (let i = 0; i < trace_len; i++) {
    let t = data.draw_trace[i];
    let [sup, dep] = getSupAndDep(t.name);
    if (allSups.indexOf(sup) == -1) allSups.push(sup);
    if (allDeps.indexOf(dep) == -1) allDeps.push(dep);
  }
}

function getActualName(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[actual function name]"
  // return: the actual name of the function
  return s.slice(s.lastIndexOf(".")+1, s.length);
}

function keyPressed() {
  if (key == " ") {
    showWindowFrame = !showWindowFrame;
    return;
  }
  if (keyCode == LEFT_ARROW && mWindows > 1) mWindows--;
  if (keyCode == RIGHT_ARROW && mWindows < 4) mWindows++;
  if (keyCode == DOWN_ARROW && nWindows > 1) nWindows--;
  if (keyCode == UP_ARROW && nWindows < 3) nWindows++;
  if (key == "p") orthoMode = !orthoMode; // "p" like "projection"
  if (key == "t") showText = !showText;
  windowResized();
}

function windowResized() {
  determineScale();
  resizeCanvas(WINDOW_WIDTH*mWindows*scale, WINDOW_HEIGHT*nWindows*scale);
  centerCanvas();
  initParams();
  if (orthoMode) ortho();
}
