#version 450

// layout(location=0) in vec4 v_color;
layout(location=0) out vec4 f_color;


in vec4 gl_FragCoord;

layout(std140, set=0, binding=0)
uniform Uniforms {
  vec2 resolution;
  uint num_points;
  vec2 texture_res;
};


layout(set = 1, binding = 0) uniform texture2D t_diffuse;
layout(set = 1, binding = 1) uniform sampler s_diffuse;


void main() {
  // Normalize to same coordinates as nannou usually uses
  vec2 uv = (gl_FragCoord.xy/resolution - vec2(0.5, 0.5)) * vec2(2, -2);
  uv *= length(uv);
  float min_dist = 1000000;
  vec2 data = vec2(0., 0.);
  // uint iterations = 0;
  for(int i = 0; i < num_points; i++) {
    // Get data out of the texture
    float x = float(i % uint(texture_res.x))/float(texture_res.x);
    float y = float(i/uint(texture_res.x))/float(texture_res.y);
    vec4 val = texture(sampler2D(t_diffuse, s_diffuse), vec2(float(i)/float(num_points), 0));
    vec2 len = val.xy - uv;
    
    float dist = dot(len, len);
    if(dist < min_dist) {
      min_dist = dist;
      data = val.zw;
    }
    // dist = min(dot(val.xy - uv), dist);
  }
  // float p = float(dist < 0.01);
  float p = min(sqrt(min_dist) * 10.0, 1.0);
  float np = pow(max(1.0 - (p), 0.), 1/4.0);
  // float np = p;
  vec3 col1 = vec3(0.1373, 0.5451, 0.6667);
  vec3 col2 = vec3(0.0, 0.1686, 0.7255);
  vec3 col3 = vec3(0.6941, 0.9294, 1.0);
  vec3 col = mix(col1, col2, data.x * np);
  col = mix(col, col3, pow(abs(min(pow(p, 2)*1.8, 2.0) - 0.8), 2.));
  //vec3 col = vec3(np, np * data.x, np* data.y);
  // col = vec3(uv.x, uv.y, uv.x); // Check that the coordinate system is right
  f_color = vec4(col, 1.0);
}
