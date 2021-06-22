uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
uniform vec2 pixels;
float PI=3.141592653589793238;
uniform float distanceFromCenter;
void main(){
    vUv=(uv-vec2(.5))*(.8-.2*distanceFromCenter*(2.-distanceFromCenter))+vec2(.5);
    vec3 pos=position;
    pos.y+=sin(PI*uv.x)*.01;
    pos.z+=sin(PI*uv.x)*.02;
    
    pos.y+=sin(time*.3)*.02;
    vUv.y-=sin(time*.3)*.02;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
}