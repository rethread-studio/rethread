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
  vec4 color = vec4(0.0);

  vec4 c_u = texture(tex1, st+vec2(0, 1)).rgba;
  vec4 c_d = texture(tex1, st+vec2(0, -1)).rgba;
  vec4 c_r = texture(tex1, st+vec2(1, 0)).rgba;
  vec4 c_l = texture(tex1, st+vec2(-1, 0)).rgba;
  float trail_alpha = max(max(max(c_u.a, c_d.a), c_r.a), c_l.a);
  color += (c_u + c_d + c_r + c_l) * 0.239 * fadeCoeff;
  c_u = texture(tex1, st+vec2(0, 2)).rgba;
  c_d = texture(tex1, st+vec2(0, -2)).rgba;
  c_r = texture(tex1, st+vec2(2, 0)).rgba;
  c_l = texture(tex1, st+vec2(-2, 0)).rgba;
  trail_alpha = max(max(max(max(c_u.a, c_d.a), c_r.a), c_l.a), trail_alpha);
  color += (c_u + c_d + c_r + c_l) * 0.0105* fadeCoeff;

  float c_sum = sum(new_color);
  float trail_sum = sum(color.rgb);
  float has_color = float(c_sum > 0.0);

  // use 1.0 as alpha if there is color in the newly drawn stuff, otherwise fade out alpha
  alpha = max(trail_alpha * 0.99 - 0.01, alpha * has_color);

  // fade trails if too bright
  // color *= smoothstep(3.0, brightnessFadeLow, trail_sum) * 0.07 + 0.93;

  // fade out if there's no color in the particle texture
  // alpha = smoothstep(0.1, 0.3, (c_sum + trail_sum) * 0.16);
  vec3 out_color = has_color * new_color + (1.0 - has_color) * color.rgb * brightnessFade;
  // avoid blowing out colors
  // float alpha = 1.0;
  // color = vec3(st.xy, 1.0);

  outputColor = vec4(out_color, pow(alpha, 2.5));
}
