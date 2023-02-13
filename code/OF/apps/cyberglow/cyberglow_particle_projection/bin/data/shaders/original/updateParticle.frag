#version 330

// ping pong inputs
uniform sampler2DRect particles0;
uniform sampler2DRect particles1;

uniform float timestep;
uniform int num_triggered;
uniform int trigger_start_id;

in vec2 texCoordVarying;

layout(location = 0) out vec4 posOut;
layout(location = 1) out vec4 timeOut;

float dx = 0.0;
float dy = 0.0;
float dz = 0.0;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) * 20.0 - 10.0;
}


void main(){
    int id = int(texCoordVarying.s) + int(texCoordVarying.t)*int(textureSize(particles0).x);
    vec3 pos = texture(particles0, texCoordVarying.st).xyz;
    vec3 time = texture(particles1, texCoordVarying.st).xyz;

    // TODO: Replace with branchless
        if(id >= trigger_start_id  && id < trigger_start_id + num_triggered) {
            // pos = vec3(rand(pos.xy), rand(pos.zy), rand(pos.xz));
            time = vec3(200.0, 0.0, 0.0);
        }
    time.x -= 1.0;
    
    // get the previous position
    float x = pos.x;
    float y = pos.y;
    float z = pos.z;
    
    // Dedras
    float a = 3;
    float b = 2.7;
    float c = 1.7;
    float d = 2;
    float e = 9;
    
    dx = (y- a*x +b*y*z) * timestep;
    dy = (c*y -x*z +z) * timestep;
    dz = (d*x*y - e*z) * timestep;
    
    vec3 attractorForce = vec3(dx, dy, dz) ;
    pos += attractorForce;
    
    posOut = vec4(pos, clamp(time.x/200.0, 0.0, 1.0));
    timeOut = vec4(time, 0.0);
}
