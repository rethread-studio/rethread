#version 450

// layout(location=0) in vec4 v_color;
layout(location=0) out vec4 f_color;


in vec4 gl_FragCoord;

layout(std140, set=0, binding=0)
uniform Uniforms {
  vec2 resolution;
  uint num_points;
  vec2 texture_res;
  float fade_out_distance;
  float border_margin;
  vec4 col1;
  vec4 col2;
  vec4 col3;
  vec4 col_bg;
};


layout(set = 1, binding = 0) uniform texture2D t_diffuse;
layout(set = 1, binding = 1) uniform sampler s_diffuse;


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

#define NUM_OCTAVES 3

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}



//  Function from Iñigo Quiles
//  https://www.shadertoy.com/view/MsS3Wc
vec3 hsb2rgb( in vec3 c ){
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                             6.0)-3.0)-1.0,
                     0.0,
                     1.0 );
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
}


void main() {
  // Normalize to same coordinates as nannou usually uses
  vec2 uv = (gl_FragCoord.xy/resolution - vec2(0.5, 0.5)) * vec2(2, -2);
  // uv *= length(uv);
  // The next to minimum distance, useful to find the midpoint
  float next_min_dist = 10000000.0;
  float min_dist = 10000000.0;
  vec2 data = vec2(0., 0.);
  vec2 next_data = vec2(0., 0.);
  // uint iterations = 0;
  for(int i = 0; i < num_points; i++) {
    // Get data out of the texture
    float x = float(i % uint(texture_res.x))/(texture_res.x);
    float y = float(i/uint(texture_res.x))/(texture_res.y);
    vec4 val = texture(sampler2D(t_diffuse, s_diffuse), vec2(x, y));
    vec2 len = val.xy - uv;
    
    float dist = dot(len, len);
    
    if(dist < min_dist) {
      next_min_dist = min_dist;
      min_dist = dist;
      next_data = data;
      data = val.zw;
    }
    else if(dist < next_min_dist && abs(dist - min_dist) > 0.00001) {
      next_min_dist = max(dist, 0.00001);
      next_data = val.zw;
    }
    
    // dist = min(dot(val.xy - uv), dist);
  }

  // vec3 col1 = vec3(0.4471, 0.9725, 0.7255);
  // vec3 col2 = vec3(0.0078, 0.6902, 0.7804);
  // vec3 col3 = vec3(0.0039, 0.0745, 0.051);
  // vec3 col4 = vec3(0.8784, 0.4118, 0.6314);
  // vec3 col_bg = vec3(0.8902, 0.9725, 1.0);

  // vec2 mouse = vec2(1.0, 1.0);
  // float time = 1.0;
  // // Get fbm
  // vec2 st = uv * 30.0;
  // vec2 q = vec2(0.);
  // q.x = fbm( st );
  // q.y = fbm( st + vec2(1.0));

  // vec2 r = vec2(0.);
  // r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*time );
  // r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*time);

  // float f = fbm(st+ (r*mouse.x));

  // vec3 fbm_col = mix(vec3(0.101961,0.619608,0.666667),
  //               vec3(0.666667,0.666667,0.498039),
  //               clamp((f*f)*4.0,0.0,1.0));

  //   fbm_col = mix(fbm_col,
  //               col3,
  //               clamp(length(q),0.0,1.0));

  //   fbm_col = mix(fbm_col,
  //               col1,
  //               clamp(length(r.x),0.0,1.0));

  
  // float p = float(dist < 0.01);
  float from_center = dot(uv, uv);
  float p = pow(min_dist/next_min_dist, 0.9);
  // float p = min(sqrt(min_dist) * 10.0, 1.0);
  float np = pow(max(1.0 - (p), 0.), 0.8);
  // float np = p;
  float borders = smoothstep(1.0-border_margin, 1.0, p);
  // float borders = smoothstep(0.00005, 0.00002,abs(min_dist-next_min_dist));
  // vec3 col1 = vec3(0.3843, 0.8392, 0.7255);
  // vec3 col2 = vec3(0.8314, 0.9059, 0.9412);
  // vec3 col3 = vec3(0.1294, 0.6353, 0.7882);
  // vec3 col_bg = vec3(0.7725, 0.9451, 1.0);

  // col3 = mix(col3, hsb2rgb(vec3(data.y + 0.6, 1.0, 0.6)), (data.x + 0.5) * np);
  vec3 new_col3 = mix(col_bg.rgb, hsb2rgb(vec3(fract(data.y + 0.55), 0.95, 0.65)) * data.x * 3.0, min(data.x * 2.0, 1.0) * np);
  // col_bg = mix(col3, hsb2rgb(vec3((data.y + next_data.y)/2.0, 1.0, 0.2)), (data.x + 0.5) * np);
  
  vec3 col = mix(col1.rgb * (smoothstep(0.0, 1.0, p) * 0.5 + 0.7), new_col3, data.x);
  col = mix(col, col2.rgb, borders);
  float fade_out_distance2 = fade_out_distance * 1.0/from_center;
  // col = mix(col, col_bg.rgb, borders);
  col = mix(col, col_bg.rgb, smoothstep(fade_out_distance2 * 0.1, fade_out_distance2, min_dist)); // Fade out at long distances to get a more celly look

  // Create a microscope light like
  col *= 0.95 + sqrt(1.0/max(from_center, 0.04)) * 0.03;
  

  // col = vec3(smoothstep(0.9, 1.0,p));
  //vec3 col = vec3(np, np * data.x, np* data.y);
  // col = vec3(uv.x, uv.y, uv.x); // Check that the coordinate system is right
  f_color = vec4(col, 1.0);
}
