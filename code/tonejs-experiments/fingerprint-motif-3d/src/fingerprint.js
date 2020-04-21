import * as Global from './globals.js'
import * as Synthesis from './synthesis.js';
import * as THREE from 'three';
import * as Tone from 'tone';
import * as Graphics from './graphics.js';
import * as Shaders from './shaders.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

const playbackMethods = ['long_notes', 'short_notes', 'repeated_notes'];
class Motif {
    pitches;
    // Duration is the number of 16th notes the pitch spans
    durations;
    sequence; // a conversion from durations and startDurOffset to sequencer trigger positions
    attacks;
    octave;
    pitchSet;
    pitchOffset;
    startDurOffset;
    schedulingIds;
    loop;
    playbackMethod;
    playing; // whether the motif is actively playing on the transport or paused
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
        this.playing = false;
    }
    schedulePlaybackSpace(synth, noiseSynth, transport, fingerprint) {
        if(this.loop != undefined) {
            this.loop.stop();
        }
        // An attempt at fooling javascript into having a consistent this
        let motif = this;
        this.loop = new Tone.Loop(function(time){
            let playedNote = false;
            for(let i = 0; i < motif.sequence.length; i++) {
                // Have the loop be in sync with the spaceRoom loop
                if(motif.sequence[i] == motif.loopCounter) {
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
                    // let id = transport.schedule(function (time) {
                        // console.log("pitch: " + pitch + " dur: " + dur + " time: " + time);
                        synth.envelope.attack = atk;
                        if(noisePlayback) {
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
                        // Matching visual changes
                        Tone.Draw.schedule(function(){
                            //this callback is invoked from a requestAnimationFrame
                            //and will be invoked close to AudioContext time
                            fingerprint.setActivation(1.0);

                        }, time) //use AudioContext time of the event
                        
                    // }, time);
                    // motif.schedulingIds.push(id);

                    break;
                }
            }
            if(!playedNote && motif.repeatsLeft > 0) {
                synth.triggerAttackRelease(
                    motif.lastPitch,
                    "32n",//dur16ToTransport(dur/2),
                    time,
                    motif.repeatsLeft/10
                    );
                fingerprint.setActivation(1.0);
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
        this.updateSequence();
    }
    updateSequence() {
        let pos = this.startDurOffset;
        this.sequence = [pos];
        // add all but the last duration (because there is no note happening after that duration)
        for(let i = 0; i < this.durations.length-1; i++) {
            pos += this.durations[i];
            this.sequence.push(pos);
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
    pause() {
        if(this.playing) {
            // Only pause if we were playing
            this.stopSpaceLoop();
            this.playing = false;
        }
    }
    play(synth, noiseSynth, transport, fingerprint) {
        if(!this.playing) {
            this.schedulePlaybackSpace(synth, noiseSynth, transport, fingerprint);
            this.playing = true;
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

const FPrintTypes = {"local":1, "connected":2, "old":3};
Object.freeze(FPrintTypes);
class Fingerprint {
    type; 
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
    activation; // used to display that the fingerprint is sonically activated
    hidden;
    constructor(rawFingerprint, type) {
        this.type = type;
        this.rawFingerprint = rawFingerprint;
        this.fingerprintSum = this.rawFingerprint.reduce((prev, curr) => prev + curr, 0);
        this.color = new THREE.Color();
        this.color.setHSL(((this.fingerprintSum * 73) % 1000)/1000, 0.6, 0.55);
        this.activation = 0.0;
        this.synth = undefined;
        this.oscillatorType = 'sine';
        this.synthType = 'sine';
        this.hidden = false;
    }
    setActivation(v) {
        this.activation = v;
    }
    addToSpace(scene, objects, position) {
        this.position = position;
        this.material = new THREE.MeshStandardMaterial({ color: 0x00cccc })
        // this.material = newFingerprintOutsideShaderMaterial();
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
        this.synth = undefined;
        this.noiseSynth = undefined;
        objects.push(this.mesh);
        this.updateMotif();
        
    }
    cleanUpSpace(scene) {
        scene.remove(this.mesh);
        this.motif.stopSpaceLoop();
        this.returnSynths();
    }
    generateFingerprintRoom() {
        let newRoom = {};
        newRoom.fingerprint = this;
        newRoom.init = function (room) {
            Graphics.displayOnHudMessage(Global.getRandomInsideFingerprintMessage());
            Graphics.hideFilter();

            Graphics.newScene(new THREE.Color(0x000000), new THREE.FogExp2(0xfffefe, 0.01));
            Graphics.setFogFade(0.0);
    
            // let lightColor = new THREE.Color().copy(room.fingerprint.color).multiplyScalar(1.5);
            let lightColor = new THREE.Color(0xffffff);

            room.light = new THREE.PointLight(lightColor, 0.5, 50);
            room.light.position.set(0.5, 1, 0.75);
            room.light.castShadow = true;
            room.light.shadow.camera.far = 400;
            Graphics.scene.add(room.light);
    
            // if (room.fingerprint.rawFingerprint[1] == 1) {
                room.spotLight = new THREE.SpotLight(lightColor);
                room.spotLight.castShadow = true;
                room.spotLight.shadow.camera.far = 4000;
                room.spotLight.power = 2;
                room.spotLight.angle = 0.7;
                room.spotLight.penumbra = 0.9;
                Graphics.scene.add(room.spotLight);
                Graphics.scene.add(room.spotLight.target);
            // }
    
            // Place camera at origin
            Graphics.camera.position.copy(new THREE.Vector3(0, 0, 0));

            // Add geometry to display a shader on
            let shaderGeometry = new THREE.PlaneGeometry( 18, 18, 1, 1 );
            // let shaderMaterial = new THREE.MeshBasicMaterial( {color: 0xccccff, side: THREE.FrontSide} );
            console.log("rawFingerprint: " + JSON.stringify(newRoom.fingerprint.rawFingerprint));
            let shaderFingerprint = newRoom.fingerprint.rawFingerprint.map(num => {
                return Math.sqrt(((num + 1) * newRoom.fingerprint.fingerprintSum) % 99);
            })
            let shaderUniforms = {
                time: { value: 1.0 },
                resolution: {  value: new THREE.Vector2() },
                fingerprint: { value: shaderFingerprint },
                orgColor: { value: newRoom.fingerprint.color.clone() }
            };
            let shaderMaterial = new THREE.ShaderMaterial( {
                uniforms: shaderUniforms,
                // general vertex shader for fragment shaders
                vertexShader: Shaders.vShader,
                fragmentShader: Shaders.fingerprintFShader2,
                side: THREE.DoubleSide,
            } );
            let shader = new THREE.Mesh( shaderGeometry, shaderMaterial );
            shader.castShadow = true;
            shader.rotateY(Math.PI);
            shader.position.set(0, 0, 28);
            Graphics.lookAt(shader.position.clone());
            Graphics.scene.add(shader);
            room.shader = shader;
            room.shaderUniforms = shaderUniforms;
            room.shaderMaterial = shaderMaterial;

            // let geometry = new THREE.BoxGeometry(40, 60, 30);
            let geometry = new THREE.TetrahedronGeometry(60, 2)
            let material = new THREE.MeshStandardMaterial({ color: room.fingerprint.color, side: THREE.BackSide });
            material.receiveShadow = true;
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
            
            Tone.Transport.bpm.value = 80;
            Tone.Transport.loop = false;
            
            room.fingerprint.requestNewSynths();
            room.fingerprint.numParametersUsed = 24;
            room.fingerprint.updateMotif();
            room.motif = room.fingerprint.motif;
            room.motif.play(room.fingerprint.synth.synth, room.fingerprint.noiseSynth.synth, Tone.Transport, room.fingerprint);
            console.log("Started motif in room");
            console.log("motif: " + JSON.stringify(room.motif));

            Synthesis.globalSynthLPF.frequency.value = 500;
            Synthesis.noiseEnv.triggerRelease();

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
            ).connect(Synthesis.chorus).toMaster();
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

            room.cheby = Synthesis.newChebySynth();

            // Pads

            room.padSynths = [];

            for(let i = 0; i < 5; i++) {
                let newSynth = Synthesis.newPadSynth(20);
                newSynth.pitchIndex = i;
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
                        room.cheby.trigger(room.cheby);
                        break;
                    case 2:
                        break;
                    case 48:
                        break;
                    case 64:
                        room.cheby.release(room.cheby);
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

            Graphics.displayOnHudFooter("inside a single browser fingerprint");

            // Graphics.setFogFade(Graphics.fogFade * (1.0 - (delta*4)));
            Graphics.updateSceneFog();
    
            // Move the spotlight to the camera
            if(room.spotLight != undefined) {
                room.spotLight.position.copy(Graphics.camera.position);
                room.spotLight.target.position.copy(cameraDirection);
                room.spotLight.target.position.add(Graphics.camera.position);
            }
    
            let outOfBounds = 200;
            let camPos = Graphics.camera.position;
            if (camPos.x > outOfBounds
                || camPos.x < -outOfBounds
                || camPos.y > outOfBounds
                || camPos.y < -outOfBounds
                || camPos.z > outOfBounds
                || camPos.x < -outOfBounds
            ) {
                Graphics.camera.position.copy(new THREE.Vector3(0, 0, 0));
            }

            // As long as we're using a PointerLock the mouse should always be in the center
            Graphics.raycaster.setFromCamera( new THREE.Vector2(0, 0), Graphics.camera );    

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
        newRoom.pause = function(room) {
            // This happens when the pointer controls are unlocked
            // Turn all of the pad synths off
            for(let i = 0; i < room.padSynths.length; i++) {
                room.padSynths[i].release(room.padSynths[i]);
            }
        },

        newRoom.cleanUp = function(room) {
            room.loop.stop();
            room.fingerprint.returnSynths();
            room.sonarLFOEnv.dispose();
            room.sonarSynth.dispose();
            room.sonarLFO.dispose();
            for(let syn of room.padSynths) {
                syn.dispose(syn);
            }
            room.cheby.dispose(room.cheby);
        }
        newRoom.removeFingerprint = function(room) {}

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
                this.motif.attack = Math.max(Math.min(0.0001 * this.rawFingerprint[i], 0.2), 0.001);
                this.motif.setPlaybackMethod(this.rawFingerprint[i]);
                // this.motif.pitchOffset = ((this.rawFingerprint[i] - 6) * 2) % 12;
                
                
            } else if (i == 1) { // headers[1] == "dnt", do not track, 0 or 1
                // this.motif.startDurOffset = (this.rawFingerprint[i] * 6) % 32;
                if(this.rawFingerprint[i] == 1) {
                    // this.synth.envelope.decay = 0.5;
                    this.synthType = 'triangle';
                }
            } else if (i == 3) {
                this.oscillatorType = Global.sound.oscillators[this.rawFingerprint[i] % Global.sound.oscillators.length];
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
        // Return the synth
        if(this.synth != undefined) {
            Synthesis.returnFMSynth(this.synth.index);
        }
    }
    setAmp(amp) {
        if(this.synth != undefined) {
            this.synth.synth.volume.value = amp2db(amp);
        }
        if(this.noiseSynth != undefined) {
            this.noiseSynth.synth.volume.value = amp2db(amp);
        }
    }
    setDb(db) {
        if(this.synth != undefined) {
            this.synth.synth.volume.value = db;
        }
        if(this.noiseSynth != undefined) {
            this.noiseSynth.synth.volume.value = db * 1.1;
        }
    }
    setPosition(givenPos) {
        this.mesh.position.copy(givenPos);
    }
    getHoverText() {
        let text = "";
        if(this.type == FPrintTypes.local) {
            text = "your device's fingerprint";
        } else if (this.type == FPrintTypes.connected) {
            text = "currently connected, id: " + this.fingerprintSum;
        } else if (this.type == FPrintTypes.old) {
            text = "archived fingerprint, id: " + this.fingerprintSum;
        }
        return text;
    }
    requestNewSynths() {
        // Get fm synth
        if(this.synth == undefined) {
            let synthResult = Synthesis.requestFMSynth();
            if(synthResult != undefined) {
                this.synth = synthResult;
                this.synth.synth.type = this.synthType;
                this.synth.synth.oscillator.type = this.oscillatorType;
            } else {
                // console.log("No synth was received when requested");
                this.synth = undefined;
            }
        } else {
            // console.log("Already had synth when requested one");
        }
        
        // Get noise synth
        if(this.noiseSynth == undefined) {
            let synthResult = Synthesis.requestNoiseSynth();
            if(synthResult != undefined) {
                this.noiseSynth = synthResult;
            } else {
                // console.log("No synth was received when requested");
                this.noiseSynth = undefined;
            }
        }   
    }
    returnSynths() {
        if(this.synth != undefined) {
            Synthesis.returnFMSynth(this.synth.index);
            this.synth = undefined;
        }
        if(this.noiseSynth != undefined) {
            Synthesis.returnNoiseSynth(this.noiseSynth.index);
            this.noiseSynth = undefined;
        }
    }
    isInRawFingerprintList(rawList) {
        for(let rawPrint of rawList) {
            if(this.rawEquals(rawPrint)) {
                return true;
            }
        }
        return false;
    }
    rawEquals(rawPrint) {
        return this.rawFingerprint.length === rawPrint.length && this.rawFingerprint.every((value, index) => value === rawPrint[index]);
    }
    show() {
        this.hidden = false;
    }
    hide() {
        this.hidden = true;
        // Hide the mesh
        // Stop any playing
        this.motif.pause();
        this.returnSynths();
        this.numParametersUsed = 0;
    }
    getNumMarkersInCommon(rawFingerprint) {
        let numMarkers = 0;
        for(let i = 0; i < this.rawFingerprint.length; i++) {
            if(this.rawFingerprint[i] == rawFingerprint[i]) {
                numMarkers += 1;
            }
        }
        return numMarkers;
    }
    updateSpace(relativeDistance, delta) {
        if(relativeDistance > 0 && relativeDistance < 100000) {
            if(!this.hidden) {
                this.setDb(relativeDistance * -6.5 - 16);
            // if (distance2 < 110) {
            //     this.material.transparent = true;
            //     this.material.opacity = (distance2-10) / 100;
            // }
            // this.synth.harmonicity.value = Math.floor(Math.max(12 - (distance2 / 10), 1.0));
            // this.synth.envelope.release = Math.max(0.5 - distance2 / 50, 0.002);
            
                let numParameters = Math.max(Math.floor(24 - (Math.max(relativeDistance - 1.0, 0) * 8.0)), 0);
                // Disable devices that would make very little sound to have more resources (synths) left for the ones that will be heard
                if (numParameters < 10) {
                    numParameters = 0;
                }
                // Request and return synths
                if(this.numParametersUsed > 0 && this.synth == undefined) {
                    // if numParameters were 0 we have returned or not requested a synth
                    this.requestNewSynths();
                } else if (numParameters == 0) {
                    // we go frome some parameters to none
                    // return the synth to the pool
                    if(this.synth != undefined) {
                        this.returnSynths();
                    }
                }
                if (numParameters != this.numParametersUsed) {
                    this.numParametersUsed = numParameters;
                    // this.numParametersUsed = 24;
                    this.updateMotif();
                }

                if(this.numParametersUsed > 0 && this.synth != undefined && this.noiseSynth != undefined) {
                    // This only schedules the motif if it wasn't already playing
                    this.motif.play(this.synth.synth, this.noiseSynth.synth, Tone.Transport, this);
                } else {
                    // Pauses the motif if it was playing
                    this.motif.pause();
                }

                this.activation = this.activation * 0.8;
                this.material.color = this.color.clone().multiplyScalar(0.1 + (this.activation * 0.9));

                if(this.type == FPrintTypes.connected) {
                    this.mesh.position.add(new THREE.Vector3((Math.random()-.5)*.1, (Math.random()-.5)*.1, (Math.random()-.5)*.1));
                }
            }

            // this.material.color.multiplyScalar(0.9);
            // this.material.uniforms.time.value += delta;
        } else {
            // console.log("Bad distance to fingerprint: " + relativeDistance + " position: " + JSON.stringify(this.mesh.position));
        }
        
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

function newFingerprintOutsideShaderMaterial() {

    let shaderUniforms = {
        time: { value: 1.0 },
        resolution: {  value: new THREE.Vector2() },
        alpha: { value: 1.0 },
        fogColor:    { value: Graphics.scene.fog.color },
        fogNear:     { value: Graphics.scene.fog.near },
        fogFar:      { value: Graphics.scene.fog.far }
    };
    let shaderMaterial = new THREE.ShaderMaterial( {
        uniforms: shaderUniforms,
        // general vertex shader for fragment shaders
        vertexShader: Shaders.vShader,
        // This is where the magic happens
        // https://stackoverflow.com/questions/24820004/how-to-implement-a-shadertoy-shader-in-three-js
        // for coordinates, use `vec2 p = -1.0 + 2.0 *vUv;`
        fragmentShader: Shaders.fingerprintFShader,
        side: THREE.FrontSide,
        fog: false,
    } );
    // shaderMaterial.fog = true;
    return shaderMaterial;
}

export { Motif, Fingerprint, generateRandomFingerPrint, FPrintTypes }