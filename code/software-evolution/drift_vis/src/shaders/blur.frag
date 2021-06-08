#version 450
// Adapted from:
// http://callumhay.blogspot.com/2010/09/gaussian-blur-shader-glsl.html

layout(location=0) out vec4 f_color;
in vec4 gl_FragCoord;

layout(std140, set=0, binding=0)
uniform Uniforms {
  vec2 resolution;
  int blur_size;
  float sigma;
  // The sigma value for the gaussian function: higher value means more blur
  // A good value for 9x9 is around 3 to 5
  // A good value for 7x7 is around 2.5 to 4
  // A good value for 5x5 is around 2 to 3.5
  // ... play around with this based on what you need :)
  vec2 tex_offset;
};

// varying vec4 vertTexCoord;

layout(set = 1, binding = 0) uniform texture2D t_diffuse;
layout(set = 1, binding = 1) uniform sampler s_diffuse;

//const vec2 texOffset = vec2(1.0, 1.0);
const float PI = 3.14159265;

void main() {
  vec2 p = (gl_FragCoord.xy/resolution);
  // vec2 p = vertTexCoord.st;
  float numBlurPixelsPerSide = float(blur_size / 2);
  vec2 offset = tex_offset / resolution;
  
  // Incremental Gaussian Coefficent Calculation (See GPU Gems 3 pp. 877 - 889)
  vec3 incrementalGaussian;
  incrementalGaussian.x = 1.0 / (sqrt(2.0 * PI) * sigma);
  incrementalGaussian.y = exp(-0.5 / (sigma * sigma));
  incrementalGaussian.z = incrementalGaussian.y * incrementalGaussian.y;

  vec4 avgValue = vec4(0.0, 0.0, 0.0, 0.0);
  float coefficientSum = 0.0;

  // Take the central sample first...
  avgValue += texture(sampler2D(t_diffuse, s_diffuse), p) * incrementalGaussian.x;
  coefficientSum += incrementalGaussian.x;
  incrementalGaussian.xy *= incrementalGaussian.yz;

  // Go through the remaining 8 vertical samples (4 on each side of the center)
  for (float i = 1.0; i <= numBlurPixelsPerSide; i++) { 
    avgValue += texture(sampler2D(t_diffuse, s_diffuse), p - i * offset) * incrementalGaussian.x;
    avgValue += texture(sampler2D(t_diffuse, s_diffuse), p + i * offset) * incrementalGaussian.x;
    coefficientSum += 2.0 * incrementalGaussian.x;
    incrementalGaussian.xy *= incrementalGaussian.yz;
  }
  vec4 col = avgValue / coefficientSum;
  // col *= vec4(1.1, 0.5, 0.5, 1.0);
  f_color = col;
}
