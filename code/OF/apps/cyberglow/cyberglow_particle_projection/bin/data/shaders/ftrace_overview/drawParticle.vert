#version 330

uniform sampler2DRect particles0;

uniform mat4 modelViewProjectionMatrix;

in vec4  position;
in vec2  texcoord;

out vec4 vertColor;

void main(){
    vec4 texel0 = texture(particles0, texcoord);
    vec4 pos = vec4(texel0.xy, 0.0, 1.0);
    float total_time = texel0.z;
    float time = texel0.w; // 0 to 1 over the lifespan of the particle

    gl_Position = modelViewProjectionMatrix * pos;

    float time_alpha = (pow(sin(time * 3.1415), 2.0)) * 0.2 + 0.01;
    time_alpha *= float(time > 0.0); // Make sure deactivated particles are completely transparent
    vertColor = vec4(
        clamp(time*0.5 + (sin(total_time * 0.005) * 0.2 + 0.2), 0., 1.),
        clamp((sin(total_time * 0.072362) * 0.4 + 0.4), 0., 1.),
        1.0 - 0.84 * pow(time, 2.0) - (sin(total_time * 0.072362) * 0.08 + 0.08),
        time_alpha);

    
    gl_PointSize = 1.0;
}
