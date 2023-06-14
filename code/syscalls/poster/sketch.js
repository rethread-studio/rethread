let myFont, qrImg;

let y, h;
let addInfo = true;

function preload() {
  myFont = loadFont("Epilogue-SemiBold.ttf");
  qrImg = loadImage("qr-code.svg");
}

function setup() {
  createCanvas(3508/8, 4961/8, WEBGL);

  let params = getURLParams();
  if (params.pixeldensity != undefined) {
    pixelDensity(parseInt(params.pixeldensity));
  }
  if (params.addinfo != undefined && params.addinfo == "no") {
    addInfo = false;
  }

  h = height/42;
  y = 0;

  background(255);
}

function draw() {
  translate(-width/2, -height/2);
  
  let lineGrph = createGraphics(width, 2*h);
  lineGrph.noStroke();
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
  image(lineGrph, 0, y, width, h, 0, h/2, width, h);
  lineGrph.remove();
  
  y += h;
  if (y > height) {
    noLoop();

    if (addInfo) {
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
  }
}