#version 330

// these come from the programmable pipeline
uniform mat4 modelViewProjectionMatrix;
uniform mat4 textureMatrix;

uniform float displacement;

in vec4 position;

float random(vec2 st) {
  return fract(dot(st,vec2(689.436, 3843.53)));
}

void main()
{

    //float displacementHeight = 100.0;
    //float displacementY = sin(time + (position.y / 100.0)) * displacementHeight;
    //float displacementY = random(position.xy)*(sin(time + (position.y / 100.0))*200.+200.);
    //float displacementY = random(position.xy)*displacement;

    vec4 modifiedPosition = modelViewProjectionMatrix * position;
	//modifiedPosition.y += displacementY;
	gl_Position = modifiedPosition;
}
