#version 330
precision highp float;


uniform sampler2DRect tex0;
uniform vec2 mouse;
uniform vec2 resolution;
uniform vec2 outputResolution;
uniform float gain;
uniform float exponent;
uniform float invertY;
uniform float pixelsProcessed;

in vec2 texCoordVarying;


out vec4 outputColor;

float sum(vec3 c) {
    return c.x+c.y+c.z;
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float luma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}


void main()
{
	vec2 st = ((gl_FragCoord.xy/outputResolution)-0.5);
  st.y = ((st.y * -1.0) * invertY) + (st.y * (1.0 - invertY));
  st *= outputResolution;
  float zoom2 = outputResolution.y/resolution.y;
  vec2 imageSize = resolution * zoom2;
  st += imageSize * 0.5;
  st /= zoom2;
	vec2 texCoord = st;
  float pixelIndex = st.x + resolution.x*st.y;
  vec3 org_color = texture(tex0, texCoord).rgb;

  float luma = luma(org_color);
  vec3 c0 = vec3(1.0, 0.2, 0.7) * 1.3;
  vec3 c1 = vec3(0.1, 0.7, 1.2) * 1.5;

  float linear_luma = pow(luma + gain, exponent);
  vec3 color = mix(c1, c0, smoothstep(0.1, 1.0, linear_luma));
  color = mix(org_color, color, smoothstep(0.0, 0.1, linear_luma));
  color = mix(color, c0, smoothstep(0.7, 1.0, linear_luma));
  color*= (pow(luma + 0.1, 1.5) + 0.1);

  float alpha = 1.0;
  vec3 line_green = vec3(0.2, 1.0, 0.2);
  color = mix(org_color, color, float(pixelIndex <= pixelsProcessed));
  color = mix(color, line_green, float(pixelIndex > pixelsProcessed && pixelIndex < pixelsProcessed + resolution.x*3));

  outputColor = vec4(color, alpha);
}
