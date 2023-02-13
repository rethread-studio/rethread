#version 330
precision highp float;


uniform float fadeCoeff;
uniform float brightnessFadeLow;
uniform float brightnessFade;
uniform sampler2DRect tex0;
uniform sampler2DRect tex1;
uniform vec2 mouse;
uniform vec2 resolution;

in vec2 texCoordVarying;


out vec4 outputColor;

float sum(vec3 c) {
    return c.x+c.y+c.z;
}

void main()
{
	vec2 st = gl_FragCoord.xy;
	// get texture colour
	vec4 data =  texture(tex0, st).rgba;// * rgba(1., 0., 0. ,1.);
  float alpha = data.a;
  vec3 new_color = data.rgb;
  vec3 color = vec3(0.0);

  vec3 c_u = texture(tex1, st+vec2(0, 1)).rgb;
  vec3 c_d = texture(tex1, st+vec2(0, -1)).rgb;
  vec3 c_r = texture(tex1, st+vec2(1, 0)).rgb;
  vec3 c_l = texture(tex1, st+vec2(-1, 0)).rgb;
  color += (c_u + c_d + c_r + c_l) * 0.239;
  c_u = texture(tex1, st+vec2(0, 2)).rgb;
  c_d = texture(tex1, st+vec2(0, -2)).rgb;
  c_r = texture(tex1, st+vec2(2, 0)).rgb;
  c_l = texture(tex1, st+vec2(-2, 0)).rgb;
  color += (c_u + c_d + c_r + c_l) * 0.0105* fadeCoeff;


  float c_sum = sum(new_color);
  float trail_sum = sum(color);

  // fade trails if too bright
  color *= smoothstep(3.0, brightnessFadeLow, trail_sum) * 0.37 + 0.63;

  float has_color = float(c_sum > 0.0);
  // fade out if there's no color in the particle texture
  alpha = 1.0;
  color = has_color * new_color + (1.0 - has_color) * color * brightnessFade;
  // avoid blowing out colors
  // float alpha = 1.0;
  // color = vec3(st.xy, 1.0);

  outputColor = vec4(color, alpha);
}
