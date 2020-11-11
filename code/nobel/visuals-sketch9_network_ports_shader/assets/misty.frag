precision highp float;

// lets grab texcoords from the vertex shader
varying vec2 vTexCoord;

// our texture coming from p5
uniform sampler2D tex0;


uniform vec2 resolution;
uniform float time;
uniform float alphaFadeAmount;
uniform float brightnessFadeAmount;


// From Book of Shaders https://thebookofshaders.com/edit.php#11/3d-noise.frag START
float random (in float x) {
    return fract(sin(x)*1e4);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec3 p) {
    const vec3 step = vec3(110.0, 241.0, 171.0);

    vec3 i = floor(p);
    vec3 f = fract(p);

    // For performance, compute the base input to a
    // 1D random from the integer part of the
    // argument and the incremental change to the
    // 1D based on the 3D -> 1D wrapping
    float n = dot(i, step);

    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix( mix(mix(random(n + dot(step, vec3(0,0,0))),
                        random(n + dot(step, vec3(1,0,0))),
                        u.x),
                    mix(random(n + dot(step, vec3(0,1,0))),
                        random(n + dot(step, vec3(1,1,0))),
                        u.x),
                u.y),
                mix(mix(random(n + dot(step, vec3(0,0,1))),
                        random(n + dot(step, vec3(1,0,1))),
                        u.x),
                    mix(random(n + dot(step, vec3(0,1,1))),
                        random(n + dot(step, vec3(1,1,1))),
                        u.x),
                u.y),
            u.z);
}
// From Book of Shaders https://thebookofshaders.com/edit.php#11/3d-noise.frag END

float sum(vec4 v) {
  return v.x + v.y + v.z;
}

float sum(vec2 v) {
  return v.x + v.y;
}

void main() {

  vec2 uv = vTexCoord;
  // the texture is loaded upside down and backwards by default so lets flip it
  vec2 co = 1.0 - uv;

	vec2 st = co/resolution;
  vec4 c = texture2D(tex0, co).rgba;

  //st*=5;
  st *= sin(time*0.1)*3.0+4.0;
  float t = time*0.1;
  float wind = sin(t) + cos(t);
  vec2 offset = vec2(noise(vec3(st+wind, t)), noise(vec3(st+10.+wind, t)));
  // offset = vec2(round(offset.x*10.0-5.0), round(offset.y*10.0-5.0));
  offset = vec2((offset.x*10.0-5.0), (offset.y*10.0-5.0));
  vec4 nc = texture2D(tex0, co+offset).rgba;

  // "moving mass wind with control"
  if(sum(nc) > sum(c) && nc.a > 0.1 && sum(nc) > 0.01) {
    c = vec4(c.rgb*.5, c.a*0.8) + vec4(nc.rgb*.5, .5/(abs(sum(offset))+1.0) );
    c *= abs(length(offset))/50.0 + 1.0;
  }

  // blur
  for(float x = -2.0; x <= 2.0; x++) {
    for(float y = -2.0; y <= 2.0; y++) {
      if(y==0.0 && x==0.0) continue;
      vec4 bc = texture2D(tex0, co+vec2(x, y));
      if(sum(bc) > .5) { // only apply the colour if it's not too dark
        float amount = .125/length(vec2(x, y)); // add more of closer colours
        c = c*(1.0-amount) + bc*amount;
      }
    }
  }
  c.a = min(c.a, 1.); // alpha can't get bigger than 1
  // dark colors get less alpha
  //c.a *= smoothstep(0.2, .5, sum(c));
  // very transparent colours get darker
  c.rgb *= smoothstep(0.1, 0.4, c.a);
  // TODO: transparent colors get darker?
  // everything gets darker, only the wind can make it brighter
  c.a *= 1.0-alphaFadeAmount;
  c.rgb *= 1.0-brightnessFadeAmount;


  // output to screen
  gl_FragColor = vec4(c);
}