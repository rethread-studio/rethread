import * as Global from './globals.js'
import * as tone_init from './tone_init.js';
import * as THREE from 'three';
import * as Tone from 'tone';
import * as Graphics from './graphics.js';

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
    }
    schedulePlaybackSpace(synth, noiseSynth, transport, material, color) {
        console.log("motif scheduled for space playback!");
        if(this.loop != undefined) {
            this.loop.stop();
        }
        // An attempt at fooling javascript into having a consistent this
        let motif = this;
        this.loop = new Tone.Loop(function(time){
            for(let i = 0; i < motif.durations.length; i++) {
                // Have the loop be in sync with the spaceRoom loop
                if(motif.durations[i] + motif.startDurOffset == Graphics.spaceRoom.loopCounter) {
                    let pitch = Tone.Frequency.mtof(motif.pitches[i] + motif.pitchOffset);
                    let dur = "16n";
                    let atk = motif.attacks[i];
                    let schedSynth = synth;
                    let noisePlayback = false;
                    if(motif.noises[i]) {
                        schedSynth = noiseSynth;
                        // noisePlayback = true;
                        pitch = Tone.Frequency.mtof((motif.pitches[i] + motif.pitchOffset) % 12 + 12);
                    }
                    let id = transport.schedule(function (time) {
                        // console.log("pitch: " + pitch + " dur: " + dur + " time: " + time);
                        schedSynth.envelope.attack = atk;
                        if(noisePlayback) {
                            schedSynth.triggerAttackRelease(
                                "16n",//dur16ToTransport(dur/2),
                                );
                        } else {
                            schedSynth.triggerAttackRelease(
                                pitch,
                                dur,//dur16ToTransport(dur/2),
                            );
                        }
                        material.color.copy(color);
                        // material.color.setScalar(1.0);
                    }, time);
                }
            }
        }, "16n").start(0);
    }
    addDur(v) {
        this.pitches.push(Global.sound.pitchSet[5]);
        // this.pitches.push(110);
        this.durations.push((v * 5) % 16 + 1);
        this.attacks.push(0.001);
        this.noises.push(true);
    }
    changePitch(i, newPitchIndex) {
        let index = Math.floor(i) % (this.pitches.length);
        this.pitches[index] = this.pitchSet[newPitchIndex % this.pitchSet.length];
        this.attacks[index] = 0.01;
        this.noises[index] = false;
    }
    addPitch(i) {
        this.pitches.push( this.pitchSet[i % this.pitchSet.length]);
        this.durations.push(2);
        this.attacks.push(0.01);
    }
    changeDur(i, newDur) {
        let index = Math.floor(i) % (this.durations.length);
        this.durations[index] = newDur;
    }
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
        if(this.loop != undefined) {
            this.loop.stop();
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
    numParametersUsed;
    rawFingerprint;
    fingerprintSum;
    color;
    constructor(rawFingerprint) {
        const vs = rawFingerprint.split(",");
        this.rawFingerprint = vs.map(el => Number(el));
        this.fingerprintSum = this.rawFingerprint.reduce((prev, curr) => prev + curr, 0);
        this.color = new THREE.Color();
        this.color.setHSL((this.fingerprintSum % 1000)/1000, 0.6, 0.55);
    }
    addToSpace(scene, objects, x, y, z) {
        this.position = new THREE.Vector3(x, y, -z);
        this.material = new THREE.MeshStandardMaterial({ color: 0x00cccc })
        this.geometry = new THREE.TetrahedronGeometry(5, this.rawFingerprint[0]);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
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
    
            // let geometry = new THREE.BoxGeometry(40, 60, 30);
            let geometry = new THREE.TetrahedronGeometry(60, room.fingerprint.fingerprintSum % 4)
            let material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide });
            let roomCube = new THREE.Mesh(geometry, material);
            roomCube.receiveShadow = true;
            Graphics.scene.add(roomCube);
    
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

            room.initSound(room);
        }

        newRoom.initSound = function(room) {
            room.fingerprint.numParametersUsed = 24;
            room.fingerprint.updateMotif();
            Tone.Transport.bpm.value = 80;
            Tone.Transport.loop = false;

            let sonarSynth = new Tone.FMSynth( {
                harmonicity : 2 ,
                modulationIndex : 2 ,
                detune : 0 ,
                oscillator : {
                    type : "sine"
                },
                envelope : {
                    attack : 0.2 ,
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
            ).connect(Global.sound.longverb).toMaster();
            sonarSynth.volume.value = -12;
            room.sonarSynth = sonarSynth;
            let sonarLFO = new Tone.LFO('8n', -20, -6);
            sonarLFO.type = 'sawtooth';
            sonarLFO.connect(sonarSynth.volume);
            sonarLFO.start(0);
            room.sonarLFO = sonarLFO;
            let sonarLFOEnv = new Tone.ScaledEnvelope(0.7, 1.5, 0.4, 0.01);
            sonarLFOEnv.connect(sonarLFO.frequency);
            sonarLFOEnv.max = 2.0;
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

            // Set up music loop function
            room.motif = room.fingerprint.motif;
            room.loopCounter = 0;
            room.loop = new Tone.Loop(function(time){
                let motif = room.motif;
                // console.log("room.motif.pitches: " + JSON.stringify(room.motif.pitches));
                // let pitchIndex = room.loopCounter % room.motif.pitches.length;
                // let sonarPitch = Tone.Frequency.mtof(room.motif.pitches[pitchIndex]);
                // // if(room.loopCounter % 6) {
                // //     room.sonarSynth.triggerAttackRelease(sonarPitch, "8n", time, Math.random() * 0.4);
                // // }
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
                    }
                }
                
                room.loopCounter = (room.loopCounter + 1) % 128;
            }, "16n").start(0);
        }
    
        newRoom.update = function (cameraDirection, room, delta) {
    
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

            // update shader uniforms
            room.shaderUniforms.time.value += delta;
        }

        newRoom.cleanUp = function(room) {
            room.loop.stop();
        }

        return newRoom;
    }
    updateMotif() {
        this.motif.clear();
        this.motif.startDurOffset = (this.fingerprintSum) % 32;
        // For every 300 points two fingerprints differ they will be separated by a 5th
        // this.motif.pitchOffset = (Math.floor(this.fingerprintSum/300) * 7) % 12;
        // Choose a pitch set based on the fingerprint sum
        this.motif.pitchSet = Global.sound.pitchSets[Math.floor(this.fingerprintSum/300) % Global.sound.pitchSets.length];
        for (let i = 0; i < this.rawFingerprint.length && i < this.numParametersUsed; i++) {
            let v = Global.data.headers[i] + "_" + this.rawFingerprint[i];
            // switch(i%2) {
            //     case 0:
            //         motif.addPitch(vs[i]);
            //         break;
            //     case 1:
            //         motif.changeDur(i/2, vs[i]%6 + 1);
            //         break;

            // }
            if (i == 0) {
                this.motif.octave = ((this.rawFingerprint[i]) % 3) - 1;
            } else if (i == 2) {
                this.synth.envelope.attack = Math.max(Math.min(0.0001 * this.rawFingerprint[i], 0.2), 0.001);
                // this.motif.pitchOffset = ((this.rawFingerprint[i] - 6) * 2) % 12;
                
                
            } else if (i == 1) { // headers[1] == "dnt", do not track, 0 or 1
                // this.motif.startDurOffset = (this.rawFingerprint[i] * 6) % 32;
                if(this.rawFingerprint[i] == 1) {
                    this.synth.envelope.decay = 0.5;
                }
            } else if (i == 3) {
                this.synth.oscillator.type = Global.sound.oscillators[this.rawFingerprint[i] % Global.sound.oscillators.length];
            } else if (i - 4 < Math.floor((Global.data.headers.length - 4) / 2)) {
                this.motif.addDur(this.rawFingerprint[i]);
            } else {
                this.motif.changePitch(i - Math.floor((Global.data.headers.length - 4) / 2) - 4, this.rawFingerprint[i]);
            }
        }
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
        this.noiseSynth.volume.value = db * 1.3;
    }
    updateDistanceSquared(distance2) {
        this.setDb(distance2 * -0.05 - 10);
        if (distance2 < 110) {
            this.material.transparent = true;
            this.material.opacity = (distance2-10) / 100;
        }
        this.synth.harmonicity.value = Math.floor(Math.max(12 - (distance2 / 100), 1.0));
        this.synth.envelope.release = Math.max(0.5 - distance2 / 500, 0.002);
        let numParameters = 24 - ((distance2 - 150) / 30);
        if (numParameters != this.numParameters) {
            this.numParametersUsed = numParameters;
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