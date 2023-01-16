#version 330

// ping pong inputs
uniform sampler2DRect particles0;
uniform sampler2DRect particles1;

uniform float timestep;
uniform float total_time;
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
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) * 20.0 - 10.;
}

const float TTL = 400.0;

void main(){
    int id = int(texCoordVarying.s) + int(texCoordVarying.t)*int(textureSize(particles0).x);
    vec3 pos = texture(particles0, texCoordVarying.st).xyz;
    vec3 time = texture(particles1, texCoordVarying.st).xyz;

    // TODO: Replace with branchless
        if(id >= trigger_start_id  && id < trigger_start_id + num_triggered) {
            pos = vec3(rand(pos.xy), rand(pos.zy), rand(pos.xz));
            time = vec3(TTL, 0.0, 0.0);
        }
    time.x -= 1.0;
    
    // get the previous position
    float x = pos.x;
    float y = pos.y;
    float z = pos.z;
    
    // Dedras
    float a = -0.9896 + (total_time * 0.001);
    float b = 1.59303;
    float c = 0.67615;
    float d = -0.5314;
    float e = 0.30705;
    float f = 0.52351 - (total_time * 0.0015);
    float g = -0.2949;
    float h = -0.2542;
    float i = -0.7666;

    float dt = timestep * 8.0;

    dx = (y * sin(a*x) + cos(b*y) + sin(c*z)) * dt;
    dy = (z * sin(d*x) + cos(e*y) + sin(f*z)) * dt;
    dz = (x * sin(g*x) + cos(h*y) + sin(i*z)) * dt;
    
    vec3 attractorForce = vec3(dx, dy, dz) ;
    pos += attractorForce;

    posOut = vec4(pos, clamp(time.x/TTL, 0.0, 1.0));
    timeOut = vec4(time, 0.0);
}
