let data;
let queue = []; // queue used for the breadth-first search

// limit values for hue, saturation and brightness
let hu1 = 75, hu2 = 113;
let sa1 = 100, sa2 = 50;
let br1 = 95, br2 = 85;

let fixedWidth = false;
let fixedHeight = false;

function preload() {
  data = loadJSON("repo_data.json");
}

function setup() {
  //createCanvas(705, 500);
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  colorMode(HSB, 100);

  data.w = width;
  data.h = fixedHeight ? height/data.max_depth : height/(data.max_depth + 1);
  data.x = 0;
  data.y = 0;
  data.hu = map(data.y + data.h/2, 0, height, hu1, hu2) % 100;
  data.sa = (sa1 + sa2)/2;
  data.br = map(data.y + data.h/2, 0, height, br1, br2);
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
      c.hu = map(c.y + c.h/2, 0, height, hu1, hu2) % 100;
      c.sa = map(i, 0, nChildren, sa1, sa2);
      c.br = map(c.y + c.h/2, 0, height, br1, br2);
      c.parent = node;
      x += c.w;
      queue.push(c);
    }
  }
}

function drawNode(node) {
  fill(node.hu, node.sa, node.br);
  rect(node.x, node.y, node.w, height - node.y);

  if (node.parent) {
    stroke(90, 42);
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
    noStroke();
  }
}
