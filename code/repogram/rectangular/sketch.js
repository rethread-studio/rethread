// Inspiration:
// https://observablehq.com/@d3/icicle

let data;
let queue = []; // queue used for the breadth-first search
let cnv;

// limit values for saturation and brightness
let palette, colScale;
let sa1 = 0.9, sa2 = 0.5;
let br1 = 0.9, br2 = 0.7;

// parameters
let fixedWidth = false;
let fixedHeight = false;
let strokeCol = 90;

let params;
// editable via the URL
let drawLines = false;

let infoButton;

// from https://phpcoder.tech/check-if-folder-file-exists-using-javascript/
function checkFileExist(urlToFile) {
  var xhr = new XMLHttpRequest();
  xhr.open('HEAD', urlToFile, false);
  xhr.send();
   
  if (xhr.status == "404") {
      return false;
  } else {
      return true;
  }
}

function preload() {
  if (checkFileExist("code/repogram/data/repo_data.json")) {
    // it's run from the main index.html, rethread.art
    data = loadJSON("code/repogram/data/repo_data.json");
    palette = loadStrings("code/repogram/palette.txt");
    infoButton = createButton("?");
    infoButton.style("color", "white");
    infoButton.style("padding-left", "1em");
    infoButton.style("padding-right", "1em");
    infoButton.mousePressed(() => {if (mouseButton === LEFT) window.open("https://github.com/castor-software/rethread/blob/master/code/repogram/README.md")});
  } else {
    // the sketch is run from its folder
    data = loadJSON("../data/repo_data.json");
    palette = loadStrings("../palette.txt");
  }
}

function setup() {
  params = getURLParams();
  if (params.lines != undefined && params.lines == "yes") {
    drawLines = true;
  }

  let header = select("header");
  let aspect_ratio = header ? header.height/header.width : windowHeight/windowWidth;
  let w = (params.width != undefined) ? params.width : document.documentElement.clientWidth;
  let h = (params.height != undefined) ? params.height : w*aspect_ratio;
  cnv = createCanvas(w, h, WEBGL);
  if (header) cnv.parent("header");
  cnv.position(0, 0);

  if (params.width != undefined || params.height != undefined) pixelDensity(1);
  colorMode(HSB, 100);

  palette = palette[0].split(",");
  colScale = chroma.bezier(palette);

  data.w = 1;
  data.h = fixedHeight ? 1/data.max_depth : 1/(data.max_depth + 1);
  data.x = 0;
  data.y = 0;
  data.col = colScale(map(data.y, 0, height, 0, 1)).hex();
  data.sa = sa1*1/2 + sa2*1/2;
  data.br = br1;
  //console.log(data);
  queue = [data];
}

function draw() {
  if (infoButton) infoButton.position(width - 50, 13);
  translate(-width/2, -height/2);

  if (queue.length == 0) {
    noLoop();
    console.log("repogram finished in "+frameCount+" frames.");
    return;
  }

  let node = queue.shift();
  drawNode(node);

  if (node.max_depth == 0) return; // leaf

  let max_height = 1 - node.y - node.h;
  let x = node.x;
  let y = node.y + node.h;
  let children = shuffle(node.children);
  //children.sort((n1, n2) => (n2.leaves_count - n1.leaves_count));
  let nChildren = children.length;

  for (let i = 0; i < nChildren; i++) {
    let c = children[i];
    if (!c.explored) {
      c.explored = true;
      c.w = fixedWidth ? node.w/node.children.length : node.w*c.leaves_count/node.leaves_count;
      c.h = fixedHeight ? 1/data.max_depth : max_height/(c.max_depth + 1);
      c.x = x;
      c.y = y;
      let sa = map(i, 0, nChildren, sa1, sa2);
      let br = map(c.y, 0, height, br1, br2);
      c.col = colScale(map(c.y, 0, 1, 0, 1)).set("hsv.s", sa).set("hsv.v", br).hex();
      c.parent = node;
      x += c.w;
      queue.push(c);
    }
  }
}

function drawNode(node) {
  noStroke();
  fill(node.col);
  rect(node.x*width, node.y*height, node.w*width, (1 - node.y)*height);

  if (drawLines && node.parent) {
    let x1 = node.parent.x + node.parent.w/2;
    let y1 = node.parent.y;
    let x2 = x1;
    let y2 = y1 + node.parent.h/2;
    let x3 = node.x + node.w/2;
    let y3 = node.y - node.parent.h/2;
    let x4 = x3;
    let y4 = y3 + node.parent.h/2;
    stroke(strokeCol, 42);
    noFill();
    bezier(x1, y1, x2, y2, x3, y3, x4, y4);
  }
}

function windowResized() {
  let header = select("header");
  let aspect_ratio = header ? header.height/header.width : windowHeight/windowWidth;
  let w = (params.width != undefined) ? params.width : document.documentElement.clientWidth;
  let h = (params.height != undefined) ? params.height : w*aspect_ratio;
  let pg = createGraphics(width, height);
  pg.image(cnv, 0, 0)
  resizeCanvas(w, h);
  image(pg, 0, 0, w, h);
  pg.remove();
}
