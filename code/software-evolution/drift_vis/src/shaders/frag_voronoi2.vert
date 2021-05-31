#version 450

// layout(location=0) in vec3 a_position;
// layout(location=1) in vec4 a_color;

// layout(location=0) out vec4 v_color;

const vec2 positions[6] = vec2[6](
    vec2(1.0, 1.0),
    vec2(-1.0, 1.0),
    vec2(-1.0, -1.0),
    vec2(-1.0, -1.0),
    vec2(1.0, -1.0),
    vec2(1.0, 1.0)
);

void main() {
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
}
