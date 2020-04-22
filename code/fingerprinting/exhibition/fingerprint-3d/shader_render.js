
let shHasConsented = false;
getSession((session) => {
    shHasConsented = session.terms;
});

let fingerprintShader;
let fingerprintShaderFrag = `
#ifdef GL_ES
precision mediump float;
#endif
/* Warp the space around lights of different colours */

#define NUM_VALUES 25
uniform float time;
uniform vec2 u_resolution;
uniform float alpha;
varying vec2 vUv;
uniform float fingerprint[25];
uniform vec3 orgColor;

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

vec3 light(in vec2 st,  in float brightness, in float focus, in vec3 mixCol) {
    int offset = 0;
    float t = time;
    t *= 0.12;
    float rotationSpeed = mod(fingerprint[0] * 413.483, 0.1) - 0.05;
    st = rotate2d(fingerprint[2] + t * rotationSpeed) * st;
  st += mod(length(st) * mod(fingerprint[0], 100.) * 0.3, 1.0);
  st.x += sin(mod(fingerprint[1]*st.y, 1.) * 11. + t) * 0.1;
  st.y -= sin(mod(fingerprint[2]*st.x, 1.) * 10. + t) * 0.1;
  st.y -= sin(mod(fingerprint[3]*st.x, 1.) * 10. + t) * 0.1;
  float pct;
  //pct = distance(pos,center);
  pct = distance(st,vec2(0.5)) + distance(st,vec2(0.5));
  vec2 j = st*50.;
  pct = 1./dot(j, j);
  //pct = brightness/pct;
  pct = pow(pct, focus);
  vec3 color = mix(orgColor, mixCol, (sin(t * 10. + st.x * mod(fingerprint[1] + fingerprint[3],7.52))*.5+.5));
  return pct * color;
}
vec3 light2(in vec2 st,  in float brightness, in float focus, in vec3 mixCol) {
    int offset = 4;
    float t = time;
    t *= 0.5;
    float rotationSpeed = mod(fingerprint[4] * 413.483, 0.1) - 0.05;
    st = rotate2d(fingerprint[6] + t * rotationSpeed) * st;
  st += mod(length(st) * mod(fingerprint[4], 100.) * 0.3, 1.0);
  st.x += sin(mod(fingerprint[5]*st.y, 1.) * 11. + t) * 0.1;
  st.y -= sin(mod(fingerprint[6]*st.x, 1.) * 10. + t) * 0.1;
  st.y -= sin(mod(fingerprint[7]*st.x, 1.) * 10. + t) * 0.1;
  float pct;
  //pct = distance(pos,center);
  pct = distance(st,vec2(0.5)) + distance(st,vec2(0.5));
  vec2 j = st*50.;
  pct = 1./dot(j, j);
  //pct = brightness/pct;
  pct = pow(pct, focus);
  vec3 color = mix(orgColor, mixCol, (sin(t * 10. + st.x * mod(fingerprint[5] + fingerprint[7],7.52))*.5+.5));
  return pct * color;
}

vec3 light3(in vec2 st,  in float brightness, in float focus, in vec3 mixCol) {
    int offset = 8;
    float t = time;
    t *= 0.08;
    float rotationSpeed = mod(fingerprint[8] * 413.483, 0.1) - 0.05;
    st = rotate2d(fingerprint[10] + t * rotationSpeed) * st;
  st += mod(length(st) * mod(fingerprint[8], 100.) * 0.3, 1.0);
  st.x += sin(mod(fingerprint[9]*st.y, 1.) * 11. + t) * 0.1;
  st.y -= sin(mod(fingerprint[10]*st.x, 1.) * 10. + t) * 0.1;
  st.y -= sin(mod(fingerprint[11]*st.x, 1.) * 10. + t) * 0.1;
  float pct;
  //pct = distance(pos,center);
  pct = distance(st,vec2(0.5)) + distance(st,vec2(0.5));
  vec2 j = st*50.;
  pct = 1./dot(j, j);
  //pct = brightness/pct;
  pct = pow(pct, focus);
  vec3 color = mix(orgColor, mixCol, (sin(t * 10. + st.x * mod(fingerprint[8] + fingerprint[11],7.52))*.5+.5));
  return pct * color;
}

vec3 light4(in vec2 st,  in float brightness, in float focus, in vec3 mixCol) {
    int offset = 12;
    float t = time;
    t *= 0.15;
    float rotationSpeed = mod(fingerprint[12] * 413.483, 0.1) - 0.05;
    st = rotate2d(fingerprint[14] + t * rotationSpeed) * st;
  st += mod(length(st) * mod(fingerprint[12], 100.) * 0.3, 1.0);
  st.x += sin(mod(fingerprint[13]*st.y, 1.) * 11. + t) * 0.1;
  st.y -= sin(mod(fingerprint[14]*st.x, 1.) * 10. + t) * 0.1;
  st.y -= sin(mod(fingerprint[15]*st.x, 1.) * 10. + t) * 0.1;
  float pct;
  //pct = distance(pos,center);
  pct = distance(st,vec2(0.5)) + distance(st,vec2(0.5));
  vec2 j = st*50.;
  pct = 1./dot(j, j);
  //pct = brightness/pct;
  pct = pow(pct, focus);
  vec3 color = mix(orgColor, mixCol, (sin(t * 10. + st.x * mod(fingerprint[13] + fingerprint[15],7.52))*.5+.5));
  return pct * color;
}

vec3 light5(in vec2 st,  in float brightness, in float focus, in vec3 mixCol) {
    int offset = 18;
    float t = time;
    t *= 0.05;
    float rotationSpeed = mod(fingerprint[18] * 413.483, 0.1) - 0.05;
    st = rotate2d(fingerprint[20] + t * rotationSpeed) * st;
  st += mod(length(st) * mod(fingerprint[18], 100.) * 0.3, 1.0);
  st.x += sin(mod(fingerprint[19]*st.y, 1.) * 11. + t) * 0.1;
  st.y -= sin(mod(fingerprint[20]*st.x, 1.) * 10. + t) * 0.1;
  st.y -= sin(mod(fingerprint[21]*st.x, 1.) * 10. + t) * 0.1;
  float pct;
  //pct = distance(pos,center);
  pct = distance(st,vec2(0.5)) + distance(st,vec2(0.5));
  vec2 j = st*50.;
  pct = 1./dot(j, j);
  //pct = brightness/pct;
  pct = pow(pct, focus);
  vec3 color = mix(orgColor, mixCol, (sin(t * 10. + st.x * mod(fingerprint[19] + fingerprint[21],7.52))*.5+.5));
  return pct * color;
}


void main()
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = (gl_FragCoord.xy -.5*u_resolution.xy)/u_resolution.y;
    
    float t = time;
    
    t *= 0.29;
        
    // Coordinate manipulations
    float rotationSpeed = mod(fingerprint[1] + fingerprint[24], 0.1) - 0.05;
    uv = rotate2d(fingerprint[3] + t * rotationSpeed) * uv;
    
    float crazyRotation = mod((fingerprint[14] + fingerprint[20]) * 3285.318, 2.5);
    crazyRotation = crazyRotation * crazyRotation * crazyRotation;
    uv = rotate2d((uv.y + .5) * crazyRotation) * uv;
    
    crazyRotation = mod((fingerprint[3] + fingerprint[4] + fingerprint[5] + fingerprint[10]) * 3285.318, 1.5);
    crazyRotation = crazyRotation * crazyRotation * crazyRotation;
    uv = rotate2d((uv.x + .5) * crazyRotation) * uv;
    

    // Time varying pixel color
    vec3 col = vec3(0);
    vec3 color = vec3(
        mod(fingerprint[0] + fingerprint[1] + fingerprint[6] + fingerprint[3], 0.83),
        mod(fingerprint[4] + fingerprint[5] + fingerprint[10] + fingerprint[7], 0.8),
        mod(fingerprint[8] + fingerprint[9] + fingerprint[2] + fingerprint[11], 0.82)
        );
    
    // vec3 color2 = vec3(
    //     mod(fingerprint[12] + fingerprint[13] + fingerprint[18] + fingerprint[15], 0.8),
    //     mod(fingerprint[16] + fingerprint[21] + fingerprint[14] + fingerprint[23], 0.82),
    //     mod(fingerprint[20] + fingerprint[17] + fingerprint[22] + fingerprint[19], 0.75)
    //     );
    
    
    
    col += light(uv, 0.0, .4, color);
    col += light2(uv + vec2(0.25, 0.25) * mod(fingerprint[6] * 45.251, 0.96), 0.0, .4, color) * (sin(t)*.5 + .5) * mod((fingerprint[3] + fingerprint[4]) * 372.91, 1.0);
    col += light3(uv - vec2(0.25, 0.25), 0.0, .4, color) * (sin(t * 0.93)*.5 + .5) * mod((fingerprint[11] + fingerprint[13]) * 372.91, 1.0);
    col += light4(uv + vec2(0.25, -0.25), 0.0, .4, color) * (sin(t * 0.72)*.5 + .5) * mod((fingerprint[6] + fingerprint[19]) * 372.91, 1.0);
    col += light5(uv + vec2(-0.25, 0.25), 0.0, .4, color) * (sin(t * 0.58)*.5 + .5) * mod((fingerprint[8] + fingerprint[22]) * 372.91, 1.0);

    col *= 2.0;
    // Output to screen
    gl_FragColor = vec4(col,1.0);
}`;

let vertexShader = `
/*
vert file and comments from adam ferriss
https://github.com/aferriss/p5jsShaderExamples
with additional comments from Louise Lessel
*/ 


// These are necessary definitions that let you graphics card know how to render the shader
#ifdef GL_ES
precision mediump float;
#endif


// This “vec3 aPosition” is a built in shader functionality. You must keep that naming.
// It automatically gets the position of every vertex on your canvas

attribute vec3 aPosition;

// We always must do at least one thing in the vertex shader:
// tell the pixel where on the screen it lives:

void main() {
  // copy the position data into a vec4, using 1.0 as the w component
  vec4 positionVec4 = vec4(aPosition, 1.0);
  
  // Make sure the shader covers the entire screen:
  // scale the rect by two, and move it to the center of the screen
  // if we don't do this, it will appear with its bottom left corner in the center of the sketch
  // try commenting this line out to see what happens
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;

  // Send the vertex information on to the fragment shader
  // this is done automatically, as long as you put it into the built in shader function “gl_Position”
  gl_Position = positionVec4;
}
`;

let shaderCanvas;

function renderShaderOnCanvas(fp) {
    // Delete old canvas
    // let oldCanvas = document.getElementsByTagName('canvas');

    if(fp != undefined) {
        shaderFpCallback(fp);
    } else {
        if (shHasConsented) {
            // get my fingerprint
            getFingerPrint(shaderFpCallback);
        }
        else {
            // no consent
            // get and show random fp
            getRandomFingerPrint(shaderFpCallback);
        }
    }
}

let headers = [
    "host",
    "dnt",
    "user-agent",
    "accept",
    "accept-encoding",
    "accept-language",
    "ad",
    "canvas",
    "cookies",
    "font-flash",
    "font-js",
    "language-flash",
    "platform-flash",
    "languages-js",
    "platform",
    "plugins",
    "screen_width",
    "screen_height",
    "screen_depth",
    "storage_local",
    "storage_session",
    "timezone",
    "userAgent-js",
    "webGLVendor",
    "webGLRenderer",
  ];

function shaderFpCallback(fingerprint) {
    let rp = [];
    for(let h of headers) {
        rp.push(Number(fingerprint.normalized[h]));
      }
    let fingerprintSum = rp.reduce((prev, curr) => prev + curr, 0);

    w = window.screen.width;
    h = window.screen.height;

    let extraWidth = (fingerprintSum * 5293.184) % 16;
    let extraHeight = (fingerprintSum * 293.184) % 16;

    let scale = 50;

    let shWidth = (12 + extraWidth) * scale;
    let shHeight = (12 + extraHeight) * scale;

    let shaderFingerprint = rp.map(num => {
        return Math.sqrt(((num + 1) * fingerprintSum) % 99);
    })

    // create canvas, hide it at first, position
    shaderCanvas = createCanvas(shWidth, shHeight, WEBGL);
    
    // 
    // Get the device pixel ratio, falling back to 1.
    // For HiDPI displays this is higher than 1
    var dpr = window.devicePixelRatio || 1;

    fingerprintShader = createShader(vertexShader, fingerprintShaderFrag);
    
    colorMode(HSL, 100);
    let orgColor = color(((fingerprintSum * 73) % 1000)/10, 60, 55);
        
    shader(fingerprintShader);
    fingerprintShader.setUniform('orgColor', [orgColor.levels[0]/255, orgColor.levels[1]/255, orgColor.levels[2]/255]);
    fingerprintShader.setUniform('u_resolution', [shaderCanvas.width * dpr, shaderCanvas.height * dpr]);
    fingerprintShader.setUniform('fingerprint', shaderFingerprint);
    fingerprintShader.setUniform('time', 10);

    rect(0,0,canvas.width,canvas.height);

    shaderCanvas.id('shaderCanvas');
    shaderCanvas.class('shaderCanvas');
}