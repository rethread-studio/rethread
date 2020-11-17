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
  countries: 12,
  rfc: 16,
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

//LOGOS
let visualIntro;
let logoKTH;
let logoNobel;
let logoRethart;

////////////////////////////////////////////////////////////////////////////////////
// SHADER
/////////////////////////////////////////////////////////////////////////////////////////////

const vertexShader = `

// Get the position attribute of the geometry
attribute vec3 aPosition;

// Get the texture coordinate attribute from the geometry
attribute vec2 aTexCoord;

// Get the vertex normal attribute from the geometry
attribute vec3 aNormal;

// When we use 3d geometry, we need to also use some builtin variables that p5 provides
// Most 3d engines will provide these variables for you. They are 4x4 matrices that define
// the camera position / rotation, and the geometry position / rotation / scale
// There are actually 3 matrices, but two of them have already been combined into a single one
// This pre combination is an optimization trick so that the vertex shader doesn't have to do as much work

// uProjectionMatrix is used to convert the 3d world coordinates into screen coordinates 
uniform mat4 uProjectionMatrix;

// uModelViewMatrix is a combination of the model matrix and the view matrix
// The model matrix defines the object position / rotation / scale
// Multiplying uModelMatrix * vec4(aPosition, 1.0) would move the object into it's world position

// The view matrix defines attributes about the camera, such as focal length and camera position
// Multiplying uModelViewMatrix * vec4(aPosition, 1.0) would move the object into its world position in front of the camera
uniform mat4 uModelViewMatrix;

// Get the framecount uniform
uniform float uFrameCount;

// Get the noise texture
uniform sampler2D uNoiseTexture;

varying vec2 vTexCoord;
varying vec3 vNoise;


void main() {

  // Sample the noise texture
  // We will shift the texture coordinates over time to make the noise move
  float tile = 2.0;
  float speed = 0.002;
  vec4 noise = texture2D(uNoiseTexture, fract(aTexCoord * tile + uFrameCount * speed));

  // Send the noise color to the fragment shader
  vNoise = noise.rgb;

  // copy the position data into a vec4, using 1.0 as the w component
  vec4 positionVec4 = vec4(aPosition, 1.0);

  // Amplitude will determine the amount of the displacement
  float amplitude = 1.0;

  // add the noise to the position, and multiply by the normal to move along it. 
  positionVec4.xyz += (noise.rgb - 0.5 ) * aNormal * amplitude;

  // Move our vertex positions into screen space
  // The order of multiplication is always projection * view * model * position
  // In this case model and view have been combined so we just do projection * modelView * position
  gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;

  // Send the texture coordinates to the fragment shader
  vTexCoord = aTexCoord;
}
`;

function backgroundFragShader() {
  return `  
    precision mediump float;

varying vec2 vTexCoord;

// Get the normal from the vertex shader
varying vec3 vNoise;

void main() {
  
  vec3 color = vNoise;
  
  // Lets just draw the texcoords to the screen
  gl_FragColor = vec4(color ,1.0);
}
    `;
}
let backgroundShader;
let shaderGraphics;
let noise



// Preload Function
function preload() {
  myFont = loadFont(fontURL);
  logoKTH = loadImage('./assets/img/kth_logo.png');
  logoNobel = loadImage('./assets/img/nobel_logo.png');
  logoRethart = loadImage('./assets/img/rethread_logo.png');
  noise = loadImage('./assets/img/noise.png');

} // End Preload


//WEB SOCKET ----------------------------------------------------------------------
let num = 0;
new WebSocketClient().onmessage = (data) => {
  if (num < 10) {

  }
  let internalData = JSON.parse(data.data);
};

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  //PIXEL DENSITY TO REMOVE
  pixelDensity(15.0);

  visualIntro = new VisualIntro(myFont, positions, fontSize, colorPallete, logoKTH, logoNobel, logoRethart)
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

  textFont('sans');
  textSize(28);
  textAlign(CENTER, CENTER);
  textFont(myFont);

  //SHADER CONFIG
  shaderGraphics = createGraphics(canvasSize.width, canvasSize.height, WEBGL);
  shaderGraphics.noStroke();
  backgroundShader = shaderGraphics.createShader(vertexShader, backgroundFragShader());

} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
function draw() {
  background(0);
  // clear();
  //DRAW SHADER
  // shaderGraphics.background(0);
  shaderGraphics.clear();
  // shader() sets the active shader with our shader
  shaderGraphics.shader(backgroundShader);

  // Send the frameCount to the shader
  backgroundShader.setUniform("uFrameCount", frameCount);
  backgroundShader.setUniform("uNoiseTexture", noise);

  shaderGraphics.translate(0, 0)
  // Rotate our geometry on the X and Y axes
  shaderGraphics.rotateX(0.01);
  shaderGraphics.rotateY(0.005);

  // Draw some geometry to the screen
  // We're going to tessellate the sphere a bit so we have some more geometry to work with
  shaderGraphics.sphere(canvasSize.width / 3, 200, 100);

  // Draw the shader to main canvas
  image(shaderGraphics, 0, 0, canvasSize.width, canvasSize.height);

  // Draw text
  colorMode(RGB, 100);

  visualIntro.updateData();
  visualIntro.display();
  // Draw the windows
  fill(50, 100);
  noStroke();
  for (win of windows) {
    rect(win.x, win.y, win.w, win.h);
  }

} // End Draw
