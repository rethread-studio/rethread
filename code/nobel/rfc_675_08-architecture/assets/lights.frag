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

// float Ripples(vec2 st, float size, float activity) {
//     float pct = 1.0;
//     size *= 0.5;
//     pct *= smoothstep(-size*1.4, -size*0.9, st.x);
//     pct *= smoothstep(size*1.4, size*0.9, st.x);
//     pct *= smoothstep(-size*1.4, -size*0.9, st.y);
//     pct *= smoothstep(size*1.4, size*0.9, st.y);
//     size *= 1.5;
//     float d = max(1.-(length(st)/size), 0.0);
//     d += iTime* 0.000001;
//     d *= sin(d*30.-(iTime*10.))*0.5+.5;
//     return d*pct;
// }

float Ripples(vec2 st, float size, float activity) {
    float pct = 1.0;
    size *= 0.45;
    pct *= smoothstep(-size*1.4, -size*0.1, st.x);
    pct *= smoothstep(size*1.4, size*0.1, st.x);
    pct *= smoothstep(-size*1.4, -size*0.1, st.y);
    pct *= smoothstep(size*1.4, size*0.1, st.y);
    // pct = min(pct, 1.0);
    float d = 0.;
    d += step(0., st.x) * step(abs(st.y), st.x) * st.x;
    d += step(st.x, 0.) * step(st.x, abs(st.y)*-1.) * st.x * -1.;
    d += step(0., st.y) * step(abs(st.x), st.y) * st.y;
    d += step(st.y, 0.) * step(st.y, abs(st.x)*-1.) * st.y * -1.;
    size *= 0.9;
    d = max(1.-(d/size), 0.0);
    d *= sin(d*40. * activity-(iTime*10.))*0.5+.5;
    return pow(d, 2.0)*pow(pct, 2.);
}


void main() {
    vec2 st = (gl_FragCoord.xy/iResolution.xy)-.5;
    st.x *= 0.75;
    float t = iTime;
    float pct = 0.;

    // Random brightness
    // pct += band(sin(t)*20.+20., vec2(0., 0.36), st);
    // pct += band(sin(t*0.8 + 0.2343)*20.+20., vec2(0., 0.13), st);
    // pct += band(sin(t*0.7 + .63)*20.+20., vec2(0., -0.101), st);
    // pct += band(sin(t*0.68 + 2.582)*20.+20., vec2(0., -0.333), st);

    // brightness from data
    // pct += light(windows1[0], vec2(-0.4, 0.45), st);
    // pct += light(windows1[1], vec2(0., 0.45), st);
    // pct += light(windows1[2], vec2(0.4, 0.45), st);
    // pct += light(windows2[0], vec2(-0.4, 0.25), st);
    // pct += light(windows2[1], vec2(0., 0.25), st);
    // pct += light(windows2[2], vec2(0.4, 0.25), st);
    // pct += light(windows3[0], vec2(-0.4, 0.02), st);
    // pct += light(windows3[1], vec2(0., 0.02), st);
    // pct += light(windows3[2], vec2(0.4, 0.02), st);
    // pct += light(windows4[0], vec2(-0.4, -0.22), st);
    // pct += light(windows4[1], vec2(0., -0.22), st);
    // pct += light(windows4[2], vec2(0.4, -0.22), st);
    // pct += light(windows5[0], vec2(-0.4, -0.43), st);
    // pct += light(windows5[1], vec2(0., -0.43), st);
    // pct += light(windows5[2], vec2(0.4, -0.43), st);

    // vec3 col = vec3(1.0, 0.5882, 0.2) * pct;

    vec3 col = vec3(.0);

    // vec3 orange = vec3(0., -0.7, -0.6) * -1.;
    vec3 orange = vec3(1.0, (sin(t) * .5 + .5) *.2667, 0.2667);
    // col = light(windows1[0] * 0.5 + 0.5, vec2(-0.4, 0.45), st) * vec3(1.0, windows1[0] * 0.78 + 0.2, 0.5);
    // col += Ripples(st - vec2(-0.4, 0.5), 0.25, windows1[0]) * windows1[0] * orange;
    // col += Ripples(st - vec2(0., 0.5), 0.25, windows1[1]) * windows1[1] * orange;
    // col += Ripples(st - vec2(0.4, 0.5), 0.25, windows1[2]) * windows1[2] * orange;
    // col += Ripples(st - vec2(-0.4, 0.25), 0.25, windows2[0]) * windows2[0] * orange;
    // col += Ripples(st - vec2(0., 0.25), 0.25, windows2[1]) * windows2[1] * orange;
    // col += Ripples(st - vec2(0.4, 0.25), 0.25, windows2[2]) * windows2[2] * orange;
    // col += Ripples(st - vec2(-0.4, 0.02), 0.25, windows3[0]) * windows3[0] * orange;
    // col += Ripples(st - vec2(0., 0.02), 0.25, windows3[1]) * windows3[1] * orange;
    // col += Ripples(st - vec2(0.4, 0.02), 0.25, windows3[2]) * windows3[2] * orange;
    // col += Ripples(st - vec2(-0.4, -0.22), 0.25, windows4[0]) * windows4[0] * orange;
    // col += Ripples(st - vec2(0., -0.22), 0.25, windows4[1]) * windows4[1] * orange;
    // col += Ripples(st - vec2(0.4, -0.22), 0.25, windows4[2]) * windows4[2] * orange;
    // col += Ripples(st - vec2(-0.4, -0.43), 0.25, windows5[0]) * windows5[0] * orange;
    // col += Ripples(st - vec2(0., -0.43), 0.25, windows5[1]) * windows5[1] * orange;
    // col += Ripples(st - vec2(0.4, -0.43), 0.25, windows5[2]) * windows5[2] * orange;

    pct += Ripples(st - vec2(-0.303, 0.47), 0.25, windows1[0]) * windows1[0];
    pct += Ripples(st - vec2(0., 0.47), 0.25, windows1[1]) * windows1[1];
    pct += Ripples(st - vec2(0.303, 0.47), 0.25, windows1[2]) * windows1[2];
    pct += Ripples(st - vec2(-0.303, 0.25), 0.25, windows2[0]) * windows2[0];
    pct += Ripples(st - vec2(0., 0.25), 0.25, windows2[1]) * windows2[1];
    pct += Ripples(st - vec2(0.303, 0.25), 0.25, windows2[2]) * windows2[2];
    pct += Ripples(st - vec2(-0.303, 0.017), 0.25, windows3[0]) * windows3[0];
    pct += Ripples(st - vec2(0., 0.017), 0.25, windows3[1]) * windows3[1];
    pct += Ripples(st - vec2(0.303, 0.017), 0.25, windows3[2]) * windows3[2];
    pct += Ripples(st - vec2(-0.303, -0.218), 0.25, windows4[0]) * windows4[0];
    pct += Ripples(st - vec2(0., -0.22), 0.25, windows4[1]) * windows4[1];
    pct += Ripples(st - vec2(0.303, -0.218), 0.25, windows4[2]) * windows4[2];
    pct += Ripples(st - vec2(-0.303, -0.443), 0.25, windows5[0]) * windows5[0];
    pct += Ripples(st - vec2(0., -0.443), 0.25, windows5[1]) * windows5[1];
    pct += Ripples(st - vec2(0.303, -0.443), 0.25, windows5[2]) * windows5[2];

    pct = smoothstep(0.0, 0.01, pct);
    col += pct * orange;
    // pct = smoothstep(0.0, 0.01, pct);


    // col = vec3(st.x, st.y, 0.);
    // pct = 1.0;

    gl_FragColor = vec4(col, pct );
}