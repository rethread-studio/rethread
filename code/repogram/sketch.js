let data;
let queue = [];

function preload() {
  data = loadJSON("repo_data.json");
}

function setup() {
  //createCanvas(705, 500);
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB, 100);

  //noLoop();
  data.w = width;
  data.h = 0;
  data.x = 0;
  data.y = 0;
  console.log(data);
  queue = [data];
}

function draw() {
  if (queue.length == 0) {
    noLoop();
    console.log("FINISHED");
    return;
  }

  let node = queue.shift();
  drawNode(node);

  if (node.max_depth == 0) return; // leaf

  let max_height = height - node.y - node.h;
  let x = node.x;
  let y = node.y + node.h;
  let children = shuffle(node.children);
  let nChildren = children.length;
  for (let i = 0; i < nChildren; i++) {
    let c = children[i];
    if (!c.explored) {
      c.explored = true;
      c.w = node.w*c.leaves_count/node.leaves_count;
      c.h = max_height/(c.max_depth+1);
      c.x = x;
      c.y = y;
      c.hu = map(c.y+c.h/2, 0, height, 75, 115);
      c.sa = map(i, 0, nChildren, 100, 50);
      c.br = map(c.y+c.h/2, 0, height, 95, 85);
      x += c.w;
      queue.push(c);
    }
  }
}

function drawNode(node) {
  fill(node.hu%100, node.sa, node.br);
  rect(node.x, node.y, node.w, height-node.y);
}
