// Inspiration:
// https://observablehq.com/@d3/icicle

let data;
let queue = []; // queue used for the breadth-first search

// limit values for saturation and brightness
let palette, colScale;
let sa1 = 0.9, sa2 = 0.5;
let br1 = 0.9, br2 = 0.7;

// parameters
let fixedWidth = false;
let fixedHeight = false;
let strokeCol = 90;
// editable via the URL
let drawLines = true;

function preload() {
  data = loadJSON("../data/repo_data.json");
  palette = loadStrings("../palette.txt");
}

function setup() {
  let params = getURLParams();
  if (params.lines != undefined && params.lines == "no") {
    drawLines = false;
  }
  let w = (params.width != undefined) ? params.width : windowWidth;
  let h = (params.height != undefined) ? params.height : windowHeight;
  createCanvas(w, h, WEBGL);

  if (params.width != undefined || params.height != undefined) pixelDensity(1);
  colorMode(HSB, 100);

  palette = palette[0].split(",");
  colScale = chroma.bezier(palette);

  data.w = width;
  data.h = fixedHeight ? height/data.max_depth : height/(data.max_depth + 1);
  data.x = 0;
  data.y = 0;
  data.col = colScale(map(data.y, 0, height, 0, 1)).hex();
  data.sa = sa1*1/2 + sa2*1/2;
  data.br = br1;
  //console.log(data);
  queue = [data];
}

function draw() {
  translate(-width/2, -height/2);

  if (queue.length == 0) {
    noLoop();
    console.log("Finished in "+frameCount+" frames.");
    return;
  }

  let node = queue.shift();
  drawNode(node);

  if (node.max_depth == 0) return; // leaf

  let max_height = height - node.y - node.h;
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
      c.h = fixedHeight ? height/data.max_depth : max_height/(c.max_depth + 1);
      c.x = x;
      c.y = y;
      let sa = map(i, 0, nChildren, sa1, sa2);
      let br = map(c.y, 0, height, br1, br2);
      c.col = colScale(map(c.y, 0, height, 0, 1)).set("hsv.s", sa).set("hsv.v", br).hex();
      c.parent = node;
      x += c.w;
      queue.push(c);
    }
  }
}

function drawNode(node) {
  noStroke();
  fill(node.col);
  rect(node.x, node.y, node.w, height - node.y);

  if (drawLines && node.parent) {
    stroke(strokeCol, 42);
    noFill();
    let x1 = node.parent.x + node.parent.w/2;
    let y1 = node.parent.y;
    let x2 = x1;
    let y2 = y1 + node.parent.h/2;
    let x3 = node.x + node.w/2;
    let y3 = node.y - node.parent.h/2;
    let x4 = x3;
    let y4 = y3 + node.parent.h/2;
    bezier(x1, y1, x2, y2, x3, y3, x4, y4);
  }
}
