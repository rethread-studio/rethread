precision highp float;
varying vec2 vTexCoord;

uniform float iTime;
uniform vec3 iResolution;

uniform vec3 windows1;
uniform vec3 windows2;
uniform vec3 windows3;
uniform vec3 windows4;
uniform vec3 windows5;
  
mat2 rotate(float a){
    float c=cos(a),s=sin(a);
    return mat2(c,-s,s,c);
}

float random (in vec2 _st) {
    return fract(sin(dot(_st.xy,
        vec2(12.9898,78.233)))*
        43758.5453123);
}

float light (in float brightness, in vec2 p, in vec2 uv) {
    vec2 j = (p - vec2(uv.x, uv.y))*1.;
    // float sparkle = 1./max(dot(j, j), .005);
    float scaler = 1.0 - pow(1.-brightness, 2.0);
    float sparkle = pow(min((1./(dot(j, j))*0.001 * scaler), 1.), 0.6);

    return sparkle;//(sin(fract(p.x)*1000.)*.5+.5); // fract around position fixes bounding box artefact
}


void main() {
    vec2 st = (gl_FragCoord.xy/iResolution.xy)-.5;
    float t = iTime;
    float pct = 0.;

    // Random brightness
    // pct += band(sin(t)*20.+20., vec2(0., 0.36), st);
    // pct += band(sin(t*0.8 + 0.2343)*20.+20., vec2(0., 0.13), st);
    // pct += band(sin(t*0.7 + .63)*20.+20., vec2(0., -0.101), st);
    // pct += band(sin(t*0.68 + 2.582)*20.+20., vec2(0., -0.333), st);

    // brightness from data
    pct += light(windows1[0], vec2(-0.4, 0.45), st);
    pct += light(windows1[1], vec2(0., 0.45), st);
    pct += light(windows1[2], vec2(0.4, 0.45), st);
    pct += light(windows2[0], vec2(-0.4, 0.25), st);
    pct += light(windows2[1], vec2(0., 0.25), st);
    pct += light(windows2[2], vec2(0.4, 0.25), st);
    pct += light(windows3[0], vec2(-0.4, 0.02), st);
    pct += light(windows3[1], vec2(0., 0.02), st);
    pct += light(windows3[2], vec2(0.4, 0.02), st);
    pct += light(windows4[0], vec2(-0.4, -0.22), st);
    pct += light(windows4[1], vec2(0., -0.22), st);
    pct += light(windows4[2], vec2(0.4, -0.22), st);
    pct += light(windows5[0], vec2(-0.4, -0.43), st);
    pct += light(windows5[1], vec2(0., -0.43), st);
    pct += light(windows5[2], vec2(0.4, -0.43), st);

    // vec3 col = vec3(1.0, 0.5882, 0.2) * pct;

    vec3 col = vec3(0.0);

    col = light(windows1[0] * 0.5 + 0.5, vec2(-0.4, 0.45), st) * vec3(1.0, windows1[0] * 0.38 + 0.2, 0.2);
    col += light(windows1[1], vec2(0., 0.45), st) * vec3(1.0, windows1[1] * 0.38 + 0.2, 0.2);
    col += light(windows1[2], vec2(0.4, 0.45), st) * vec3(1.0, windows1[2] * 0.38 + 0.2, 0.2);
    col += light(windows2[0], vec2(-0.4, 0.25), st) * vec3(1.0, windows2[0] * 0.38 + 0.2, 0.2);
    col += light(windows2[1], vec2(0., 0.25), st) * vec3(1.0, windows2[1] * 0.38 + 0.2, 0.2);
    col += light(windows2[2], vec2(0.4, 0.25), st) * vec3(1.0, windows2[2] * 0.38 + 0.2, 0.2);
    col += light(windows3[0], vec2(-0.4, 0.02), st) * vec3(1.0, windows3[0] * 0.38 + 0.2, 0.2);
    col += light(windows3[1], vec2(0., 0.02), st) * vec3(1.0, windows3[1] * 0.38 + 0.2, 0.2);
    col += light(windows3[2], vec2(0.4, 0.02), st) * vec3(1.0, windows3[2] * 0.38 + 0.2, 0.2);
    col += light(windows4[0], vec2(-0.4, -0.22), st) * vec3(1.0, windows4[0] * 0.38 + 0.2, 0.2);
    col += light(windows4[1], vec2(0., -0.22), st) * vec3(1.0, windows4[1] * 0.38 + 0.2, 0.2);
    col += light(windows4[2], vec2(0.4, -0.22), st) * vec3(1.0, windows4[2] * 0.38 + 0.2, 0.2);
    col += light(windows5[0], vec2(-0.4, -0.43), st) * vec3(1.0, windows5[0] * 0.38 + 0.2, 0.2);
    col += light(windows5[1], vec2(0., -0.43), st) * vec3(1.0, windows5[1] * 0.38 + 0.2, 0.2);
    col += light(windows5[2], vec2(0.4, -0.43), st) * vec3(1.0, windows5[2] * 0.38 + 0.2, 0.2);

    // col = vec3(st.x, st.y, 0.);

    gl_FragColor = vec4(col, pow(pct, 3.0));
}