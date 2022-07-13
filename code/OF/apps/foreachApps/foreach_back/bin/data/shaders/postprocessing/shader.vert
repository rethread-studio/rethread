#version 330

// these come from the programmable pipeline
uniform mat4 modelViewProjectionMatrix;
uniform mat4 textureMatrix;

in vec4 position;
in vec2 texcoord;

// texture coordinates are sent to fragment shader
out vec2 texCoordVarying;

void main()
{
    texCoordVarying = texcoord;
    //texCoordVarying = position.xy*2.;
    gl_Position = modelViewProjectionMatrix * position;
}
