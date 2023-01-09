// Inspiration:
// https://en.wikipedia.org/wiki/Dendrogram

let data;
let queue = [];
let mySize;

// parameters
let diskOffset = 1; // 0 => perfect disk, 1 => deformed disk
let backgroundCol = 98;

function preload() {
  data = loadJSON("../data/repo_data.json");
}

function setup() {
  //createCanvas(705, 500);
  createCanvas(windowWidth, windowHeight);
  mySize = min(width, height)*0.8;
  colorMode(HSB, 100);
  noFill();
  background(backgroundCol);
  
  //noLoop();
  data.x = width/2;
  data.y = height/2;
  data.start = 0;
  data.end = TAU;
  data.diam = 0;
  data.depth = 0;
  //console.log(data);
  queue = [data];
}

function draw() {
  if (queue.length == 0) {
    noLoop();
    console.log("Finished in "+frameCount+" frames.");
    return;
  }
  
  let node = queue.shift();
  if (frameCount > 1) drawNode(node);
  
  if (node.max_depth == 0) return; // leaf
  
  let thetaStep = (node.end-node.start)/node.leaves_count;
  let theta = node.start;
  let children = node.children;
  shuffle(children, true);
  let nChildren = children.length;
  let max_diam = mySize - node.diam;
  let hu1 = 70, hu2 = 116;
  //hu1 = 115;
  //hu2 = hu1 - (node.depth+1)/data.max_depth*100;
  if (node.depth % 2 == 0) [hu1, hu2] = [hu2, hu1];
  for (let i = 0; i < nChildren; i++) {
    let c = children[i];
    if (!c.explored) {
      c.explored = true;
      c.parent = node;
      c.start = theta;
      c.end = theta+thetaStep*c.leaves_count;
      c.middle = (c.start+c.end)/2;
      c.width = max_diam/(c.max_depth + diskOffset);
      c.diam = node.diam + c.width;
      c.hu = map(theta, node.start, node.end, hu1, hu2)%100;
      c.sa = 90;
      c.br = 90;
      c.depth = node.depth + 1;
      c.parent = node;
      theta += thetaStep*c.leaves_count;
      queue.push(c);
    }
  }
}

function drawNode(node) {
  let x1 = width/2 + (node.parent.diam - node.parent.width)/2*cos(node.parent.middle);
  let y1 = height/2 + (node.parent.diam - node.parent.width)/2*sin(node.parent.middle);
  let x2 = width/2 + (node.parent.diam - node.parent.width/2)/2*cos(node.parent.middle);
  let y2 = height/2 + (node.parent.diam - node.parent.width/2)/2*sin(node.parent.middle);
  let x3 = width/2 + (node.parent.diam - node.parent.width/2)/2*cos(node.middle);
  let y3 = height/2 + (node.parent.diam - node.parent.width/2)/2*sin(node.middle);
  let x4 = width/2 + (node.parent.diam)/2*cos(node.middle);
  let y4 = height/2 + (node.parent.diam)/2*sin(node.middle);
  
  stroke(node.hu, node.sa, node.br);
  bezier(x1, y1, x2, y2, x3, y3, x4, y4);
}