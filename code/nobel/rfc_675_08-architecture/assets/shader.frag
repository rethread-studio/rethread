#version 330

#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif

uniform vec2 resolution;
uniform vec2 mouse;
uniform float time;
uniform sampler2DRect tex0;
uniform float alphaFadeAmount;
uniform float brightnessFadeAmount;

out vec4 outColor;

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

void main(){
  vec2 co = gl_FragCoord.xy;
	vec2 st = gl_FragCoord.xy/resolution;
  vec4 c = texture(tex0, co).rgba;

  //st*=5;
  st *= sin(time*0.1)*3+4;
  float t = time*0.1;
  float wind = sin(t) + cos(t);
  vec2 offset = vec2(noise(vec3(st+wind, t)), noise(vec3(st+10.+wind, t)));
  offset = round(offset*10-5);
  vec4 nc = texture(tex0, co+offset).rgba;
  //c = vec4(c.rgb*.8, c.a) + vec4(nc.rgb*.2, nc.a); // spreading black fields

  // slowly growing color fields
  //if(sum(nc) > sum(c)) {
  //  c = c*.5 + nc*.5;
  //}

  // "coral reef"
  //if(sum(nc) > sum(c)) {
  //  c = vec4(c.rgb*.2, c.a*.9) + vec4(nc.rgb*.8, 0.1);
  //} else {
  //  c *= 0.99;
  //}
  //c.a = min(c.a, 1.);
  //// dark colors get less alpha
  //c.a *= smoothstep(0.1, .5, sum(c));

  // "moving mass wind with control"
  if(sum(nc) > sum(c) && nc.a > 0.1 && sum(nc) > 0.01) {
    c = vec4(c.rgb*.5, c.a*0.8) + vec4(nc.rgb*.5, .5/(abs(sum(offset))+1) );
    c *= abs(length(offset))/50 + 1;
  }

  // blur
  for(float x = -2; x <= 2; x++) {
    for(float y = -2; y <= 2; y++) {
      if(y==0 && x==0) continue;
      vec4 bc = texture(tex0, co+vec2(x, y));
      if(sum(bc) > .5) { // only apply the colour if it's not too dark
        float amount = .125/length(vec2(x, y)); // add more of closer colours
        c = c*(1-amount) + bc*amount;
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
  c.a *= 1-alphaFadeAmount;
  c.rgb *= 1-brightnessFadeAmount;


	outColor = vec4(c);
}
