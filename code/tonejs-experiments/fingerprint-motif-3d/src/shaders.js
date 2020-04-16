var vShader = `varying vec2 vUv; 
void main()
{
    vUv = uv;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );
    gl_Position = projectionMatrix * mvPosition;
}`;

// This is where the magic happens
// https://stackoverflow.com/questions/24820004/how-to-implement-a-shadertoy-shader-in-three-js
// for coordinates, use `vec2 p = -1.0 + 2.0 *vUv;`

var fingerprintFShader = `
uniform float time;
uniform vec2 resolution;
uniform float alpha;
varying vec2 vUv;

#define THETA 2.399963229728653 //THETA is the golden angle in radians: 2 * PI * ( 1 - 1 / PHI )
vec2 spiralPosition(float t)
{
    float angle = t * THETA - time * .001; 
    float radius = ( t + .5 ) * .5;
    return vec2( radius * cos( angle ) + .5, radius * sin( angle ) + .5 );
}

void main()
{
    vec2 uv = -1.0 + 2.0 *vUv;
    uv *= 500.0;
    float a = 0.;
    float d = 50.;
    for(int i = 0; i < 256; i++)
    {
        vec2 pointDist = uv - spiralPosition( float(i) ) * 6.66;
        a += atan( pointDist.x, pointDist.y );
        d = min( dot( pointDist, pointDist ), d );
    }
    d = sqrt( d ) * .02;
    d = 1. - pow( 1. - d, 32. );
    a += sin( length( uv ) * .01 + time * .5 ) * 2.75;
    vec3 col  = d * (.5 + .5 * sin( a + time + vec3( 2.9, 1.7, 0 ) ) );
    col   = d * smoothstep( .75, 1.0, vec3( .5 + .5 * sin( a + time * -1. ) ) );
    gl_FragColor = vec4( col, alpha );
}
`;


var colorBandFShader = `
uniform float time;
uniform vec2 resolution;

varying vec2 vUv;

vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.28318*(c*t+d) );
}

void main()
{
	vec2 p = -1.0 + 2.0 *vUv;
    
    // animate
    p.x += 0.11*time;
    
    // compute colors
    vec3                col = pal( p.x, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67) );
    if( p.y>(1.0/7.0) ) col = pal( p.x, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.10,0.20) );
    if( p.y>(2.0/7.0) ) col = pal( p.x, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.3,0.20,0.20) );
    if( p.y>(3.0/7.0) ) col = pal( p.x, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,0.5),vec3(0.8,0.90,0.30) );
    if( p.y>(4.0/7.0) ) col = pal( p.x, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,0.7,0.4),vec3(0.0,0.15,0.20) );
    if( p.y>(5.0/7.0) ) col = pal( p.x, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(2.0,1.0,0.0),vec3(0.5,0.20,0.25) );
    if( p.y>(6.0/7.0) ) col = pal( p.x, vec3(0.8,0.5,0.4),vec3(0.2,0.4,0.2),vec3(2.0,1.0,1.0),vec3(0.0,0.25,0.25) );
    

    // band
    float f = fract(p.y*7.0);
    // borders
    col *= smoothstep( 0.49, 0.47, abs(f-0.5) );
    // shadowing
    col *= 0.5 + 0.5*sqrt(4.0*f*(1.0-f));
    // dithering
    // col += (1.0/255.0)*texture( iChannel0, fragCoord.xy/iChannelResolution[0].xy ).xyz;

	gl_FragColor = vec4( col, 1.0 );
}

`;


//                 fragmentShader: `
//                 uniform float time;
//                 uniform vec2 resolution;
                
//                 varying vec2 vUv;
                
// float opSmoothUnion( float d1, float d2, float k )
// {
//     float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
//     return mix( d2, d1, h ) - k*h*(1.0-h);
// }

// float sdSphere( vec3 p, float s )
// {
//   return length(p)-s;
// } 

// float map(vec3 p)
// {
// 	float d = 2.0;
// 	for (int i = 0; i < 16; i++)
// 	{
// 		float fi = float(i);
// 		float t = time * (fract(fi * 412.531 + 0.513) - 0.5) * 2.0;
// 		d = opSmoothUnion(
//             sdSphere(p + sin(t + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8), mix(0.5, 1.0, fract(fi * 412.531 + 0.5124))),
// 			d,
// 			0.4
// 		);
// 	}
// 	return d;
// }

// vec3 calcNormal( in vec3 p )
// {
//     const float h = 1e-5; // or some other value
//     const vec2 k = vec2(1,-1);
//     return normalize( k.xyy*map( p + k.xyy*h ) + 
//                       k.yyx*map( p + k.yyx*h ) + 
//                       k.yxy*map( p + k.yxy*h ) + 
//                       k.xxx*map( p + k.xxx*h ) );
// }

// void main()
// {
//     vec2 uv = -1.0 + 2.0 *vUv;
    
//     // screen size is 6m x 6m
// 	vec3 rayOri = vec3((uv - 0.5) * 6.0, 3.0);
// 	vec3 rayDir = vec3(0.0, 0.0, -1.0);
	
// 	float depth = 0.0;
// 	vec3 p;
	
// 	for(int i = 0; i < 64; i++) {
// 		p = rayOri + rayDir * depth;
// 		float dist = map(p);
//         depth += dist;
// 		if (dist < 1e-6) {
// 			break;
// 		}
// 	}
	
//     depth = min(6.0, depth);
// 	vec3 n = calcNormal(p);
//     float b = max(0.0, dot(n, vec3(0.577)));
//     vec3 col = (0.5 + 0.5 * cos((b + time * 3.0) + uv.xyx * 2.0 + vec3(0,2,4))) * (0.85 + b * 0.35);
//     col *= exp( -depth * 0.15 );
	
//     // maximum thickness is 2m in alpha channel
//     gl_FragColor = vec4(col, 1.0 - (depth - 0.5) / 2.0);
// }`,

export {fingerprintFShader, vShader, colorBandFShader}