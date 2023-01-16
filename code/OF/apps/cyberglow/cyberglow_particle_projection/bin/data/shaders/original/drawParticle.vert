#version 330

uniform sampler2DRect particles0;

uniform mat4 modelViewProjectionMatrix;

in vec4  position;
in vec2  texcoord;

out vec4 vertColor;

void main(){
    vec4 texel0 = texture(particles0, texcoord);
    vec4 pos = vec4(texel0.xyz, 1.0);
    float time = texel0.w;

    gl_Position = modelViewProjectionMatrix * pos;
    
    vertColor = vec4(time, pow(time, 3.0), 0.1, pow(time, 2.0)*0.8);
    
    gl_PointSize = 1.0;
}
