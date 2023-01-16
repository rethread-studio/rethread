#version 330

// ping pong inputs
uniform sampler2DRect particles0;
uniform sampler2DRect particles1;

uniform float total_time;
uniform float timestep;
uniform int num_triggered;
uniform int trigger_start_id;
uniform vec2 origin_pos;
uniform vec2 target_pos;

in vec2 texCoordVarying;

layout(location = 0) out vec4 posOut;
layout(location = 1) out vec4 velOut;

const float TARGET_ACCELERATION = 0.23;
// const float NOISE_ACCELERATION = 0.3;
const float NOISE_ACCELERATION = 0.01;
const float TTL = 5.0;

float dx = 0.0;
float dy = 0.0;
float dz = 0.0;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) * 50.0 - 25.0;
}
float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}

// noise from here: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
//
//	Simplex 3D Noise
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

const float PI = 3.14159;
const vec2 zone1 = vec2(-100, 0);
const vec2 zone2 = vec2(100, 900);
const vec2 zone_center = vec2(-250, 0);
void main(){
    int id = int(texCoordVarying.s) + int(texCoordVarying.t)*int(textureSize(particles0).x);
    vec4 pos_data = texture(particles0, texCoordVarying.st);
    vec4 vel_data = texture(particles1, texCoordVarying.st);
    vec2 vel = vel_data.xy;
    vec2 pos = pos_data.xy;
    float time = vel_data.z;
    float activated = vel_data.w;

    // TODO: Replace with branchless
        if(id >= trigger_start_id  && id < trigger_start_id + num_triggered) {
            float clock_angle = floor(total_time) * PI*(1.0/(sin(total_time)*20.0 + 20.)) * 3.0 + id* 0.000005;
            vec2 clock_pos = vec2(cos(clock_angle), sin(clock_angle)) * 200.0;
            pos = vec2(origin_pos.x, origin_pos.y) + clock_pos;
            // vel = vec2(rand(vec2(float(id + 10000), pos.x)), rand(vec2(pos.y, float(id+ 20000)))) * 0.1;
            vel = vec2(0.)
                + vec2(rand(vec2(float(id) * 0.01, pos.x)), rand(vec2(pos.y, float(id)*0.01))) * 0.3;
            time = 0.;
            activated = 1.0;
        }

    time += timestep;

    float dist_from_target = distance(pos, target_pos);
    activated = float(time < TTL) * activated;

    float active_time = (time/TTL) * activated;

    // vec2 acc = normalize(target_pos - pos) * TARGET_ACCELERATION *
    //     (sin(time*0.5 + rand(vec2(float(id), pos.y))) +0.8);
    vec2 acc = normalize(target_pos - pos) * TARGET_ACCELERATION;
    // add noise to the acceleration
    float angle = snoise(vec3(pos * 0.01 + id, total_time * 1.235 + mod289(float(id))*0.1)) * 3.14159 * 6.;
    acc += vec2(cos(angle), sin(angle)) * (NOISE_ACCELERATION + active_time * 0.1);

    vel += acc * timestep * 60.0;
    // vel = acc * 5.0 + vel * 0.8;
    pos += vel * activated * 0.5;


//     // Move pos to center, rotate, and compare
//     vec2 pos1 = pos - origin_pos;
//     pos1 = rotate2d( PI*-0.25 ) * pos1;
//     // Reverse the velocity if inside the forbidden zone
//     float is_inside_forbidden = float(
//         pos1.x >= zone1.x && pos1.x <= zone2.x &&
//         pos1.y >= zone1.y && pos1.y <= zone2.y
// );
//     vec2 vel_from_zone_center = (pos - zone_center);
//     pos += vel_from_zone_center * is_inside_forbidden;
//     vel += vel*-2*is_inside_forbidden;

    posOut = vec4(pos, total_time, active_time);
    velOut = vec4(vel, time, activated);
}
