// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />



const colorPallete = {
  black: {
    r: 0,
    g: 0,
    b: 0
  },
  green: {
    r: 125,
    g: 250,
    b: 183
  },
  red: {
    r: 201,
    g: 44,
    b: 43
  },
  orange: {
    r: 225,
    g: 170,
    b: 71
  },
  lightBlue: {
    r: 74,
    g: 157,
    b: 224
  },
  darkGreen: {
    r: 101,
    g: 167,
    b: 140
  },
  darkBlue: {
    r: 0,
    g: 31,
    b: 179
  },
  white: {
    r: 100,
    g: 100,
    b: 100
  }
}


// Performance - Disables FES
// p5.disableFriendlyErrors = true;


const positions = {
  row: {
    r1: 38,
    r2: 86,
    r3: 170
  },
  col: {
    c1: 35,
    c2: 115,
    c3: 199,
    c4: 283,
    c5: 314,
  },
  padding: {
    top: 9,
    right: 5,
    botton: 5,
    left: 5,
  }
}

const fontSize = {
  tittle: 28,
  number: 8,
  countries: 12
}

let focusLocation = {
  europe: "EU",
  america: "AME",
  asia: "AS",
  africa: "AF",
  oceanica: "OC"
}

///////////////////////// GUI Element Global Variables///////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////// Global Variables///////////////////////////////////////

let windows = [];
windows.push({ x: 2, y: 0, w: 36, h: 35 });
windows.push({ x: 86, y: 0, w: 36, h: 35 });
windows.push({ x: 170, y: 0, w: 36, h: 35 });

windows.push({ x: 2, y: 66, w: 36, h: 49 });
windows.push({ x: 86, y: 66, w: 36, h: 49 });
windows.push({ x: 170, y: 66, w: 36, h: 49 });

windows.push({ x: 2, y: 150, w: 36, h: 49 });
windows.push({ x: 86, y: 150, w: 36, h: 49 });
windows.push({ x: 170, y: 150, w: 36, h: 49 });

windows.push({ x: 2, y: 234, w: 36, h: 49 });
windows.push({ x: 86, y: 234, w: 36, h: 49 });
windows.push({ x: 170, y: 234, w: 36, h: 49 });

windows.push({ x: 2, y: 316, w: 36, h: 44 });
windows.push({ x: 86, y: 316, w: 36, h: 44 });
windows.push({ x: 170, y: 316, w: 36, h: 44 });

let centerWindow = windows[7];

let columns = [];
columns.push({ x: 38, y: 0, w: 48, h: 360 });
columns.push({ x: 122, y: 0, w: 48, h: 360 });


const canvasSize = {
  width: 208,
  height: 360,
}


let myFont;

const fontURL = 'assets/fonts/Anton-Regular.ttf';

let visualIntro;
/////////////////////////////////////////////////////////////////////////////////////////////

// Preload Function
function preload() {
  myFont = loadFont(fontURL);
} // End Preload


//WEB SOCKET ----------------------------------------------------------------------
let num = 0;
new WebSocketClient().onmessage = (data) => {
  if (num < 10) {
    // console.log(data)
    // console.log(JSON.parse(data.data));
  }
  let internalData = JSON.parse(data.data);


  // if (internalData.remote_location.country == "France") console.log("viva la france")
  //ADD PACKAGES NUMBER


  // addParticle(internalData.len);
  // num++;
};

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  //PIXEL DENSITY TO REMOVE
  pixelDensity(15.0);

  preload();

  visualIntro = new VisualIntro(myFont, positions, fontSize, colorPallete)
  // Create canvas
  canvas = createCanvas(canvasSize.width, canvasSize.height);
  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");


  // Calculate window center points
  for (w of windows) {
    w.center = createVector(w.x + w.w / 2, w.y + w.h / 2);
    w.halfWidthSq = Math.pow(w.w / 2, 2);
    w.halfHeightSq = Math.pow(w.h / 2, 2);
  }

  for (let i = 0; i < windows.length - 2; i++) {
    let center = (windows[i].center.y + windows[i + 1].center.y) / 2;
    // console.log("center: " + ((center / height) - 0.5));
  }

  // background("#000000");

  textFont('sans');
  textSize(28);
  textAlign(CENTER, CENTER);
  textFont(myFont);



} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  clear();
  // background("rgba(0,0,0,1)");

  visualIntro.updateData();
  visualIntro.display();
  // Draw the windows
  fill(50, 100);
  noStroke();
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }



  // Draw text
  colorMode(RGB, 100);
  // fill(100, 100, 100, 100);
  // // text("EURASIA", width / 2, 48);
  // text("STOCKHOLM", width / 2, 129);
  // noStroke();
  // fill(100, 100, 100, 100);
  // rect(32, 121, 2, 24);







} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions
