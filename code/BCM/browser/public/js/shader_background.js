
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
  
    // Based on work by @patriciogv - 2015
  // http://patriciogonzalezvivo.com
  
  mat2 rotate(float a){
      float c=cos(a),s=sin(a);
      return mat2(c,-s,s,c);
  }
  
  float random (in vec2 _st) {
      return fract(sin(dot(_st.xy,
                           vec2(12.9898,78.233)))*
          43758.5453123);
  }
  
  // Based on Morgan McGuire @morgan3d
  // https://www.shadertoy.com/view/4dS3Wd
  float noise (in vec2 _st) {
      vec2 i = floor(_st);
      vec2 f = fract(_st);
  
      // Four corners in 2D of a tile
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
  
      vec2 u = f * f * (3.0 - 2.0 * f);
  
      return mix(a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
  }
  
  // from https://iquilezles.org/www/articles/smoothvoronoi/smoothvoronoi.htm
  float smoothVoronoi( in vec2 x )
  {
    vec2 p = floor( x );
    vec2  f = fract( x );
  
    float res = 0.0;
    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ )
    {
        vec2 b = vec2( i, j );
        vec2  r = vec2( b ) - f + random( p + b );
        float d = length( r );
  
        res += exp( -32.0*d );
    }
    return -(1.0/32.0)*log( res );
  }
  
  #define NUM_OCTAVES 6
  
  float fbm ( in vec2 _st) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      // Rotate to reduce axial bias
      mat2 rot = mat2(cos(0.5), sin(0.5),
                      -sin(0.5), cos(0.50));
      for (int i = 0; i < NUM_OCTAVES; ++i) {
          v += a * smoothVoronoi(_st);
          _st = rot * _st * 2.0 + shift;
          a *= 0.5;
      }
      return v;
  }

  float tri(in float m) {
      float x = mod(m, 2.0) - 1.0;
      return 1.0 - abs(x);
  }
  
  void main() {
      vec2 st = (gl_FragCoord.xy/iResolution.x)-.5;
      // vec2 st = - 1.0 + 2.0 * vUv;
      vec2 uv = st;
      st*=10.;// * pow(abs(uv.x), 0.1);
      //
      //st += st * abs(sin(time*0.1)*3.0);
      vec3 color = vec3(0.0);
      float time = iTime * 7.;
  
      vec2 q = vec2(0.);
      q.x = fbm( st * rotate(time * -0.003));
      q.y = fbm( st + vec2(4.0));
  
      vec2 r = vec2(0.);
      r.x = fbm( st * rotate(time * -0.033) + 10.0*q + vec2(1.7,9.2)+ 0.10*time );
      r.y = fbm( st * rotate(time * 0.005) + 1.0*q + vec2(8.3,2.8)+ 0.016*time);
  
    //   float f = fbm(st+ (r*3.2));
      float f = max(pow(r.y*q.y * q.x, 0.1), 0.1);
  
    //   color = mix(vec3(0.4824, 0.651, 0.6863),
    //               vec3(0.635, 0.8627, 0.9559),
    //               clamp((f*f)*1.5,0.4,1.0));
  
    //   color = mix(color,
    //               vec3(0.6118, 0.8588, 0.9059),
    //               clamp(length(q),0.0,1.0));
  
    //   color = mix(color,
    //               vec3(0.6784, 0.8627, 0.902),
    //              clamp(length(r.x),0.0,1.0));

    time *= 0.1;
    vec3 randomColor = vec3(sin(time*0.05)*.5+.5, sin(time*0.02473623)*.4+.55, sin(time*.038426384)*.5+.5);// * (sin(time * 0.04) * 0.3 + 0.7);
    vec3 randomColor2 = vec3(sin(time*0.05)*.45+.55, sin(time*0.02473623)*.45+.5, sin(time*.038426384)*.5+.5);// * (sin(time * 0.05) * 0.2 + 0.8);

    float colorMix = tri(time*0.01)*.5 + .5;

    // vec3 randomColor2 = mix(vec3(0.416, 0.51, 0.984), vec3(0.8, 0.325, 0.2), clamp(colorMix*2.0, 0.0, 1.0));
    // randomColor2 = mix(randomColor2, vec3(0.235, 0.063, 0.325), clamp(colorMix*4.0-2.0, 0.0, 1.0));
    // randomColor2 = mix(randomColor2, vec3(0.537, 0.129, 0.42), clamp(colorMix*4.0-3.0, 0.0, 1.0));
    // vec3 randomColor = mix(vec3(0.988, 0.361, 0.490), vec3(0.137, 0.027, 0.302), clamp(colorMix*2.0, 0.0, 1.0));
    // randomColor = mix(randomColor, vec3(0.678, 0.325, 0.537), clamp(colorMix*4.0-2.0, 0.0, 1.0));
    // randomColor = mix(randomColor, vec3(0.855, 0.267, 0.325), clamp(colorMix*4.0-3.0, 0.0, 1.0));

    color = mix(randomColor2, randomColor, clamp(uv.x+.5, 0.,1.));

    // color = mix(color,
    //                   randomColor * 1.05,
    //                   clamp(length(q),0.0,1.0));
    // color = mix(color,
    //                 leftColor,
    //                 clamp((f*f)*1.5,0.4,1.0));
  
      gl_FragColor = vec4(pow(f, 0.9)*1.0*color*brightness, 1.0);
    //   gl_FragColor = vec4(vec3(colorMix), 1.0);
  }
    `;
}

let backgroundShader;
function setup() {
    let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    canvas.parent('background-shader');
    
    // create and initialize the shader
    backgroundShader = createShader(vertexShader, backgroundFragShader());
    shader(backgroundShader);
    noStroke();
    
    backgroundShader.setUniform("iResolution", [width, height]);
    backgroundShader.setUniform("iTime", millis()/1000.0);
    backgroundShader.setUniform("leftColor", [0.5, 0.6, 0.9]);
}
    
function draw() {
    // 'r' is the size of the image in Mandelbrot-space
    backgroundShader.setUniform("iResolution", [width*2, height]);
    backgroundShader.setUniform("iTime", millis()/1000.0);
    let brightness = Math.min(window.smoothActivity*0.005 + 0.5, 1.2);
    if (window.idle == true) {
        brightness = 0.2;
    }
    // console.log(brightness);
    backgroundShader.setUniform("brightness", brightness);
    quad(-1, -1, 1, -1, 1, 1, -1, 1);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}