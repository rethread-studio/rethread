#version 330

uniform sampler2DRect particles0;

uniform mat4 modelViewProjectionMatrix;

in vec4  position;
in vec2  texcoord;

out vec4 vertColor;

const float SCALE = 2.5;

void main(){
    vec4 texel0 = texture(particles0, texcoord);
    vec4 pos = vec4(texel0.xyz * SCALE, 1.0);
    float time = texel0.w;

    // offset the position from the center so the different particle systems are a bit separated
    pos.z += 15.0;
    pos.x -= 10.0;

    gl_Position = modelViewProjectionMatrix * pos;
    
    vertColor = vec4(time *0.6  + 0.4, 0.2, time * 0.6, pow(time, 0.25) );
    
    gl_PointSize = 1.0;
}
