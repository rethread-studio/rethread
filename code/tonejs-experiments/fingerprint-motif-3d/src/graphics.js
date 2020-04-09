import * as THREE from 'three';
import * as Tone from 'tone';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

import * as Global from './globals.js';
import * as Fingerprint from './fingerprint.js';
import * as tone_init from './tone_init.js';

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

var fogFade = 1.0; // to fade the fog between scenes, this is added to the fog value

var mouse = new THREE.Vector2(0, 0);
var mouseClicked = false;

var allTexturesLoaded = false;
var textures = {
    numLoaded: 0,
    totalNumTextures: 2,
};

var hudElement;
var hudContainer;

var font = null;

// A room is an object with an init and an update function
var rooms = {};
var currentRoom = {
    init: function (room) { },
    update: function (cameraDirection) { },
};

// init variables
function init_three() {
    // LOAD TEXTURES
    // instantiate a loader
    var loader = new THREE.TextureLoader();

    loader.load(
        // resource URL
        'data/textures/space.jpg',
        // onLoad callback
        function (texture) {
            textures.space = texture;
            textures.numLoaded += 1;
            if (textures.numLoaded == textures.totalNumTextures) {
                allTexturesLoaded = true;
            }
        },
        // onProgress callback currently not supported
        undefined,
        // onError callback
        function (err) {
            console.error('An error happened while loading a texture: ' + err);
        }
    );
    loader.load(
        // resource URL
        'data/textures/nadia-shape.jpg',
        // onLoad callback
        function (texture) {
            textures.nadia_shape = texture;
            textures.numLoaded += 1;
            if (textures.numLoaded == textures.totalNumTextures) {
                allTexturesLoaded = true;
            }
        },
        // onProgress callback currently not supported
        undefined,
        // onError callback
        function (err) {
            console.error('An error happened while loading a texture: ' + err);
        }
    );

    // LOAD FONT
    var fontLoader = new THREE.FontLoader();

    fontLoader.load('data/fonts/droid_sans_mono_regular.typeface.json', function (fontLoaded) {
        font = fontLoaded;
    });


    hudElement = document.getElementById("hud");
    hudContainer = document.getElementById("hud-container");

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);


    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

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

    controls = new PointerLockControls(camera, document.body);

    var blocker = document.getElementById('blocker');
    var instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {

        controls.lock();

    }, false);

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        hudContainer.style.display = 'block';
        hudElement.style.display = '';
        Tone.Transport.start();
        console.log("Controls locked, transport started");
    });

    controls.addEventListener('unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
        hudContainer.style.display = 'none';
        hudElement.style.display = 'none';
        Tone.Transport.stop();
    });

    document.addEventListener('mousedown', () => { mouseClicked = true });
    document.addEventListener('mouseup', () => { mouseClicked = false });

    scene.add(controls.getObject());


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

            // case 81: // q
            //     enlargeRadius = true;
            //     break;

            // case 69: // e
            //     reduceRadius = true;
            //     break;

            case 80: // p
                teleportToPortal();
                break;
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

            case 81: // q
                enlargeRadius = false;
                break;

            case 69: // e
                reduceRadius = false;
                break;
        }

    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0);

    // RESIZING

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const canvas = renderer.domElement;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    // composer.setSize(canvas.width, canvas.height);

}

function animate(now) {
    requestAnimationFrame(animate);
    // controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    // PointerLockControl

    if (controls.isLocked === true) {

        var time = performance.now();
        var delta = (time - prevTime) / 1000;

        // damping
        velocity.x -= velocity.x * 1.0 * delta;
        velocity.z -= velocity.z * 1.0 * delta;
        velocity.y -= velocity.y * 1.0 * delta;

        // direction.z = Number(moveForward) - Number(moveBackward);
        // direction.x = Number(moveRight) - Number(moveLeft);
        // direction.y = 0;
        // direction.normalize(); // this ensures consistent movements in all directions

        // Rotate to the direction we're looking
        let cameraDirection = camera.getWorldDirection(new THREE.Vector3(0, 0, -1));
        // direction = cameraDirection.multiplyScalar(direction.z);
        direction.copy(cameraDirection).multiplyScalar(Number(moveForward) - Number(moveBackward));

        velocity.sub(direction.multiplyScalar(20.0 * delta));

        controls.getObject().position.x -= (velocity.x * delta);
        controls.getObject().position.y -= (velocity.y * delta);
        controls.getObject().position.z -= (velocity.z * delta); // new behavior

        currentRoom.update(cameraDirection, currentRoom, delta);

        prevTime = time;
    }

    renderer.render(scene, camera);
}

// **************************** ROOMS **************************

let spaceRoom = {
    // Since the fingerprint data may not have loaded when the scene is initiated
    // we will initiate them in the update function and keep track of it here
    fingerprintsAdded: false,
    objects: [],
    fingerprints: [],
    spaceFog: 0.02,
    currentlyConnectedRadius2: 2000,
    lightColor: new THREE.Color(0xdddddd),
    darkColor: new THREE.Color(0x555555),
    spaceSection: "currently connected devices",

    init: function (room) {
        fogFade = 1.0;
        // SCENE
        scene = new THREE.Scene();
        scene.background = room.lightColor;
        scene.fog = new THREE.FogExp2(room.lightColor, room.spaceFog + fogFade);



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

        var sphereRadius = 30;
        sphereScale = 2.0;
        var sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
        var sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0x222233,
            side: THREE.BackSide,
            wireframe: false,
            transparent: true,
            opacity: 0.8,
            flatShading: true,
            metalness: 1.0
        });
        sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        // scene.add(sphere);

        spaceRoom.initSound(spaceRoom);
    },
    initSound: function (room) {
        Tone.Transport.bpm.value = 120;

        Global.sound.noiseEnv.triggerAttack();

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
        ).connect(Global.sound.longverb).toMaster();

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
        ).connect(Global.sound.longverb).toMaster();
        sonarSynth.volume.value = -12;
        spaceRoom.sonarPitch = Tone.Frequency.mtof(Global.sound.stablePitches[1] + 12);

        spaceRoom.bassSynth = bassSynth;
        spaceRoom.sonarSynth = sonarSynth;

        room.padSynths = [];
        room.pitchSet = Global.sound.pitchSets[0];
        for(let i = 0; i < 5; i++) {
            let newSynth = tone_init.newPadSynth(20);
            newSynth.pitchIndex = i;
            newSynth.playing = false;
            newSynth.midi = room.pitchSet[newSynth.pitchIndex];
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

        spaceRoom.loopCounter = 0;
        spaceRoom.loop = new Tone.Loop(function (time) {
            for(let i = 0; i < room.padSynths.length; i++) {
                if(room.loopCounter % ((i+1)) == 0) {
                    room.padSynths[i].pitchIndex -= 1;
                    if(room.padSynths[i].pitchIndex < 0) {
                        room.padSynths[i].pitchIndex += room.pitchSet.length;
                    }
                    room.padSynths[i].midi = room.pitchSet[room.padSynths[i].pitchIndex];
                    // Transpose down an octave
                    if(Math.random() > 0.6) {
                        room.padSynths[i].midi -= 12;
                    } else if(Math.random() > 0.7) {
                        room.padSynths[i].midi -= 24;
                    }
                    room.padSynths[i].toggle(room.padSynths[i], time);
                }
            }

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
        if (spaceRoom.fingerprintsAdded == false && Global.data.loadedData == true && Global.data.loadedLocal) {
            
            // Add the fingerprints to the room
            let size = 50;
            for (let i = 0; i < 20; i++) {
                room.addAdditionalFingerprint(room, camera.position, 50);
            }
            // Set all the newly added fingerprints as current fingerprints for DEBUG
            for(let i = 0; i < room.fingerprints.length; i++) {
                room.fingerprints[i].type = Fingerprint.FPrintTypes.connected;
            }

            // Add the fingerprint of the current user
            Global.data.localFingerprint.addToSpace(scene, spaceRoom.objects, camera.position);
            room.fingerprints.push(Global.data.localFingerprint);
            // Move a little bit from the center so you don't collide with your own fingerprint
            controls.getObject().position.z = 15;

            spaceRoom.fingerprintsAdded = true;
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

            // raycaster.ray.origin.copy(controls.getObject().position);
            // As long as we're using a PointerLock the mouse should always be in the center
            raycaster.setFromCamera(mouse, camera);
            var intersections = raycaster.intersectObjects(spaceRoom.objects);

            for (var i = 0; i < intersections.length; i++) {
                if (intersections[i].distance < 2.0) {
                    // Travel into the fingerprint
                    let fingerprintRoom = intersections[i].object.userData.fingerprintPtr.generateFingerprintRoom();
                    travelToRoom(fingerprintRoom);
                } else if (intersections[i].distance < 10.0) {
                    let text = intersections[i].object.userData.fingerprintPtr.getHoverText();
                    displayOnHud("<span>" + text + "</span><br/><br/><span>travel into fingerprint</span>");
                    // console.log(JSON.stringify(intersections[i].object.userData.fingerprintPtr.motif));
                } else if(intersections[i].distance < 30.0) {
                    let text = intersections[i].object.userData.fingerprintPtr.getHoverText();
                    displayOnHud("<span>" + text + "</span>");
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
                let d2 = controls.getObject().position.distanceToSquared(fp.mesh.position);
                fp.distance2 = d2;
                if (d2 < minDist) { 
                    minDist = d2;
                    room.pitchSet = fp.motif.pitchSet;
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
                Global.sound.globalSynthLPF.frequency.value = 2000 - (minDist * 1.3);
            }
            if(minDist < 500) {
                Global.sound.noiseUsrGain.value = Math.pow(1.0 - (minDist/500), 4.0) * 0.01;
            }
            if (minDist < 200) {
                fogFade = Math.pow(1.0 - (minDist / 200), 4.0);
            }

            // Calculate distance to object at a position forward in space
            minDist = 100000.0;
            let positionForward = new THREE.Vector3();
            camera.getWorldDirection(positionForward);
            positionForward.multiplyScalar(50).add(controls.getObject().position);
            for (let fp of spaceRoom.fingerprints) {
                let d2 = positionForward.distanceToSquared(fp.mesh.position);
                fp.distance2 = d2;
                if (d2 < minDist) { minDist = d2; }
            }
            // Add new fingerprints if they're too far out
            if (minDist > 1500) {
                let numPrints = Math.random() * 4;
                for(let i = 0; i<numPrints; i++) {
                    room.addAdditionalFingerprint(room, positionForward, 20);   
                }
            }

            // Update fog
            if (fogFade > 0.0) {
                scene.fog.density = room.spaceFog + fogFade;
                fogFade *= 0.9;
            } else {
                scene.fog.density = room.spaceFog;
            }
            let d2FromCenter = controls.getObject().position.distanceToSquared(new THREE.Vector3(0, 0, 0));
            if( d2FromCenter > room.currentlyConnectedRadius2) {
                console.log("dark space");
                room.spaceSection = "unconnected devices"
                // we are in a darker space where old non-connected fingerprints are shown
                room.spaceFog = 0.05;
                scene.fog.color = room.darkColor;
                scene.background = room.darkColor;
            } else if(d2FromCenter > room.currentlyConnectedRadius2 * 0.8) {
                let lerp = (room.currentlyConnectedRadius2 - d2FromCenter) / (room.currentlyConnectedRadius2 * 0.2);
                let lerpColor = new THREE.Color(room.darkColor);
                lerpColor.lerp(room.lightColor, lerp);
                scene.fog.color = lerpColor;
                scene.background = lerpColor;
            } else {
                room.spaceFog = 0.035;
                scene.fog.color = room.lightColor;
                scene.background = room.lightColor;
                room.spaceSection = "currently connected devices";
            }

            // let mirrorPosition = controls.getObject().position.clone();
            // mirrorPosition.z = -10;
            // mirrorPosition.y = 10;
            // mirrorPosition.x = 10;
            // Why does this not work?
            // Global.data.localFingerprint.setPosition(new THREE.Vector3(10, 10, 10));

            // Move sphere and light to where the camera is
            // sphere.position.copy(controls.getObject().position);
            spotLight.position.copy(controls.getObject().position);
            spotLight.target.position.copy(cameraDirection);
            spotLight.target.position.add(controls.getObject().position);

            // If we are teleported out of bounds, jump back to the origin
            let outOfBounds = 1000;
            if (controls.getObject().position.x > outOfBounds
                || controls.getObject().position.x < -outOfBounds
                || controls.getObject().position.y > outOfBounds
                || controls.getObject().position.y < -outOfBounds
                || controls.getObject().position.z > outOfBounds
                || controls.getObject().position.x < -outOfBounds
            ) {
                controls.getObject().position.copy(new THREE.Vector3(0, 0, 0));
            }
        }
    },
    addAdditionalFingerprint: function(room, relativePos, size) {
        let minDist = 0.2;
        let randomIndex = Math.floor(Math.random() * Global.data.fingerprints.length);
        let position = getRandomSphereCoordinate(size, minDist);
        position.add(relativePos);
        Global.data.fingerprints[randomIndex].addToSpace(scene, spaceRoom.objects, position);
        room.fingerprints.push(Global.data.fingerprints[randomIndex]);
    },
    cleanUp: function (room) {
        for (let fprint of spaceRoom.fingerprints) {
            fprint.motif.stopSpaceLoop();
        }
        spaceRoom.fingerprintsAdded = false;
        spaceRoom.fingerprints = [];
        spaceRoom.loop.stop();
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

let portalRoom = {
    portals: [],
    clickPortalText: null,
    init: function () {
        // SCENE
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x333333);
        scene.fog = new THREE.FogExp2(0xfffefe, 0.03);

        light = new THREE.PointLight(0xfffefe, 1.3, 50);
        light.position.set(0.5, 1, 0.75);
        light.castShadow = true;
        light.shadow.camera.far = 4000;
        // light.shadow.camera.fov = 30;
        scene.add(light);

        // spotLight = new THREE.SpotLight(0xffffff);
        // spotLight.castShadow = true;
        // spotLight.shadow.camera.far = 4000;
        // spotLight.power = 2;
        // spotLight.angle = 0.8;
        // spotLight.penumbra = 0.9;
        // scene.add(spotLight);
        // scene.add(spotLight.target);

        let geometry = new THREE.BoxGeometry(30, 20, 60);
        let material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide });
        let roomCube = new THREE.Mesh(geometry, material);
        roomCube.receiveShadow = true;
        scene.add(roomCube);

        // Place camera at origin
        controls.getObject().position.copy(new THREE.Vector3(0, 0, 0));

        // Create text to click portal
        // let textMaterial = new THREE.MeshStandardMaterial( { color: 0xffffff, side: THREE.FrontSide  } );
        // var textGeometry = new THREE.TextGeometry( 'Click to enter', {
        //     font: font,
        //     size: 1,
        //     height: 2,
        //     curveSegments: 12,
        //     bevelEnabled: false,
        // } );
        // portalRoom.clickPortalText = new THREE.Mesh( textGeometry, textMaterial );
        // portalRoom.clickPortalText.rotateY(Math.PI);
        // scene.add(portalRoom.clickPortalText);

        // Add portals that can be used to teleport to a new room
        portalRoom.portals = []; // Remove any old ones lying around
        let portalGeometry = new THREE.PlaneGeometry(14, 14, 1, 1);
        let portalMaterial = new THREE.MeshBasicMaterial({ color: 0xccccff, side: THREE.FrontSide, map: textures.space });
        let portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portal.castShadow = true;
        portal.rotateY(Math.PI);
        portal.position.set(0, 0, 28);
        portal.userData.roomPointer = spaceRoom;
        scene.add(portal);
        portalRoom.portals.push(portal);

        let portalMaterial2 = new THREE.MeshBasicMaterial({ color: 0xccccff, side: THREE.FrontSide, map: textures.nadia_shape });
        let portal2 = new THREE.Mesh(portalGeometry, portalMaterial2);
        portal2.castShadow = true;
        // portal.rotateY(Math.PI);
        portal2.position.set(0, 0, -28);
        scene.add(portal2);
        portalRoom.portals.push(portal2);
    },
    update: function (cameraDirection) {

        // Move sphere and light to where the camera is
        spotLight.position.copy(controls.getObject().position);
        spotLight.target.position.copy(cameraDirection);
        spotLight.target.position.add(controls.getObject().position);

        // If we are teleported out of bounds, jump back to the origin
        let outOfBounds = 1000;
        if (controls.getObject().position.x > outOfBounds
            || controls.getObject().position.x < -outOfBounds
            || controls.getObject().position.y > outOfBounds
            || controls.getObject().position.y < -outOfBounds
            || controls.getObject().position.z > outOfBounds
            || controls.getObject().position.x < -outOfBounds
        ) {
            controls.getObject().position.copy(new THREE.Vector3(0, 0, 0));
        }

        // As long as we're using a PointerLock the mouse should always be in the center
        raycaster.setFromCamera(mouse, camera);

        //3. compute intersections
        var intersects = raycaster.intersectObjects(portalRoom.portals);

        // This should be last in the update function as it might trigger the cleanup of this room
        for (let i = 0; i < intersects.length; i++) {
            displayOnHud("<span>Click to enter</span>");
            if (mouseClicked) { // && intersects[i].object.userData.roomPointer != undefined) {
                // Travel to this portal
                travelToRoom(intersects[i].object.userData.roomPointer);
            }
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
        if (intersects.length == 0) {
            // hudElement.innerHTML = "";
            hideHud();
        }
    },
    cleanUp: function () {
        portalRoom.portals = [];
        hideHud();
    }
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

function travelToRoom(room) {
    currentRoom.cleanUp(currentRoom)
    currentRoom = room;
    currentRoom.init(currentRoom);
}

function displayOnHud(html) {
    hudElement.innerHTML = html;
    hudElement.style.opacity = 1.0;
}
function hideHud() {
    hudElement.style.opacity = 0.0;
}

function newScene(color, fog) {
    scene = new THREE.Scene();
    scene.background = color;
    scene.fog = fog;
}

function setFogFade(density) {
    fogFade = density;
}

function updateSceneFog() {
    if(fogFade > 0.0001) {
        scene.fog.density = 0.02 + fogFade;
    }
}

export { init_three, 
    animate, 
    scene, 
    controls, 
    spaceRoom, 
    currentRoom, 
    newScene, 
    mouseClicked, 
    getNewSpacePortal, 
    displayOnHud, 
    hideHud, 
    raycaster, 
    travelToRoom, 
    fogFade, 
    setFogFade,
    updateSceneFog,
 }; 