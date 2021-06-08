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

vec3 brightness_contrast(vec3 value, float brightness, float contrast)
{
    return (value - 0.5) * contrast + 0.5 + brightness;
}
vec3 gamma(vec3 value, float param)
{
    return vec3(pow(abs(value.r), param),pow(abs(value.g), param),pow(abs(value.b), param));
}
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
  vec4 col = blur_col;
  col = max(original_col, blur_col); // Needs to work on luminosity, not each color by itself
  col = (col * blur_alpha) + (original_col * (1.0-blur_alpha));
  // col.rgb = brightness_contrast(col.rgb, 0.0, contrast);
  col.rgb = gamma(col.rgb, contrast);
  // col = vec4(pow(col.r, 1.0/contrast), pow(col.g, 1.0/contrast), pow(col.r, 1.0/contrast), col.a);
  // col *= vec4(1.1, 0.5, 0.5, 1.0);
  // col = original_col;
  f_color = col;
}
