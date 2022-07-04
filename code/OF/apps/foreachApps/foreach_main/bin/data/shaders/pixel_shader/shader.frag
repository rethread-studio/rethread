#version 330
precision highp float;


uniform sampler2DRect tex0;
uniform vec2 mouse;
uniform vec2 resolution;
uniform vec2 outputResolution;
uniform float zoom;

in vec2 texCoordVarying;


out vec4 outputColor;


void main()
{
	vec2 st = ((gl_FragCoord.xy/outputResolution)-0.5);
  st.y *= -1.0;
  st *= outputResolution;
  vec2 imageSize = resolution * zoom;
  st += imageSize * 0.5;
  st /= zoom;
	vec2 texCoord = st;
  vec3 color = texture(tex0, texCoord).rgb;

  float fx = fract(texCoord.x);
  float fy = fract(texCoord.y);
  color *= vec3(fy < 0.33, fy >= 0.33 && fy < 0.66, fy >= 0.66);
  color *= vec3(fx > 0.04 && fx < 0.96);

  float alpha = 1.0;

  outputColor = vec4(color, alpha);
}
