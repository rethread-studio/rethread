import * as THREE from 'three';
import * as Tone from 'tone';
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass';
// import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls';
import * as Index from './index.js';

import * as Global from './globals.js';
import * as Fingerprint from './fingerprint.js';
import * as Synthesis from './synthesis.js';

var TIME_BETWEEN_CONNECTED_DEVICES_UPDATE = 30.0;

var raycaster;
var controls;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var reduceRadius = false;
var enlargeRadius = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();

var objects = [];
var scene;
var renderer;
var composer;
var camera;
var light;
var spotLight;
var sphereScale;
var sphere;

var inactiveOverlay = document.getElementById("instructions");
var inactiveHtml = "";

var fogFade = 1.0; // to fade the fog between scenes, this is added to the fog value

var mouse = new THREE.Vector2(0, 0);
var mouseClicked = false;

var allTexturesLoaded = false;
var textures = {
    numLoaded: 0,
    totalNumTextures: 2,
};

var loadingDots = 1;
var nextLoadingDot = 0.3;

var hudElement;
var hudFooter;
var hudMessage;
var hudMessageTimer = 0;
var hudContainer;

var filterSlider = document.getElementById("filter-slider");
var filterOutput = document.getElementById("filter-output");
var filterContainer = document.getElementById('filter-container');
filterOutput.innerHTML = filterSlider.value;
filterSlider.oninput = function() {
    filterOutput.innerHTML = this.value;
    Global.data.minimumMarkersInCommon = this.value;
    updateFiltering(this.value);
}

var mobileLock = false;

var font = null;

// A room is an object with an init and an update function
var rooms = {};
var currentRoom = {
    init: function (room) { },
    update: function (cameraDirection) { },
};

function lockIntoExperience() {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
    hudContainer.style.display = 'flex';
    hudElement.style.display = '';
    hudFooter.style.display = '';
    hudMessage.style.display = '';
    displayOnHudFooter("inside space: " + spaceRoom.spaceSection);
    
    Tone.Transport.start();
    console.log("Controls locked, transport started");
}

function unlockFromExperience() {
    blocker.style.display = 'flex';
    instructions.style.display = '';
    hudContainer.style.display = 'none';
    hudElement.style.display = 'none';
    hudFooter.style.display = 'none';
    hudMessage.style.display = 'none';
    currentRoom.pause(currentRoom);
    hideHudFooter();
    Tone.Transport.stop();
}

function resizeCanvasToDisplaySize() {
    const canvas = renderer.domElement;
    // look up the size the canvas is being displayed
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
  
    // adjust displayBuffer size to match
    if (canvas.width !== width || canvas.height !== height) {
      // you must pass false here or three.js sadly fights the browser
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
  
      // update any render target sizes here
    }
  }

// init variables
function init_three() {
    // LOAD TEXTURES
    // instantiate a loader
    var loader = new THREE.TextureLoader();

    // loader.load(
    //     // resource URL
    //     'data/textures/space.jpg',
    //     // onLoad callback
    //     function (texture) {
    //         textures.space = texture;
    //         textures.numLoaded += 1;
    //         if (textures.numLoaded == textures.totalNumTextures) {
    //             allTexturesLoaded = true;
    //         }
    //     },
    //     // onProgress callback currently not supported
    //     undefined,
    //     // onError callback
    //     function (err) {
    //         console.error('An error happened while loading a texture: ' + err);
    //     }
    // );
    // loader.load(
    //     // resource URL
    //     'data/textures/nadia-shape.jpg',
    //     // onLoad callback
    //     function (texture) {
    //         textures.nadia_shape = texture;
    //         textures.numLoaded += 1;
    //         if (textures.numLoaded == textures.totalNumTextures) {
    //             allTexturesLoaded = true;
    //         }
    //     },
    //     // onProgress callback currently not supported
    //     undefined,
    //     // onError callback
    //     function (err) {
    //         console.error('An error happened while loading a texture: ' + err);
    //     }
    // );

    // LOAD FONT
    // var fontLoader = new THREE.FontLoader();

    // fontLoader.load('data/fonts/droid_sans_mono_regular.typeface.json', function (fontLoaded) {
    //     font = fontLoaded;
    // });


    hudElement = document.getElementById("hud");
    hudFooter = document.getElementById("hud-footer");
    hudMessage = document.getElementById("hud-message");
    hudContainer = document.getElementById("hud-container");

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);


    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

    currentRoom = spaceRoom;
    currentRoom.init(currentRoom);

    // POST-PROCESSING

    // composer = new EffectComposer(renderer);
    // composer.addPass(new RenderPass(scene, camera));

    // const bloomPass = new BloomPass(
    //     1,    // strength
    //     25,   // kernel size
    //     4,    // sigma ?
    //     256,  // blur render target resolution
    // );
    // bloomPass.renderToScreen = true;
    // composer.addPass(bloomPass);

    // const filmPass = new FilmPass(
    //     0.35,   // noise intensity
    //     0.025,  // scanline intensity
    //     648,    // scanline count
    //     false,  // grayscale
    // );
    // filmPass.renderToScreen = true;
    // composer.addPass(filmPass);

    // CONTROLS

    // var controls = new THREE.FirstPersonControls( camera, renderer.domElement );
    var blocker = document.getElementById('blocker');
    var instructions = document.getElementById('instructions');

    if(!Global.state.mobile) {
        controls = new PointerLockControls(camera, document.body);
        instructions.addEventListener('click', function () {

            controls.lock();
    
        }, false);
    
        controls.addEventListener('lock', function () {
            lockIntoExperience();
        });
    
        controls.addEventListener('unlock', function () {
            unlockFromExperience();
        });

        scene.add(camera);
    } else if(Global.state.mobile)  {
        controls = new DeviceOrientationControls( camera );
        scene.add(camera);
        // Add touch events
        instructions.addEventListener('touchstart', function () {
            mobileLock = true;
            lockIntoExperience();
            document.addEventListener('touchstart', function() {moveForward = true}, false);
            document.addEventListener('touchend', function() {moveForward = false}, false);

        }, false);
    }
    

    

    

    document.addEventListener('mousedown', () => { mouseClicked = true });
    document.addEventListener('mouseup', () => { mouseClicked = false });

    


    var onKeyDown = function (event) {

        switch (event.keyCode) {

            case 38: // up
            case 87: // w
                moveForward = true;
                break;

            // case 37: // left
            // case 65: // a
            //     moveLeft = true;
            //     break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                break;

            // case 39: // right
            // case 68: // d
            //     moveRight = true;
            //     break;

            // case 80: // p
            //     teleportToPortal();
            //     break;
            // This doesn't work since the ESC keyup unlocks the pointerlock again
            // case 27: // ESC
            //     if(!controls.isLocked) {
            //         controls.lock();
            //     } else {
            //         controls.unlock();
            //     }
            //     break;
        }

    };

    var onKeyUp = function (event) {

        switch (event.keyCode) {

            case 38: // up
            case 87: // w
                moveForward = false;
                break;

            case 37: // left
            case 65: // a
                moveLeft = false;
                break;

            case 40: // down
            case 83: // s
                moveBackward = false;
                break;

            case 39: // right
            case 68: // d
                moveRight = false;
                break;
        }

    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0);

    // RESIZING

    // window.addEventListener('resize', onWindowResize, false);
}

// function onWindowResize() {
//     const canvas = renderer.domElement;
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();

//     // renderer.setSize(window.innerWidth, window.innerHeight);
//     // composer.setSize(canvas.width, canvas.height);

// }

function animate(now) {
    requestAnimationFrame(animate);
    // controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    resizeCanvasToDisplaySize()

    // PointerLockControl

    var time = performance.now();
    var delta = (time - prevTime) / 1000;

    hudMessageTimer -= delta;
    if(hudMessageTimer < 0) {
        hideHudMessage();
    }

    // Get the direction the camera is pointing in world coordinates
    // Rotate to the direction we're looking (the camera always looks down its negative z-axis)
    let cameraDirection = camera.getWorldDirection(new THREE.Vector3(0, 0, -1));

    if (controls.isLocked === true) {
        // damping
        velocity.x -= velocity.x * 1.0 * delta;
        velocity.z -= velocity.z * 1.0 * delta;
        velocity.y -= velocity.y * 1.0 * delta;

        // direction.z = Number(moveForward) - Number(moveBackward);
        // direction.x = Number(moveRight) - Number(moveLeft);
        // direction.y = 0;
        // direction.normalize(); // this ensures consistent movements in all directions

        
        // direction = cameraDirection.multiplyScalar(direction.z);
        direction.copy(cameraDirection).multiplyScalar(Number(moveForward) - Number(moveBackward));

        velocity.sub(direction.multiplyScalar(20.0 * delta));

        camera.position.x -= (velocity.x * delta);
        camera.position.y -= (velocity.y * delta);
        camera.position.z -= (velocity.z * delta);   
    }
    if(Global.state.mobile) {
        // We're using DeviceOrientationControls which need to be updated
        controls.update();
    }
    currentRoom.update(cameraDirection, currentRoom, delta);

    renderer.render(scene, camera);

    prevTime = time;
}

// **************************** ROOMS **************************

let spaceRoom = {
    // Since the fingerprint data may not have loaded when the scene is initiated
    // we will initiate them in the update function and keep track of it here
    fingerprintsAdded: false,
    objects: [],
    fingerprints: [],
    spaceFog: 0.02,
    lightColor: new THREE.Color(0xdddddd),
    darkColor: new THREE.Color(0x555555),
    spaceSection: "currently connected devices",
    timeUntilConnectedUpdate: 30,
    lastMinimumMarkersInCommon: 0,
    filteredOutFingerprints: [],
    spawnDistance: 1.5, // first time we spawn it should be close to your own fingerprint, next time not as close

    init: function (room) {
        showFilter();
        fogFade = 1.0;
        setHudMessageColor('#777777');
        // SCENE
        scene = new THREE.Scene();
        scene.background = room.lightColor;
        scene.fog = new THREE.FogExp2(room.lightColor, room.spaceFog + fogFade);

        camera.position.set(0, 0, room.spawnDistance);

        light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
        light.position.set(0.5, 1, 0.75);
        scene.add(light);


        spotLight = new THREE.SpotLight(0xffffff);
        spotLight.castShadow = true;
        spotLight.shadow.camera.near = 10;
        spotLight.shadow.camera.far = 4000;
        spotLight.shadow.camera.fov = 30;
        spotLight.power = 30;
        spotLight.angle = 0.8;
        spotLight.penumbra = 0.9;
        scene.add(spotLight);
        scene.add(spotLight.target);

        spaceRoom.initSound(spaceRoom);
    },
    initSound: function (room) {
        Tone.Transport.bpm.value = 120;

        Synthesis.noiseEnv.triggerAttack();

        let bassSynth = new Tone.MembraneSynth(
            {
                pitchDecay: 0.2,
                octaves: 10,
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    sustain: 0.01,
                    release: 1.4,
                    attackCurve: "exponential"
                }
            }
        ).connect(Synthesis.longverb).toMaster();

        let sonarSynth = new Tone.FMSynth({
            harmonicity: 2,
            modulationIndex: 2,
            detune: 0,
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                decay: 0.01,
                sustain: 1,
                release: 0.2
            },
            modulation: {
                type: "sine"
            },
            modulationEnvelope: {
                attack: 0.5,
                decay: 0,
                sustain: 1,
                release: 0.5
            }
        }
        ).connect(Synthesis.longverb).toMaster();
        sonarSynth.volume.value = -12;
        spaceRoom.sonarPitch = Tone.Frequency.mtof(Global.sound.stablePitches[1] + 12);

        spaceRoom.bassSynth = bassSynth;
        spaceRoom.sonarSynth = sonarSynth;

        room.padSynths = [];
        room.pitchSet = Global.sound.pitchSets[0];
        room.octave = 0;
        for(let i = 0; i < 5; i++) {
            let newSynth = Synthesis.newPadSynth(20);
            newSynth.pitchIndex = i;
            room.padSynths.push(newSynth); // Tone.Frequency.mtof(notes[i]-12)
        }

        spaceRoom.loopCounter = 0;
        spaceRoom.loop = new Tone.Loop(function (time) {

            // Change the pitch of a random pad synth
            {
                let i = Math.floor(Math.random() * room.padSynths.length);
                room.padSynths[i].pitchIndex -= 1;
                if(room.padSynths[i].pitchIndex < 0) {
                    room.padSynths[i].pitchIndex += room.pitchSet.length;
                }
                room.padSynths[i].midi = room.pitchSet[room.padSynths[i].pitchIndex] + (12 * room.octave);
                room.padSynths[i].toggle(room.padSynths[i], time);
            }
            // Toggle a random pad synth
            {
                let i = Math.floor(Math.random() * room.padSynths.length);
                room.padSynths[i].pitchIndex -= 1;
                if(room.padSynths[i].pitchIndex < 0) {
                    room.padSynths[i].pitchIndex += room.pitchSet.length;
                }
                room.padSynths[i].toggle(room.padSynths[i], time);
            }
            // room.padSynths[i].midi = room.pitchSet[room.padSynths[i].pitchIndex] + (12 * room.octave);
            // for(let i = 0; i < room.padSynths.length; i++) {
            //     if(room.loopCounter % ((i+1)) == 0) {
            //         room.padSynths[i].pitchIndex -= 1;
            //         if(room.padSynths[i].pitchIndex < 0) {
            //             room.padSynths[i].pitchIndex += room.pitchSet.length;
            //         }
            //         room.padSynths[i].midi = room.pitchSet[room.padSynths[i].pitchIndex] + (12 * room.octave);
            //         // Transpose down an octave
            //         if(Math.random() > 0.6) {
            //             room.padSynths[i].midi -= 12;
            //         } else if(Math.random() > 0.7) {
            //             room.padSynths[i].midi -= 24;
            //         }
            //         room.padSynths[i].toggle(room.padSynths[i], time);
            //     }
            // }

            // switch (spaceRoom.loopCounter) {
            //     case 0:
            //         spaceRoom.bassSynth.triggerAttackRelease("D0", "1n", time, 0.4);
            //         spaceRoom.sonarSynth.triggerAttackRelease(spaceRoom.sonarPitch, "16n", time, 0.4);
            //         break;
            //     case 2:
            //         spaceRoom.sonarSynth.triggerAttackRelease(spaceRoom.sonarPitch, "16n", time, 0.2);
            //         break;
            //     case 8:
            //         spaceRoom.bassSynth.triggerAttackRelease("D#0", "1n", time, 0.15);
            //         break;
            //     case 16:
            //         spaceRoom.bassSynth.triggerAttackRelease("E0", "1n", time, 0.1);
            //         break;
            //     case 24:
            //         spaceRoom.bassSynth.triggerAttackRelease("F0", "1n", time, 0.05);
            //         break;
            //     case 27:
            //         spaceRoom.bassSynth.triggerAttackRelease("D#0", "1n", time, 0.03);
            //         break;
            //     case 31:
            //         spaceRoom.bassSynth.triggerAttackRelease("D#0", "1n", time, 0.03);
            //         break;
            //     case 32:
            //         spaceRoom.bassSynth.triggerAttackRelease("D0", "1n", time, 0.15);
            //         break;
            //     case 48:
            //         spaceRoom.bassSynth.triggerAttackRelease("E0", "1n", time, 0.1);
            //         spaceRoom.sonarSynth.triggerAttackRelease(spaceRoom.sonarPitch, "16n", time, 0.4);
            //         break;
            //     case 50:
            //         spaceRoom.sonarSynth.triggerAttackRelease(spaceRoom.sonarPitch, "16n", time, 0.2);
            //     case 63:
            //         spaceRoom.bassSynth.triggerAttackRelease("D#0", "1n", time, 0.03);
            //         break;
            // }

            spaceRoom.loopCounter = (spaceRoom.loopCounter + 1) % 64;
        }, "16n").start(0);
    },
    update: function (cameraDirection, room, delta) {
        // Initiate fingerprints if the data has been loaded from the server
        if (spaceRoom.fingerprintsAdded == false && Global.data.loadedData == true && Global.data.loadedLocal && Global.data.loadedConnected) {

            room.connectedSphereRadius = 30 + Math.pow(Global.data.connectedFingerprints.length * 50, 1/3);
            // Its handy to keep the squared radius for distance calculations
            room.connectedSphereRadius2 = room.connectedSphereRadius * room.connectedSphereRadius;
            sphereScale = 2.0;
            var sphereGeometry = new THREE.SphereGeometry(room.connectedSphereRadius * 0.9, 32, 32);
            var sphereMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                wireframe: false,
                transparent: true,
                opacity: 0.5,
                flatShading: true,
                metalness: 1.0
            });
            room.connectedSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            scene.add(room.connectedSphere);
            
            // Add the currently connected fingerprints to the room
            room.addAllFingerprints(room, camera.position, room.connectedSphereRadius, Global.data.connectedFingerprints);
            room.updateFiltering(Global.data.minimumMarkersInCommon); // 
            // Set all the newly added fingerprints as current fingerprints for DEBUG
            // for(let i = 0; i < room.fingerprints.length; i++) {
            //     room.fingerprints[i].type = Fingerprint.FPrintTypes.connected;
            // }

            // Add the fingerprint of the current user if they have consented to have it
            if(Global.data.localFingerprint != undefined) {
                Global.data.localFingerprint.addToSpace(scene, spaceRoom.objects, camera.position);
                room.fingerprints.push(Global.data.localFingerprint);
                room.localFingerprint = Global.data.localFingerprint;
                // Move a little bit from the center so you don't collide with your own fingerprint
                // camera.position.z = 15; // This is already the default position
            } else {
                room.localFingerprint = undefined;
            }
            

            spaceRoom.fingerprintsAdded = true;
            inactiveOverlay.innerHTML = Global.html.inactiveInstructions;
            console.log("Added all the fingerprints");
        }

        if(spaceRoom.fingerprintsAdded) {
            // Everything is initiated, we're ready to start updating
        
            // // React to keys being pressed to change the size of the influence radius
            // if (enlargeRadius) {
            //     sphereScale *= 1.03;
            //     sphereScale = Math.min(sphereScale, 4.0);
            // }
            // if (reduceRadius) {
            //     sphereScale *= 0.98;
            //     sphereScale = Math.max(sphereScale, 0.05);
            // }
            // if (enlargeRadius || reduceRadius) {
            //     sphere.scale.set(sphereScale, sphereScale, sphereScale);
            // }

            // raycaster.ray.origin.copy(camera.position);
            // As long as we're using a PointerLock the mouse should always be in the center
            raycaster.setFromCamera(mouse, camera);
            var intersections = raycaster.intersectObjects(spaceRoom.objects);

            for (var i = 0; i < intersections.length; i++) {
                if (intersections[i].distance < 1.0) {
                    // Travel into the fingerprint
                    let fingerprintRoom = intersections[i].object.userData.fingerprintPtr.generateFingerprintRoom();
                    travelToRoom(fingerprintRoom);
                    return;
                } else if (intersections[i].distance < 10.0) {
                    let text = intersections[i].object.userData.fingerprintPtr.getHoverText();
                    displayOnHud("<span>" + text + "</span><br/><br/><span>travel into fingerprint</span>");
                    if(mouseClicked) {
                        let synTest = "there";
                        if(intersections[i].object.userData.fingerprintPtr.synth == undefined) { 
                            synTest = "undefined, free synths: " + Synthesis.getNumFreeFMSynths();
                        }

                        console.log("synth is " + synTest + ", free synths: " + Synthesis.getNumFreeFMSynths());
                        console.log(JSON.stringify(intersections[i].object.userData.fingerprintPtr.motif));
                    }
                    
                } else if(intersections[i].distance < 30.0) {
                    let text = intersections[i].object.userData.fingerprintPtr.getHoverText();
                    displayOnHud("<span>" + text + "</span>");
                    let hasSynth = true;
                    if(intersections[i].object.userData.fingerprintPtr.synth == undefined) { 
                        console.log("synth is undefined, free synths: " + Synthesis.getNumFreeFMSynths());
                    }
                    
                }

                // console.log(intersections[i]);
                
                /*
                    An intersection has the following properties :
                        - object : intersected object (THREE.Mesh)
                        - distance : distance from camera to intersection (number)
                        - face : intersected face (THREE.Face3)
                        - faceIndex : intersected face index (number)
                        - point : intersection point (THREE.Vector3)
                        - uv : intersection point in the object's UV coordinates (THREE.Vector2)
                */
            }
            if (intersections.length == 0) {
                hideHud();
            }

            // Calculate distance to objects
            let minDist = 100000.0;
            for (let fp of spaceRoom.fingerprints) {
                let d2 = camera.position.distanceToSquared(fp.mesh.position);
                fp.distance2 = d2;
                if (d2 < minDist) { 
                    minDist = d2;
                    room.pitchSet = fp.motif.pitchSet;
                    room.octave = fp.motif.octave;
                }
            }
            if(minDist == 0) { minDist = 1;} // avoid division by zero
            for(let fp of spaceRoom.fingerprints) {
                fp.updateSpace( (fp.distance2/minDist) * (1.0 / sphereScale), delta);
            }

            // Make the fog really thick when you're close to an object
            // if (minDist < 150) {
            //     scene.fog.density = Math.max(Math.pow(1 - (minDist / 150), 3.0), 0.02);
            // } else {
            //     scene.fog.density = 0.02;
            // }

            if (minDist < 1000) {
                Synthesis.globalSynthLPF.frequency.value = 2000 - (minDist * 1.3);
            }
            if(minDist < 500) {
                Synthesis.noiseUsrGain.value = Math.pow(1.0 - (minDist/500), 4.0) * 0.01;
            }
            if (minDist < 150) {
                fogFade = Math.pow(1.0 - (minDist / 150), 5.0);
            }

            // Calculate distance to object at a position forward in space
            minDist = 100000.0;
            let positionForward = new THREE.Vector3();
            camera.getWorldDirection(positionForward);
            positionForward.multiplyScalar(50).add(camera.position);
            for (let fp of spaceRoom.fingerprints) {
                let d2 = positionForward.distanceToSquared(fp.mesh.position);
                fp.distance2 = d2;
                if (d2 < minDist) { minDist = d2; }
            }
            for (let fp of spaceRoom.filteredOutFingerprints) {
                let d2 = positionForward.distanceToSquared(fp.mesh.position);
                fp.distance2 = d2;
                if (d2 < minDist) { minDist = d2; }
            }
            // Add new fingerprints if they're too far out 
            if (minDist > 1500) {
                let newFingerprintRadius = 20;
                // Check that the fingerprints are in the "dark" space for archived devices
                if(positionForward.distanceToSquared(new THREE.Vector3(0, 0, 0)) > 
                    (room.connectedSphereRadius2 + Math.pow(newFingerprintRadius, 2))) {
                    // add a variable number of new fingerprints
                    let numPrints = Math.random() * 4;
                    for(let i = 0; i<numPrints; i++) {
                        room.addAdditionalFingerprint(room, positionForward, newFingerprintRadius, Global.data.fingerprints);
                        room.updateFiltering(this.lastMinimumMarkersInCommon);
                    }
                }
                
            }

            // Update fog
            if (fogFade > 0.0) {
                scene.fog.density = room.spaceFog + fogFade;
                fogFade *= 0.9;
            } else {
                scene.fog.density = room.spaceFog;
            }
            let d2FromCenter = camera.position.distanceToSquared(new THREE.Vector3(0, 0, 0));
            if( d2FromCenter > room.connectedSphereRadius2) {
                // console.log("dark space");
                let darkSpaceSection= "archived device traces"
                if(room.spaceSection != darkSpaceSection) {
                    displayOnHudMessage(Global.getRandomDarkSpaceMessage());
                }
                room.spaceSection = darkSpaceSection;
                setHudMessageColor('#ffffff');
                displayOnHudFooter("inside space: " + spaceRoom.spaceSection);
                // we are in a darker space where old non-connected fingerprints are shown
                room.spaceFog = 0.05;
                scene.fog.color = room.darkColor;
                scene.background = room.darkColor;
            } else if(d2FromCenter > room.connectedSphereRadius2 * 0.8) {
                let lerp = (room.connectedSphereRadius2 - d2FromCenter) / (room.connectedSphereRadius2 * 0.2);
                let lerpColor = new THREE.Color(room.darkColor);
                lerpColor.lerp(room.lightColor, lerp);
                scene.fog.color = lerpColor;
                scene.background = lerpColor;
            } else {
                room.spaceFog = 0.035;
                scene.fog.color = room.lightColor;
                scene.background = room.lightColor;
                let insideSphereSection = "currently connected devices";
                setHudMessageColor('#777777');
                if(room.spaceSection != insideSphereSection) {
                    displayOnHudMessage(Global.getRandomInsideSphereMessage());
                }
                room.spaceSection = insideSphereSection;
                displayOnHudFooter("inside space: " + spaceRoom.spaceSection);
            }

            if(room.localFingerprint != undefined) {
                // mirror the position of the user and the local fingerprint
                let mirrorPosition = camera.position.clone();
                mirrorPosition.z *= -1;
                // mirrorPosition.y *= -1;
                mirrorPosition.x *= -1;

                room.localFingerprint.setPosition(mirrorPosition);
            }

            room.timeUntilConnectedUpdate -= delta;
            if(room.timeUntilConnectedUpdate <= 0) {
                room.timeUntilConnectedUpdate = TIME_BETWEEN_CONNECTED_DEVICES_UPDATE;
                Index.refreshConnectedFingerPrints();
            }
            

            // Move light to where the camera is
            spotLight.position.copy(camera.position);
            spotLight.target.position.copy(cameraDirection);
            spotLight.target.position.add(camera.position);

            // If we are teleported out of bounds, jump back to the origin
            let outOfBounds = 1000;
            if (camera.position.x > outOfBounds
                || camera.position.x < -outOfBounds
                || camera.position.y > outOfBounds
                || camera.position.y < -outOfBounds
                || camera.position.z > outOfBounds
                || camera.position.x < -outOfBounds
            ) {
                camera.position.copy(new THREE.Vector3(0, 0, 0));
            }
        } else {
            let dots = "";
            for(let i = 0; i < loadingDots; i++) {
                dots += ".";
            }
            nextLoadingDot -= delta;
            if(nextLoadingDot <= 0) {
                loadingDots = (loadingDots + 1) % 5;
                nextLoadingDot = 0.5;
            }
            inactiveHtml = `<span style="font-size:36px">Loading data ` + dots + `</span><br /><br />`;
            if(Global.data.loadedData) {
                inactiveHtml += "Currently connected device fingerprints loaded<br/>";
            }
            if(Global.data.loadedLocal && Global.data.localFingerprint != undefined) {
                inactiveHtml += "Fingerprint of local device loaded<br/>";
            }
            if(Global.data.loadedConnected) {
                inactiveHtml += "Fingerprint of connected devices loaded<br/>";
            }
            inactiveOverlay.innerHTML = inactiveHtml;
        }
    },
    addAdditionalFingerprint: function(room, relativePos, size, fingerprintArray) {
        let minDist = 0.2;
        let randomIndex = Math.floor(Math.random() * fingerprintArray.length);
        let position = getRandomSphereCoordinate(size, minDist);
        position.add(relativePos);
        // console.log("Adding fingerprint at " + JSON.stringify(position));
        fingerprintArray[randomIndex].addToSpace(scene, spaceRoom.objects, position);
        room.fingerprints.push(fingerprintArray[randomIndex]);
    },
    addAllFingerprints: function(room, relativePos, size, fingerprintArray) {
        let minDist = 0.2;
        for(let fprint of fingerprintArray) {
            if(Global.data.localFingerprint == undefined || Global.data.localFingerprint.rawEquals(newArr) == false) {
                let position = getRandomSphereCoordinate(size, minDist);
                position.add(relativePos);
                fprint.addToSpace(scene, spaceRoom.objects, position);
                room.fingerprints.push(fprint);
            }
        }
        
    },
    removeFingerprint: function(room, fprint) {
        for(let i = 0; i < room.fingerprints.length; i++) {
            if (fprint.rawEquals(room.fingerprints[i])) {
                room.fingerprints[i].cleanUpSpace(scene);
                room.fingerprints.splice(i, 1);
                i--;
            }
        }
    },
    updateFiltering: function(room, minimumMarkersInCommon) {
        if(minimumMarkersInCommon >= this.lastMinimumMarkersInCommon) {
            // Check if any additional fingerprints need to be removed
            if(Global.data.localRawFingerprint != undefined) {
                for(let j = 0; j < room.fingerprints.length; j++) {
                    if(room.fingerprints[j].getNumMarkersInCommon(Global.data.localRawFingerprint) < minimumMarkersInCommon) {
                        room.fingerprints[j].cleanUpSpace(scene);
                        room.filteredOutFingerprints.push(room.fingerprints[j]);
                        room.fingerprints.splice(j, 1);
                        j--;
                    }
                }
            }
        } else if (minimumMarkersInCommon < this.lastMinimumMarkersInCommon) {
            // Check if any fingerprints need to be put back into the room
            if(Global.data.localRawFingerprint != undefined) {
                for(let j = 0; j < room.filteredOutFingerprints.length; j++) {
                    if(room.filteredOutFingerprints[j].getNumMarkersInCommon(Global.data.localRawFingerprint) >= minimumMarkersInCommon) {
                        scene.add(room.filteredOutFingerprints[j].mesh);
                        room.fingerprints.push(room.filteredOutFingerprints[j]);
                        room.filteredOutFingerprints.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        this.lastMinimumMarkersInCommon = minimumMarkersInCommon;
    },
    addNewConnectedFingerprint: function(room, newFingerprint) {
        // Update the sphere
        room.connectedSphereRadius = 30 + Math.pow(Global.data.connectedFingerprints.length * 50, 1/3);
        // Its handy to keep the squared radius for distance calculations
        room.connectedSphereRadius2 = room.connectedSphereRadius * room.connectedSphereRadius;
        room.connectedSphere.geometry.radius = room.connectedSphereRadius;

        // Add the new fingerprint
        let minDist = 0.2;
        let position = getRandomSphereCoordinate(room.connectedSphereRadius * 0.9, minDist);
        newFingerprint.addToSpace(scene, room.objects, position);
        room.fingerprints.push(newFingerprint);
    },
    pause: function(room) {
        // This happens when the pointer controls are unlocked
        // Turn all of the pad synths off
        for(let i = 0; i < room.padSynths.length; i++) {
            room.padSynths[i].release(room.padSynths[i]);
        }
    },
    cleanUp: function (room) {
        for (let fprint of spaceRoom.fingerprints) {
            fprint.cleanUpSpace(scene);
        }
        for(let i = 0; i < room.padSynths.length; i++) {
            room.padSynths[i].dispose(room.padSynths[i]);
        }
        spaceRoom.fingerprintsAdded = false;
        spaceRoom.fingerprints = [];
        spaceRoom.loop.stop();
        room.spawnDistance = 10;
        setHudMessageColor('#ffffff');
        hideHud();
    }
}

// adapted from https://karthikkaranth.me/blog/generating-random-points-in-a-sphere/
function getRandomSphereCoordinate(radius, distPercentage) {
    let u = Math.random();
    let v = Math.random();
    let theta = u * 2.0 * Math.PI;
    let phi = Math.acos(2.0 * v - 1.0);
    let r = Math.cbrt(Math.random()) * (1.0 - distPercentage) + distPercentage;
    r *= radius;
    let sinTheta = Math.sin(theta);
    let cosTheta = Math.cos(theta);
    let sinPhi = Math.sin(phi);
    let cosPhi = Math.cos(phi);
    let x = r * sinPhi * cosTheta;
    let y = r * sinPhi * sinTheta;
    let z = r * cosPhi;
    return new THREE.Vector3(x, y, z);    
}

function removeFingerprintFromRoom(fprint) {
    currentRoom.removeFingerprint(currentRoom, fprint);
}

function getNewSpacePortal() {
    let portalGeometry = new THREE.PlaneGeometry(14, 14, 1, 1);
    let portalMaterial = new THREE.MeshBasicMaterial({ color: 0xccccff, side: THREE.FrontSide, map: textures.space });
    let portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.castShadow = true;
    portal.rotateY(Math.PI);
    portal.position.set(0, 0, 28);
    portal.userData.roomPointer = spaceRoom;
    return portal;
}

function teleportToPortal() {
    currentRoom.cleanUp(currentRoom);
    currentRoom = portalRoom;
    currentRoom.init(currentRoom);
}

function travelToCenter() {
    if(currentRoom == spaceRoom) {
        camera.position.set(0, 0, 15);
    } else {
        travelToRoom(spaceRoom);
    }
}
var centerButton = document.getElementById('return-to-center-button');
centerButton.addEventListener('click', travelToCenter);

function travelToRoom(room) {
    currentRoom.cleanUp(currentRoom)
    currentRoom = room;
    velocity.set(0, 0, 0);
    currentRoom.init(currentRoom);
}

function displayOnHud(html) {
    hudElement.innerHTML = html;
    hudElement.style.opacity = 1.0;
}
function hideHud() {
    hudElement.style.opacity = 0.0;
}
function displayOnHudFooter(html) {
    hudFooter.innerHTML = html;
    hudFooter.style.opacity = 1.0;
}
function hideHudFooter() {
    hudFooter.style.opacity = 0.0;
}
function displayOnHudMessage(html, dur = 10.0) {
    hudMessageTimer = dur;
    hudMessage.innerHTML = html;
    hudMessage.style.opacity = 1.0;
}
function setHudMessageColor(colStr) {
    hudMessage.style.color = colStr;
}
function hideHudMessage() {
    hudMessage.style.opacity = 0.0;
}

function newScene(color, fog) {
    scene = new THREE.Scene();
    scene.background = color;
    scene.fog = fog;
    scene.add(camera);
}

function setFogFade(density) {
    fogFade = density;
}

function updateSceneFog() {
    if(fogFade > 0.0001) {
        scene.fog.density = 0.02 + fogFade;
    }
}

function updateFiltering(minimumValuesInCommon) {
    if(currentRoom == spaceRoom) {
        currentRoom.updateFiltering(currentRoom, minimumValuesInCommon);
    }
}

function showFilter() {
    // filterContainer.style.display = '';
    if(Global.data.localFingerprint != undefined) {
        document.getElementById('filter-span').style.display = '';
        filterOutput.style.display = '';
        filterSlider.style.display = '';
    }
}

function hideFilter() {
    // filterContainer.style.display = 'none';
    document.getElementById('filter-span').style.display = 'none';
    filterOutput.style.display = 'none';
    filterSlider.style.display = 'none';
}

function lookAt(pos) {
    camera.lookAt(pos);
}

function addNewConnectedFingerprint(newFingerprint) {
    if(currentRoom == spaceRoom) {
        currentRoom.addNewConnectedFingerprint(currentRoom, newFingerprint);
    }
}

export { init_three, 
    animate, 
    scene, 
    controls,
    camera,
    spaceRoom, 
    currentRoom, 
    newScene, 
    mouseClicked, 
    getNewSpacePortal, 
    displayOnHud, 
    hideHud, 
    displayOnHudFooter,
    displayOnHudMessage,
    raycaster, 
    travelToRoom, 
    fogFade, 
    setFogFade,
    updateSceneFog,
    removeFingerprintFromRoom,
    hideFilter,
    lookAt,
    addNewConnectedFingerprint,
 }; 