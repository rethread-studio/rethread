#version 330
precision highp float;


uniform sampler2DRect tex0;
uniform vec2 mouse;
uniform vec2 resolution;
uniform vec2 outputResolution;
uniform float zoom;
uniform float alpha;
uniform float invertY;

in vec2 texCoordVarying;


out vec4 outputColor;


void main()
{
	vec2 st = ((gl_FragCoord.xy/outputResolution)-0.5);
  st.y = ((st.y * -1.0) * invertY) + (st.y * (1.0 - invertY));
  st *= outputResolution;
  float zoom2 = outputResolution.y/resolution.y + zoom;
  vec2 imageSize = resolution * zoom2;
  st += imageSize * 0.5;
  st /= zoom2;
	vec2 texCoord = st;
	// vec2 st = ((gl_FragCoord.xy/outputResolution)-0.5);
  // st.y = ((st.y * -1.0) * invertY) + (st.y * (1.0 - invertY));
  // st *= outputResolution;
  // vec2 imageSize = resolution * zoom;
  // st += imageSize * 0.5;
  // st /= zoom;
	// vec2 texCoord = st;
  vec3 color = texture(tex0, texCoord).rgb;

  float fx = fract(texCoord.x);
  float fy = fract(texCoord.y);
  // Split into pixels
  vec3 split_color = color * vec3(fy < 0.33, fy >= 0.33 && fy < 0.66, fy >= 0.66);
  split_color *= vec3(fx > 0.04 && fx < 0.96); // Apply border

  float apply_fx = float(zoom > 1.2);
  color = split_color * apply_fx + color * (1.0-apply_fx);


  outputColor = vec4(color, alpha);
}
