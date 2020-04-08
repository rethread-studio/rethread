import * as Global from './globals.js'
import * as tone_init from './tone_init.js';
import * as THREE from 'three';
import * as Tone from 'tone';
import * as Graphics from './graphics.js';

const playbackMethods = ['long_notes', 'short_notes', 'repeated_notes'];
class Motif {
    pitches;
    // Duration is the number of 16th notes the pitch spans
    durations;
    attacks;
    octave;
    pitchSet;
    pitchOffset;
    startDurOffset;
    schedulingIds;
    loop;
    playbackMethod;
    constructor() {
        this.pitchSet = Global.sound.pitchSets[0];
        this.pitches = [];
        this.durations = [];
        this.attacks = [];
        this.noises = [];
        this.schedulingIds = [];
        this.octave = 0;
        this.pitchOffset = 0;
        this.startDurOffset = 0;
        this.loopCounter = 0;
        this.loopMax = 0;
        this.playbackMethod = playbackMethods[0];
        this.lastPitch = 0;
        this.repeatsLeft = 0;
    }
    schedulePlaybackSpace(synth, noiseSynth, transport, material, color) {
        if(this.loop != undefined) {
            this.loop.stop();
        }
        // An attempt at fooling javascript into having a consistent this
        let motif = this;
        this.loop = new Tone.Loop(function(time){
            let playedNote = false;
            for(let i = 0; i < motif.durations.length; i++) {
                // Have the loop be in sync with the spaceRoom loop
                if(motif.durations[i] + motif.startDurOffset == motif.loopCounter) {
                    playedNote = true;
                    // console.log("Play note in Loop with loopmax " + motif.loopMax + " durations: " + motif.durations);
                    let pitch = Tone.Frequency.mtof(motif.pitches[i] + motif.pitchOffset + (motif.octave * 12));
                    let dur = "16n";
                    if(motif.playbackMethod == 'long_notes') {
                        dur = "8n";
                    }
                    if(motif.playbackMethod == 'repeated_notes') {
                        motif.repeatsLeft = 8;
                        motif.lastPitch = pitch;
                    }
                    let atk = motif.attacks[i];
                    let noisePlayback = false;
                    if(motif.noises[i]) {
                        noisePlayback = true;
                        pitch = Tone.Frequency.mtof((motif.pitches[i] + motif.pitchOffset) % 12 + 12);
                        motif.repeatsLeft = 0;
                    }
                    let id = transport.schedule(function (time) {
                        // console.log("pitch: " + pitch + " dur: " + dur + " time: " + time);
                        synth.envelope.attack = atk;
                        if(noisePlayback) {
                            console.log("noise playback " + motif.noises);
                            noiseSynth.triggerAttackRelease(
                                pitch,
                                "16n",//dur16ToTransport(dur/2),
                                time);
                        } else {
                            synth.triggerAttackRelease(
                                pitch,
                                dur,//dur16ToTransport(dur/2),
                                time);
                        }
                        material.color.copy(color);
                        // material.color.setScalar(1.0);
                    }, time);
                    motif.schedulingIds.push(id);
                }
            }
            if(!playedNote && motif.repeatsLeft > 0) {
                synth.triggerAttackRelease(
                    motif.lastPitch,
                    "32n",//dur16ToTransport(dur/2),
                    time,
                    motif.repeatsLeft/10
                    );
                material.color.copy(color);
                motif.repeatsLeft -= 1;
            }
            motif.loopCounter = (motif.loopCounter + 1) % motif.loopMax;
        }, "16n").start(0);
    }
    update() {
        this.loopMax = this.durations.reduce((a, b) => a + b, 0) + this.startDurOffset;
        // Set the loop point to the closest higher multiple of 8 16ths
        for(let i = 1; i < 16; i++) {
            if(i * 8 > this.loopMax) {
                this.loopMax = i * 8;
                break;
            }
        }
    }
    addDur(v) {
        this.pitches.push(Global.sound.pitchSet[5]);
        // this.pitches.push(110);
        this.durations.push((v * 5) % 12 + 1);
        this.attacks.push(0.001);
        this.noises.push(true);
    }
    changePitch(i, newPitchIndex) {
        let index = Math.floor(i) % (this.pitches.length);
        this.pitches[index] = this.pitchSet[newPitchIndex % this.pitchSet.length];
        this.attacks[index] = 0.01;
        this.noises[index] = false;
    }
    setPlaybackMethod(num) {
        this.playbackMethod = playbackMethods[num % playbackMethods.length];
    }
    // addPitch(i) {
    //     this.pitches.push( this.pitchSet[i % this.pitchSet.length]);
    //     this.durations.push(2);
    //     this.attacks.push(0.01);
    // }
    // changeDur(i, newDur) {
    //     let index = Math.floor(i) % (this.durations.length);
    //     this.durations[index] = newDur;
    // }
    clear() {
        this.pitches = [];
        this.durations = [];
        this.attacks = [];
        this.noises = [];
        this.octave = 0;
        this.pitchOffset = 0;
        this.startDurOffset = 0;
    }
    stopSpaceLoop() {
        for(let id of this.schedulingIds) {
            Tone.Transport.clear(id);
        }
        if(this.loop != undefined) {
            this.loop.stop();
            console.log("Stopped space loop of motif");
        }
    }
}

/// Converts a duration based on the number of 16th notes to the Tone.Transport format "bar:quarter:sixteenth"
/// https://github.com/Tonejs/Tone.js/wiki/Time
function dur16ToTransport(dur) {
    const quarterNotesPerBar = 4;
    let sixteenths = dur % 4;
    let quarters = ((dur - sixteenths) / 4) % quarterNotesPerBar;
    let bars = (((dur - sixteenths) / 4) - quarters) / quarterNotesPerBar;
    return "" + bars + ":" + quarters + ":" + sixteenths;
}

function amp2db(amp) {
    20 * log10(amp);
}

class Fingerprint {
    motif; // a Motif
    position; // a THREE.Vector3
    material;
    geometry;
    mesh; // the 3D mesh that represents this
    synth; // the synth playing this fingerprint's motif
    noiseSynth;
    chordSynths;
    numParametersUsed;
    rawFingerprint;
    fingerprintSum;
    color;
    constructor(rawFingerprint) {
        this.rawFingerprint = rawFingerprint;
        this.fingerprintSum = this.rawFingerprint.reduce((prev, curr) => prev + curr, 0);
        this.color = new THREE.Color();
        this.color.setHSL((this.fingerprintSum % 1000)/1000, 0.6, 0.55);
        // console.log("new fingerprint with sum " + this.fingerprintSum + " and raw fingerprint " + JSON.stringify(this.rawFingerprint));
    }
    addToSpace(scene, objects, position) {
        this.position = position;
        this.material = new THREE.MeshStandardMaterial({ color: 0x00cccc })
        this.geometry = new THREE.TetrahedronGeometry(5, 0);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.z = this.rawFingerprint[3] + this.rawFingerprint[4];
        this.mesh.rotation.y = this.rawFingerprint[5] + this.rawFingerprint[6];
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
        this.mesh.userData.fingerprintPtr = this;
        scene.add(this.mesh);
        this.motif = new Motif();
        this.numParametersUsed = 0;
        this.synth = tone_init.newSynth();
        this.noiseSynth = tone_init.newNoiseSynth();
        objects.push(this.mesh);
        this.updateMotif();
        this.motif.schedulePlaybackSpace(this.synth, this.noiseSynth, Tone.Transport, this.material, this.color);
    }
    generateFingerprintRoom() {
        let newRoom = {};
        newRoom.fingerprint = this;
        newRoom.init = function (room) {
            Graphics.newScene(new THREE.Color(0x333333), new THREE.FogExp2(0xfffefe, 0.01));
            Graphics.setFogFade(1.0);
    
            let lightColor = new THREE.Color().copy(room.fingerprint.color).multiplyScalar(1.5);

            room.light = new THREE.PointLight(lightColor, 0.5, 50);
            room.light.position.set(0.5, 1, 0.75);
            room.light.castShadow = true;
            room.light.shadow.camera.far = 4000;
            Graphics.scene.add(room.light);
    
            if (room.fingerprint.rawFingerprint[1] == 1) {
                room.spotLight = new THREE.SpotLight(lightColor);
                room.spotLight.castShadow = true;
                room.spotLight.shadow.camera.far = 4000;
                room.spotLight.power = 2;
                room.spotLight.angle = 0.7;
                room.spotLight.penumbra = 0.9;
                Graphics.scene.add(room.spotLight);
                Graphics.scene.add(room.spotLight.target);
            }
    
            // Place camera at origin
            Graphics.controls.getObject().position.copy(new THREE.Vector3(0, 0, 0));

            // Add geometry to display a shader on
            let shaderGeometry = new THREE.PlaneGeometry( 18, 18, 1, 1 );
            // let shaderMaterial = new THREE.MeshBasicMaterial( {color: 0xccccff, side: THREE.FrontSide} );
            let shaderUniforms = {
                time: { value: 1.0 },
                resolution: {  value: new THREE.Vector2() }
            };
            let shaderMaterial = new THREE.ShaderMaterial( {
                uniforms: shaderUniforms,
                // general vertex shader for fragment shaders
                vertexShader: `varying vec2 vUv; 
                void main()
                {
                    vUv = uv;
                
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`,
                // This is where the magic happens
                // https://stackoverflow.com/questions/24820004/how-to-implement-a-shadertoy-shader-in-three-js
                // for coordinates, use `vec2 p = -1.0 + 2.0 *vUv;`
                fragmentShader: `
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

`,
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
                side: THREE.DoubleSide,
            } );
            let shader = new THREE.Mesh( shaderGeometry, shaderMaterial );
            shader.castShadow = true;
            shader.rotateY(Math.PI);
            shader.position.set(0, 0, 28);
            Graphics.scene.add(shader);
            room.shader = shader;
            room.shaderUniforms = shaderUniforms;
            room.shaderMaterial = shaderMaterial;

            // let geometry = new THREE.BoxGeometry(40, 60, 30);
            let geometry = new THREE.TetrahedronGeometry(60, room.fingerprint.fingerprintSum % 4)
            let material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide });
            let roomCube = new THREE.Mesh(geometry, material);
            roomCube.receiveShadow = true;
            room.roomCube = roomCube;
            Graphics.scene.add(roomCube);

            // PORTALS
            // room.portals = [];
            // room.spacePortal = Graphics.getNewSpacePortal();
            // room.spacePortal.position.set()
            // room.portals.push(room.spacePortal);
            // Graphics.scene.add(room.spacePortal);

            room.initSound(room);
        }

        newRoom.initSound = function(room) {
            room.fingerprint.numParametersUsed = 24;
            room.fingerprint.updateMotif();
            Tone.Transport.bpm.value = 80;
            Tone.Transport.loop = false;
            room.motif = room.fingerprint.motif;

            Global.sound.globalSynthLPF.frequency.value = 500;
            Global.sound.noiseEnv.triggerRelease();

            let sonarSynth = new Tone.FMSynth( {
                harmonicity : 2 ,
                modulationIndex : 2 ,
                detune : 0 ,
                oscillator : {
                    type : "sine"
                },
                envelope : {
                    attack : 1.0 ,
                    decay : 0.7 ,
                    sustain : 0.5 ,
                    release : 1
                },
                modulation : {
                    type : "sine"
                },
                    modulationEnvelope : {
                    attack : 0.5 ,
                    decay : 0 ,
                    sustain : 1 ,
                    release : 0.5
                    }
                }
            ).connect(Global.sound.chorus).toMaster();
            sonarSynth.volume.value = -24;
            room.sonarSynth = sonarSynth;
            let sonarLFO = new Tone.LFO('8n', -24, -18);
            sonarLFO.type = 'sine';
            sonarLFO.connect(sonarSynth.volume);
            sonarLFO.start(0);
            room.sonarLFO = sonarLFO;
            let sonarLFOEnv = new Tone.ScaledEnvelope(0.7, 1.5, 0.4, 0.01);
            sonarLFOEnv.connect(sonarLFO.frequency);
            sonarLFOEnv.max = 4.0;
            room.sonarLFOEnv = sonarLFOEnv;

            // Distorted noise

            let noise;

            noise = new Tone.Noise("pink").start();
            var noiseGain = new Tone.Gain(0.2).connect(Global.sound.reverb).toMaster();
            var chebyenv = new Tone.ScaledEnvelope({
                "attack" : 5.0,
                "decay" : 0.01,
                "sustain" : 1.0,
                "release" : 5.0,
            });
            chebyenv.releaseCurve = "linear";
            chebyenv.max = 0.5;

            var chebylfofreq = new Tone.LFO(0.1, 0.05, 0.3).start();
            var chebylfo = new Tone.LFO(0.1, 0.05, 0.1).start();
            chebylfofreq.connect(chebylfo.frequency);

            var gainMult = new Tone.Multiply();
            // Multiply two signals together
            chebyenv.connect(gainMult, 0, 0);
            chebylfo.connect(gainMult, 0, 1);
            // Use as gain control
            gainMult.connect(noiseGain.gain);


            var cheby = new Tone.Chebyshev(300).connect(noiseGain);
            noise.connect(cheby);
            room.chebyenv = chebyenv;

            // Pads

            room.padSynths = [];

            for(let i = 0; i < 5; i++) {
                let newSynth = tone_init.newPadSynth(20);
                newSynth.pitchIndex = i;
                newSynth.playing = false;
                newSynth.midi = room.motif.pitchSet[newSynth.pitchIndex];
                newSynth.toggle = function(pad, time) {
                    if(pad.playing) {
                        pad.env.triggerRelease(time);
                        pad.playing = false;
                    } else {
                        pad.filter.frequency.value = Tone.Frequency.mtof(pad.midi);
                        let vel = Math.random() * 0.75 + 0.25;
                        pad.env.triggerAttack(time, vel);
                        pad.playing = true;
                    }
                }
                room.padSynths.push(newSynth); // Tone.Frequency.mtof(notes[i]-12)
            }

            // Set up music loop function
            
            room.loopCounter = 0;
            room.loopCounterLv2 = 0; // how many times the first loop counter has started over
            room.loop = new Tone.Loop(function(time){
                let motif = room.motif;
                // console.log("room.motif.pitches: " + JSON.stringify(room.motif.pitches));
                // let pitchIndex = room.loopCounter % room.motif.pitches.length;
                // let sonarPitch = Tone.Frequency.mtof(room.motif.pitches[pitchIndex]);
                // // if(room.loopCounter % 6) {
                // //     room.sonarSynth.triggerAttackRelease(sonarPitch, "8n", time, Math.random() * 0.4);
                // // }

                // Change padSynth pitches
                for(let i = 0; i < room.padSynths.length; i++) {
                    if(room.loopCounterLv2 % 2 == 0) {
                        if((room.loopCounterLv2 + room.loopCounter) % ((i+1)) == 0) {
                            room.padSynths[i].pitchIndex -= 1;
                            if(room.padSynths[i].pitchIndex < 0) {
                                room.padSynths[i].pitchIndex += room.motif.pitchSet.length;
                            }
                            room.padSynths[i].midi = room.motif.pitchSet[room.padSynths[i].pitchIndex];
                            // Transpose down an octave
                            if(Math.random() > 0.6) {
                                room.padSynths[i].midi -= 12;
                            } else if(Math.random() > 0.7) {
                                room.padSynths[i].midi -= 24;
                            }
                            room.padSynths[i].toggle(room.padSynths[i], time);
                        }
                    }
                }

                switch(room.loopCounter) {
                    case 0:
                        room.chebyenv.triggerAttack();
                        break;
                    case 2:
                        break;
                    case 48:
                        break;
                    case 64:
                        room.chebyenv.triggerRelease();
                        break;
                }
                for(let i = 0; i < motif.durations.length; i++) {
                    // Have the loop be in sync with the spaceRoom loop
                    if(motif.durations[i] * 4 + motif.startDurOffset == room.loopCounter) {
                        let pitch = Tone.Frequency.mtof(room.motif.pitches[i] + room.motif.pitchOffset);
                        let dur = {"16n": Math.min((motif.durations[i] * 4) - 2, 16)};
                        let schedSynth = sonarSynth;
                        schedSynth.triggerAttackRelease(
                            pitch,
                            dur,//dur16ToTransport(dur/2),
                            time,
                        );
                        sonarLFOEnv.triggerAttackRelease(dur, time);

                        // start two new pad synths
                        let index = Math.floor(Math.random() * room.padSynths.length);
                        room.padSynths[index].toggle(room.padSynths[index], time);
                    }
                }
                
                room.loopCounter += 1;
                if(room.loopCounter >= 128) {
                    room.loopCounter = 0;
                    room.loopCounterLv2 += 1;
                }
            }, "16n").start(0);
        }
    
        newRoom.update = function (cameraDirection, room, delta) {

            Graphics.setFogFade(Graphics.fogFade * (1.0 - (delta*4)));
            Graphics.updateSceneFog();
    
            // Move the spotlight to the camera
            if(room.spotLight != undefined) {
                room.spotLight.position.copy(Graphics.controls.getObject().position);
                room.spotLight.target.position.copy(cameraDirection);
                room.spotLight.target.position.add(Graphics.controls.getObject().position);
            }
    
            let outOfBounds = 200;
            let camPos = Graphics.controls.getObject().position;
            if (camPos.x > outOfBounds
                || camPos.x < -outOfBounds
                || camPos.y > outOfBounds
                || camPos.y < -outOfBounds
                || camPos.z > outOfBounds
                || camPos.x < -outOfBounds
            ) {
                Graphics.controls.getObject().position.copy(new THREE.Vector3(0, 0, 0));
            }

            // As long as we're using a PointerLock the mouse should always be in the center
            Graphics.raycaster.setFromCamera( new THREE.Vector2(0, 0), Graphics.controls.getObject() );    

            //3. compute intersections
            var intersections = Graphics.raycaster.intersectObjects( [room.roomCube] );

            // This should be last in the update function as it might trigger the cleanup of this room
            for (let i = 0; i < intersections.length; i++ ) {
                if (intersections[i].distance < 2.0) {
                    // Travel into the space room
                    Graphics.travelToRoom(Graphics.spaceRoom);
                } else if (intersections[i].distance < 30.0) {
                    Graphics.displayOnHud("<span>continue forward to exit</span>");
                } else {
                    Graphics.hideHud();
                }
            }
            if( intersections.length == 0) {
                // hudElement.innerHTML = "";
                Graphics.hideHud();
            }

            // TODO: Raycast backwards to check that we aren't backing out of the fingerprint room alt. disable moving backwards

            // update shader uniforms
            room.shaderUniforms.time.value += delta;
        }

        newRoom.cleanUp = function(room) {
            room.loop.stop();
            room.chebyenv.triggerRelease();
            room.sonarLFOEnv.dispose();
            for(let syn of room.padSynths) {
                syn.dispose(syn);
            }
        }

        return newRoom;
    }
    updateMotif() {
        this.motif.clear();
        this.motif.startDurOffset = (this.fingerprintSum) % 8;
        // For every 300 points two fingerprints differ they will be separated by a 5th
        // this.motif.pitchOffset = (Math.floor(this.fingerprintSum/300) * 7) % 12;
        // Choose a pitch set based on the fingerprint sum
        this.motif.pitchSet = Global.sound.pitchSets[Math.floor(this.fingerprintSum/300) % Global.sound.pitchSets.length];

        this.motif.octave = (this.fingerprintSum % 4) - 1;
        for (let i = 0; i < this.rawFingerprint.length && i < this.numParametersUsed; i++) {
            // switch(i%2) {
            //     case 0:
            //         motif.addPitch(vs[i]);
            //         break;
            //     case 1:
            //         motif.changeDur(i/2, vs[i]%6 + 1);
            //         break;

            // }
            if (i == 0) {
                
            } else if (i == 2) {
                this.synth.envelope.attack = Math.max(Math.min(0.0001 * this.rawFingerprint[i], 0.2), 0.001);
                this.motif.setPlaybackMethod(this.rawFingerprint[i]);
                // this.motif.pitchOffset = ((this.rawFingerprint[i] - 6) * 2) % 12;
                
                
            } else if (i == 1) { // headers[1] == "dnt", do not track, 0 or 1
                // this.motif.startDurOffset = (this.rawFingerprint[i] * 6) % 32;
                if(this.rawFingerprint[i] == 1) {
                    // this.synth.envelope.decay = 0.5;
                    this.synth.type = 'triangle';
                }
            } else if (i == 3) {
                this.synth.oscillator.type = Global.sound.oscillators[this.rawFingerprint[i] % Global.sound.oscillators.length];
            } else if (i - 4 < Math.floor((Global.data.headers.length - 4) / 2)) {
                this.motif.addDur(this.rawFingerprint[i]);
            } else {
                this.motif.changePitch(i - Math.floor((Global.data.headers.length - 4) / 2) - 4, this.rawFingerprint[i]);
            }
        }
        this.motif.update();
    }
    clearFromTransport() {
        // tone_init.clearIdsFromTransport(this.motif.schedulingIds);
        // this.motif.schedulingIds = [];
        this.motif.clear();
        this.motif.stopSpaceLoop();
    }
    setAmp(amp) {
        this.synth.volume.value = amp2db(amp);
        this.noiseSynth.volume.value = amp2db(amp);
    }
    setDb(db) {
        this.synth.volume.value = db;
        this.noiseSynth.volume.value = db * 1.1;
    }
    updateDistanceSquared(relativeDistance) {
        this.setDb(relativeDistance * -6.5 - 16);
        // if (distance2 < 110) {
        //     this.material.transparent = true;
        //     this.material.opacity = (distance2-10) / 100;
        // }
        // this.synth.harmonicity.value = Math.floor(Math.max(12 - (distance2 / 10), 1.0));
        // this.synth.envelope.release = Math.max(0.5 - distance2 / 50, 0.002);
        let numParameters = Math.max(Math.floor(24 - (Math.max(relativeDistance - 1.0, 0) * 8.0)), 0);
        if (numParameters != this.numParameters) {
            this.numParametersUsed = numParameters;
            // this.numParametersUsed = 24;
            this.updateMotif();
        }

        this.material.color.multiplyScalar(0.9);
    }
}

function getRandomFingerPrint() {
    return Global.data.rawFingerprints[Math.floor(Global.data.rawFingerprints.length * Math.random())];
}

function generateRandomFingerPrint() {
    if (Global.data.rawFingerprints.length == 0) {
      return;
    }
    const p = [];
    let fingerprint = new Fingerprint(getRandomFingerPrint());
    Global.data.fingerprints.push(fingerprint);
}

export { Motif, Fingerprint, generateRandomFingerPrint }