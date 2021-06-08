#version 450
// Adapted from:
// http://callumhay.blogspot.com/2010/09/gaussian-blur-shader-glsl.html

layout(location=0) out vec4 f_color;
in vec4 gl_FragCoord;

layout(std140, set=0, binding=0)
uniform Uniforms {
  vec2 resolution;
  float contrast;
  float blur_alpha;
  // TODO: lightness (to compensate for contrast)
};

// varying vec4 vertTexCoord;
// The
layout(set = 1, binding = 0) uniform texture2D t_blur;
layout(set = 1, binding = 1) uniform sampler s_blur;

layout(set = 2, binding = 0) uniform texture2D t_original;
layout(set = 2, binding = 1) uniform sampler s_original;
//const vec2 texOffset = vec2(1.0, 1.0);
const float PI = 3.14159265;

void main() {
  vec2 p = (gl_FragCoord.xy/resolution);

  vec4 original_col = texture(sampler2D(t_original, s_original), p);
  vec4 blur_col = texture(sampler2D(t_blur, s_blur), p);
  vec4 col = max(original_col, blur_col);
  col = (col * blur_alpha) + (original_col * (1-blur_alpha));
  col = vec4(pow(col.r, 1.0/contrast), pow(col.g, 1.0/contrast), pow(col.r, 1.0/contrast), col.a);
  // col *= vec4(1.1, 0.5, 0.5, 1.0);
  f_color = col;
}
