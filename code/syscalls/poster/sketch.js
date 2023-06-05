let myFont, qrImg;

function preload() {
  myFont = loadFont("Epilogue-SemiBold.ttf");
  qrImg = loadImage("qr-code.svg");
}

function setup() {
  createCanvas(3508/8, 4961/8, WEBGL);
  noLoop();

  let params = getURLParams();
  if (params.pixeldensity != undefined) {
    pixelDensity(parseInt(params.pixeldensity));
  }
}

function draw() {
  background(255);
  translate(-width/2, -height/2);
  
  let h = height/42;
  let lineGrph = createGraphics(width, 3*h);
  lineGrph.noStroke();
  for (let y = 0; y < height; y += h) {
    lineGrph.blendMode(BLEND);
    lineGrph.background(0);
    lineGrph.blendMode(ADD);
    let w = width/pow(2, ~~random(1, 7));
    let factor = random(1/4, 3/4);
    let offset = sq(w)/1000*random([-1, 1]);
    for (let x = -random(w); x < width+w; x += w) {
      lineGrph.fill(255, 0, 0);
      lineGrph.rect(x, 0, w*factor, lineGrph.height);
      lineGrph.fill(0, 255, 255);
      lineGrph.rect(x+offset, 0, w*factor, lineGrph.height);
    }
    lineGrph.filter(BLUR, abs(offset*random(0.9, 1.1))/8*pixelDensity());
    image(lineGrph, 0, y, width, h, 0, h, width, h);
  }
  lineGrph.remove();
  
  fill(255);
  noStroke();
  rect(0, 20*h, width, h);
  fill(0);
  rect(0, 21*h, width, h);
  
  textFont(myFont, h*2/3);
  textAlign(CENTER, CENTER);
  fill(0);
  text("sys|calls, by Jaime Reyes & re|thread", width/2, height/2-h/2-h/20);
  fill(255);
  text("June 15, 17 & 18, Turbine Hall, KTH", width/2, height/2+h/2-h/20);

  let qrSize = 4*h;
  fill(0);
  rect(width-qrSize, height-qrSize-h, qrSize, h);
  fill(255);
  textSize(h/2);
  text("Info & sign up", width-qrSize/2, height-qrSize-h/2-h/20);
  image(qrImg, width-qrSize, height-qrSize, qrSize, qrSize);
}