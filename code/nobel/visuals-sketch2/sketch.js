// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

let SINGLE_COLOR = true;

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

let continentActivity = {
  africa: 0,
  eurasia: 0,
  oceania: 0,
  americas: 0,
};

let num = 0;
new WebSocketClient().onmessage = (data) => {
  if(num < 10) {
    console.log(data)
    console.log(JSON.parse(data.data));
  }
  let internalData = JSON.parse(data.data);
  let continent;
  if(internalData.remote_location.country != "Sweden"
  && internalData.remote_location.country != undefined) {
    lastCountry = internalData.remote_location.country;
    continent = internalData.remote_location.continent;
  } else if(internalData.local_location.country != "Sweden"
  && internalData.local_location.country != undefined) {
    lastCountry = internalData.local_location.country;
    continent = internalData.local_location.continent;
  }

  if(continent == "Europe" || continent == "Asia") {
    continentActivity.eurasia += 1;
  } else if(continent == "Americas") {
    continentActivity.americas += 1;
  } else if(continent == "Oceania") {
    continentActivity.oceania += 1;
  } else if(continent == "Africa") {
    continentActivity.africa += 1;
  }
  
    
  addParticle(internalData.len);
  num++;
};
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
columns.push({x: 38, y: 0, w: 48, h: 360});
columns.push({x: 122, y: 0, w: 48, h: 360});

const MAX_PARTICLE_COUNT = 250;
let particles = [];
const NUM_TRAILS = 10;

var canvasX = 208;
var canvasY = 360;

var inc = 0.15;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var flowfield;

let lastChange = Date.now();

let lastCountry = "";

let myFont;

////////////////////////////////////////////////////////////////////////////////////
// SHADER

const varying = 'precision highp float; varying vec2 vPos;';

const vertexShader = varying + `

attribute vec3 aPosition;

// Always include this to get the position of the pixel and map the shader correctly onto the shape

void main() {

  // Copy the position data into a vec4, adding 1.0 as the w parameter
  vec4 positionVec4 = vec4(aPosition, 1.0);

  // Scale to make the output fit the canvas
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0; 

  // Send the vertex information on to the fragment shader
  gl_Position = positionVec4;
}
`;

function backgroundFragShader() {
    return varying + `  
    uniform float iTime;
    uniform vec3 iResolution;
    uniform vec3 leftColor;
    uniform float brightness;

    uniform float eurasia;
    uniform float africa;
    uniform float americas;
    uniform float oceania;
  
  mat2 rotate(float a){
      float c=cos(a),s=sin(a);
      return mat2(c,-s,s,c);
  }
  
  float random (in vec2 _st) {
      return fract(sin(dot(_st.xy,
                           vec2(12.9898,78.233)))*
          43758.5453123);
  }

  float band (in float brightness, in vec2 p, in vec2 uv) {
    vec2 j = (p - vec2(0, uv.y))*2.;
    // float sparkle = 1./max(dot(j, j), .005);
    float sparkle = pow(min((1./(dot(j, j))*0.00001 * brightness), 1.), 0.4);
    return sparkle;//(sin(fract(p.x)*1000.)*.5+.5); // fract around position fixes bounding box artefact
  }

  
  void main() {
      vec2 st = (gl_FragCoord.xy/iResolution.xy)-.5;
      float t = iTime;
      float pct = 0.;

      // Random brightness
      // pct += band(sin(t)*20.+20., vec2(0., 0.36), st);
      // pct += band(sin(t*0.8 + 0.2343)*20.+20., vec2(0., 0.13), st);
      // pct += band(sin(t*0.7 + .63)*20.+20., vec2(0., -0.101), st);
      // pct += band(sin(t*0.68 + 2.582)*20.+20., vec2(0., -0.333), st);

      // brightness from data
      pct += band(eurasia, vec2(0., 0.36), st);
      pct += band(africa, vec2(0., 0.13), st);
      pct += band(americas, vec2(0., -0.101), st);
      pct += band(oceania, vec2(0., -0.333), st);

      vec3 col = vec3(1.0, 0.3, 0.2) * pct;

      gl_FragColor = vec4(col, 1.0);
  }
    `;
}
let backgroundShader;
let shaderGraphics;

/////////////////////////////////////////////////////////////////////////////////////////////

// Preload Function
function preload() {
  myFont = loadFont('assets/fonts/InconsolataSemiExpanded-Light.ttf');
} // End Preload

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  // Create canvas
  canvas = createCanvas(canvasX, canvasY);

  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");

  // Set up flow field
  cols = floor(width / scl);
  rows = floor(height / scl);
  fr = createP("");

  flowfield = new Array(cols * rows);

  // Calculate window center points
  for (w of windows) {
    w.center = createVector(w.x + w.w / 2, w.y + w.h / 2);
    w.halfWidthSq = Math.pow(w.w / 2, 2);
    w.halfHeightSq = Math.pow(w.h / 2, 2);
  }

  for(let i = 0; i < windows.length-2; i++) {
    let center = (windows[i].center.y + windows[i+1].center.y)/2;
    console.log("center: " + ((center/height)-0.5));
  }

  background("#000000");

  textFont('sans');
  textSize(24);
  textAlign(CENTER, CENTER);
  textFont(myFont);

  // create and initialize the shader
  
  shaderGraphics = createGraphics(canvasX, canvasY, WEBGL);
  shaderGraphics.noStroke();
  backgroundShader = shaderGraphics.createShader(vertexShader, backgroundFragShader());

  backgroundShader.setUniform("iResolution", [width, height]);
  backgroundShader.setUniform("iTime", millis()/1000.0);
  backgroundShader.setUniform("leftColor", [0.5, 0.6, 0.9]);

  // Set canvas framerate
  // frameRate(25);
} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  // Clear if needed
  // clear();

  // Set canvas background
  // background("rgba(0,0,0,0.1)");

  let continentActivityCoeff = 0.95;
  continentActivity.eurasia = Math.min(continentActivity.eurasia * continentActivityCoeff, 200);
  continentActivity.africa = Math.min(continentActivity.africa * continentActivityCoeff, 200);
  continentActivity.americas = Math.min(continentActivity.americas * continentActivityCoeff, 200);
  continentActivity.oceania = Math.min(continentActivity.oceania * continentActivityCoeff, 200);

  // Draw shader
  backgroundShader.setUniform("iResolution", [width, height]);
  backgroundShader.setUniform("iTime", millis()/1000.0);
  backgroundShader.setUniform("eurasia", continentActivity.eurasia);
  backgroundShader.setUniform("africa", continentActivity.africa);
  backgroundShader.setUniform("oceania", continentActivity.oceania);
  backgroundShader.setUniform("americas", continentActivity.americas);
  shaderGraphics.shader(backgroundShader);
  shaderGraphics.rect(0, 0, width, height);
  // shaderGraphics.quad(-1, -1, 1, -1, 1, 1, -1, 1);

  // Draw the shader to main canvas
  image(shaderGraphics, 0, 0, width, height);

  // Update flow field
  var yoff = 0;
  for (var y = 0; y < rows; y++) {
    var xoff = 0;
    for (var x = 0; x < cols; x++) {
      var index = x + y * cols;

      let inside = false;
      for (let win of windows) {
        if (windowContains(win, { x: x * scl, y: y * scl })) {
          inside = win;
          break;
        }
      }

      var angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
      // if (inside && inside != centerWindow) {

      //   const deltaY = Math.abs(inside.center.y - y * scl);
      //   const deltaX = Math.abs(inside.center.x - x * scl);
      //   angle = Math.atan2(deltaY, deltaX);
      //   if (inside.center.y > y * scl && inside.center.x < x * scl) {
      //     angle *= -1;
      // 	}
      // 	if (inside.center.y < y * scl && inside.center.x > x * scl) {
      //     angle *= -1;
      // 	}
      // 	angle += TWO_PI / 2;
      // }

      var v = p5.Vector.fromAngle(angle);
      if (inside && inside != centerWindow) {
        v.setMag(1);
      } else {
				v.setMag(0.3);
      }
      flowfield[index] = v;
      xoff += inc;
      // stroke(150, 50);

      // push();
      // translate(x * scl, y * scl);
      // rotate(v.heading());
      // strokeWeight(1);
      // line(0, 0, scl, 0);
      // pop();
    }
    yoff += inc;

    zoff += 0.0001;
  }

  // Update and draw particles
  for (p of particles) {
    
    
    // strokeWeight(p.size);
    // for(let i = p.trails.length-2; i >= 0; i--) {
    //   p.color.setAlpha(100/(i+1));
    //   stroke(p.color);
    //   line(p.trails[i].x, p.trails[i].y, p.trails[i+1].x, p.trails[i+1].y);
    // }
    noStroke();
    fill(p.color);
    ellipse(p.pos.x, p.pos.y, p.size, p.size);
    p.vel = createVector(centerWindow.center.x, centerWindow.center.y)
      .sub(p.pos)
      .normalize()
      .mult(0.8);
    p.vel = createVector(0, 1);
    let localVel = p.vel.copy().add(getFlowfieldForce(p.pos, flowfield));
    for (w of windows) {
      localVel.add(windowForce(w, p.pos));
    }
    if(frameCount % 10 == 0) {
      p.trails.unshift(createVector(p.pos.x, p.pos.y)) // insert position at the beginning of the array
    }
    
    while(p.trails.length > NUM_TRAILS) {
      p.trails.pop();
    }
    p.pos.add(localVel);
  }

  particles = particles.filter((p) => p.pos.y <= height);

  // Draw the windows
  fill(50, 100);
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

  let now = Date.now(); // current time in milliseconds
  if (now - lastChange > 10000) {
    centerWindow = windows[Math.floor(Math.random() * windows.length)];
    lastChange = Date.now();
  }

  // Draw text
  colorMode(HSL, 100);
  fill(75, 100, 100, 100);
  text("EURASIA", width/2, 48);
  text("AFRICA", width/2, 130);
  text("THE AMERICAS", width/2, 214);
  // lastCountry = "Hong Kong (China)";
  // if(lastCountry.length >= 13) {
  //   textSize(37 - lastCountry.length);
  // }
  // text(lastCountry.toUpperCase(), width/2, 130);
  // textSize(24);
  text('OCEANIA', width/2, 297);

  if(Math.random() > 0.997) {
    SINGLE_COLOR = !SINGLE_COLOR;
  }

  // fill(255, 100, 50, 50);
  // rect(centerWindow.x, centerWindow.y, centerWindow.w, centerWindow.h);
} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

function addParticle(len) {

  let column = Math.floor(Math.random() * columns.length);
  let origin = columns[column];
  let pos = createVector(
    origin.x + origin.w * Math.random(),
    0
  );
  // Move towards the center
  let vel = createVector(canvasX / 2, canvasY / 2)
    .sub(pos)
    .normalize()
    .mult(0.5);
  colorMode(RGB, 100);
  let weight = Math.max(Math.min(Math.pow(len/1000, 0.4)/4, 1.0), 0.0);
  let red = Math.max(1 - weight, 0);
  let blue = Math.max(weight, 0);
  let green = 0.1;
  if(SINGLE_COLOR) {
    red = 0;
    blue = 0.5;
    green = 1
  }
  particles.push({
    pos: pos,
    vel: vel,
    color: color(red * 100, green * 100, blue * 100, 100),
    size: Math.max(Math.pow(len/1000, 0.4), 2),
    trails: [],
  });
}

function getFlowfieldForce(pos, vectors) {
  var x = floor(pos.x / scl);
  var y = floor(pos.y / scl);
  var index = x + y * cols;
  var force = vectors[index];
  return force;
}

function windowContains(win, pos) {
  if (
    pos.x >= win.x &&
    pos.x <= win.x + win.w &&
    pos.y >= win.y &&
    pos.y <= win.y + win.h
  ) {
    return true;
  } else {
    return false;
  }
}

const FORCE = 10;
function windowForce(win, pos) {
  let distX = win.center.x - pos.x;
  let distY = win.center.y - pos.y;
  let vel = createVector(0, 0);
  if (Math.abs(distX) < win.w / 2 && Math.abs(distY) < win.h / 2) {
    if (distX < 0) {
      vel.x = FORCE;
    } else {
      vel.x = -FORCE;
    }
    if (distY < 0) {
      vel.y = FORCE;
    } else {
      vel.y = -FORCE;
    }
  }
  return vel;
}
