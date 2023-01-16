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


// Rampe5 Attractor
// newx=y*sin(a*x)+cos(b*y)+sin(c*z)
// newy=z*sin(d*x)+cos(e*y)+sin(f*z)
// newz=x*sin(g*x)+cos(h*y)+sin(i*z)

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) * 5.0 - 2.5;
}

const float TTL = 300.0;

void main(){
    int id = int(texCoordVarying.s) + int(texCoordVarying.t)*int(textureSize(particles0).x);
    vec3 pos = texture(particles0, texCoordVarying.st).xyz;
    vec3 time = texture(particles1, texCoordVarying.st).xyz;

    // TODO: Replace with branchless
        if(id >= trigger_start_id  && id < trigger_start_id + num_triggered) {
            // pos = vec3(rand(pos.xy), rand(pos.zy), rand(pos.xz));
            time = vec3(TTL, 0.0, 0.0);
        }
    time.x -= 1.0;
    
    posOut = vec4(pos, clamp(time.x/TTL, 0.0, 1.0));
    timeOut = vec4(time, 0.0);
}
