// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

//LIST OF COUNTRIES IN EUROPEAN UNION
const eu_countries = [
  "Sweden",
  "France",
  "Belgium",
  "Austria",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
]

const ame_countries = [
  "Brazil",
  "United States",
  "Mexico",
  "Colombia",
  "Argentina",
  "Canada",
  "Canada",
  "Peru",
  "Venezuela",
  "Chile",
  "Ecuador",
  "Guatemala",
  "Cuba",
  "Bolivia",
  "Haiti",
  "Dominican Republic",
  "Honduras",
  "Paraguay",
  "Nicaragua",
  "El Salvador",
  "Costa Rica",
  "Panama",
  "Uruguay",
  "Jamaica",
  "Bahamas",
  "Belize",
]



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

let SINGLE_COLOR = true;

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

let continentActivity = {
  africa: 0,
  eurasia: 0,
  oceania: 0,
  americas: 0,
};

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
  number: 10,
  countries: 12
}


let dashBoard;
let countryManager;

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

const MAX_PARTICLE_COUNT = 250;
let particles = [];
const NUM_TRAILS = 10;

const canvasSize = {
  width: 208,
  height: 360,
}
var canvasX = 208;
var canvasY = 360;

let lastChange = Date.now();


let myFont;
const fontURL = 'assets/fonts/Anton-Regular.ttf';

const test_country = [
  "Sweden",
  "Belgium",
  "France",
  "Netherlands",
  "Spain"

]

let selectedRegion = test_country;
let focusRegion = focusLocation.europe;

// let selectedRegion = ame_countries;
// let focusRegion = focusLocation.america;
//
document.body.addEventListener("keydown", (event) => {
  switch (event.keyCode) {
    case 37:
      console.log("Left key pressed");
      selectedRegion = ame_countries;
      focusRegion = focusLocation.america;
      break;
    case 38:
      console.log("Up key pressed");
      break;
    case 39:
      console.log("Right key pressed");
      selectedRegion = eu_countries;
      focusRegion = focusLocation.europe;
      break;
    case 40:
      console.log("Down key pressed");
      break;
  }
});

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
  let continent;
  if (internalData.remote_location.country != "Sweden"
    && internalData.remote_location.country != undefined) {
    lastCountry = internalData.remote_location.country;
    continent = internalData.remote_location.continent;
  } else if (internalData.local_location.country != "Sweden"
    && internalData.local_location.country != undefined) {
    lastCountry = internalData.local_location.country;
    continent = internalData.local_location.continent;
  }

  if (continent == "Europe" || continent == "Asia") {
    continentActivity.eurasia += 1;
  } else if (continent == "Americas") {
    continentActivity.americas += 1;
  } else if (continent == "Oceania") {
    continentActivity.oceania += 1;
  } else if (continent == "Africa") {
    continentActivity.africa += 1;
  }
  // if (internalData.remote_location.country == "France") console.log("viva la france")
  //ADD PACKAGES NUMBER
  if (dashBoard != null && isInCountries(internalData.remote_location.country, selectedRegion)) {
    dashBoard.addSize(internalData.len);
    dashBoard.addPackage()
    countryManager.addPackage(internalData.remote_location.country)
  };

  // addParticle(internalData.len);
  // num++;
};

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  //PIXEL DENSITY TO REMOVE
  pixelDensity(15.0);


  // Create canvas
  canvas = createCanvas(canvasX, canvasY);
  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");

  //CREATE DASHBOARD
  dashBoard = new DashBoard(fontURL, colorPallete, positions, focusRegion, fontSize)
  //CRATE COUNTRY MANAGE
  countryManager = new CountryManager(selectedRegion, fontURL, fontSize, positions, colorPallete);

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

  background("#000000");

  textFont('sans');
  textSize(28);
  textAlign(CENTER, CENTER);
  textFont(myFont);

  // create and initialize the shader
  // shaderGraphics = createGraphics(canvasX, canvasY, WEBGL);
  // shaderGraphics.noStroke();
  // backgroundShader = shaderGraphics.createShader(vertexShader, backgroundFragShader());

  // backgroundShader.setUniform("iResolution", [width, height]);
  // backgroundShader.setUniform("iTime", millis() / 1000.0);
  // backgroundShader.setUniform("leftColor", [0.5, 0.6, 0.9]);

  // Set canvas framerate
  // frameRate(25);

} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  // Clear if needed
  // clear();

  // Set canvas background
  background("rgba(0,0,0,1)");

  // let continentActivityCoeff = 0.95;
  // continentActivity.eurasia = Math.min(continentActivity.eurasia * continentActivityCoeff, 200);
  // continentActivity.africa = Math.min(continentActivity.africa * continentActivityCoeff, 200);
  // continentActivity.americas = Math.min(continentActivity.americas * continentActivityCoeff, 200);
  // continentActivity.oceania = Math.min(continentActivity.oceania * continentActivityCoeff, 200);

  // // Draw shader
  // backgroundShader.setUniform("iResolution", [width, height]);
  // backgroundShader.setUniform("iTime", millis() / 1000.0);
  // backgroundShader.setUniform("eurasia", continentActivity.eurasia);
  // backgroundShader.setUniform("africa", continentActivity.africa);
  // backgroundShader.setUniform("oceania", continentActivity.oceania);
  // backgroundShader.setUniform("americas", continentActivity.americas);
  // shaderGraphics.shader(backgroundShader);
  // shaderGraphics.rect(0, 0, width, height);
  // // shaderGraphics.quad(-1, -1, 1, -1, 1, 1, -1, 1);

  // // Draw the shader to main canvas
  // image(shaderGraphics, 0, 0, width, height);

  //UPDATE DASHBOARD
  dashBoard.updateData();
  dashBoard.display();
  //UPDATE COUNTRY MANAGER
  countryManager.updateData();
  countryManager.display();

  // Draw the windows
  fill(50, 100);
  noStroke();
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

  let now = Date.now(); // current time in milliseconds
  if (now - lastChange > 10000) {
    centerWindow = windows[Math.floor(Math.random() * windows.length)];
    lastChange = Date.now();
  }

  // Draw text
  colorMode(RGB, 100);
  // fill(100, 100, 100, 100);
  // // text("EURASIA", width / 2, 48);
  // text("STOCKHOLM", width / 2, 129);
  // noStroke();
  // fill(100, 100, 100, 100);
  // rect(32, 121, 2, 24);




  if (Math.random() > 0.997) {
    SINGLE_COLOR = !SINGLE_COLOR;
  }

  // fill(255, 100, 50, 50);
  // rect(centerWindow.x, centerWindow.y, centerWindow.w, centerWindow.h);
} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

function isInCountries(country, countries) {
  return countries.includes(country);
}