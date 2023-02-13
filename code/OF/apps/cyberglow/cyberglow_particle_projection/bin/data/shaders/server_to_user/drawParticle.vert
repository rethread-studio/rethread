#version 330

uniform sampler2DRect particles0;

uniform mat4 modelViewProjectionMatrix;

in vec4  position;
in vec2  texcoord;

out vec4 vertColor;

void main(){
    vec4 texel0 = texture(particles0, texcoord);
    vec4 pos = vec4(texel0.xy, 0.0, 1.0);
    float activated = texel0.z;
    float time = texel0.w;

    gl_Position = modelViewProjectionMatrix * pos;

    // vertColor = vec4(1.0 - time*0.01, time* 0.05, 0.04 * time, activated);
    vertColor = vec4(time*0.2, time* 0.02, 0.9 - 0.1 * time + 0.1, activated);
    
    gl_PointSize = 1.0;
}
