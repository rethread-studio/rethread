import * as THREE from 'three';
import * as Tone from 'tone';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

import * as global from './globals.js';
import * as fingerprint from './fingerprint.js';

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

var mouse = new THREE.Vector2(0, 0);
var mouseClicked = false;

var allTexturesLoaded = false;
var textures = {};

// A room is an object with an init and an update function
var rooms = {};
var currentRoom = {
    init: function() {},
    update: function() {},
};

// init variables
function init_three() {
    // LOAD TEXTURES
    // instantiate a loader
    var loader = new THREE.TextureLoader();

    // load a resource
    loader.load(
        // resource URL
        'data/textures/space.jpg',
        // onLoad callback
        function ( texture ) {
            textures.space = texture;
            allTexturesLoaded = true;
        },
        // onProgress callback currently not supported
        undefined,
        // onError callback
        function ( err ) {
            console.error( 'An error happened while loading a texture: ' + err );
        }
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);


    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 10;

    currentRoom = spaceRoom;
    currentRoom.init();

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
        Tone.Transport.start();

    });

    controls.addEventListener('unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';
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

            case 37: // left
            case 65: // a
                moveLeft = true;
                break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                break;

            case 39: // right
            case 68: // d
                moveRight = true;
                break;

            case 32: // space
                if (canJump === true) velocity.y += 350;
                canJump = false;
                break;

            case 81: // q
                enlargeRadius = true;
                break;

            case 69: // e
                reduceRadius = true;
                break;

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

let then = 0;
function animate(now) {
    requestAnimationFrame(animate);
    // controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

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

        currentRoom.update(cameraDirection);

        prevTime = time;
    }

    renderer.render(scene, camera);
    // composer.render(deltaTime);
}

// **************************** ROOMS **************************

let spaceRoom = {
    // Since the fingerprint data may not have loaded when the scene is initiated
    // we will initiate them in the update function and keep track of it here
    fingerprintsAdded: false,

    init: function() {
        // SCENE
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdddddd);
        scene.fog = new THREE.FogExp2(0xdddddd, 0.02);

        

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
        sphereScale = 1.0;
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
        scene.add(sphere);
    },
    update: function(cameraDirection) {
        // Initiate fingerprints if the data has been loaded from the server
        if(spaceRoom.fingerprintsAdded == false && global.data.loadedData == true) {
            // Add the fingerprints to the room
            for(let i = 0; i < 40; i++) {
                fingerprint.renderFingerPrint();
            }
            spaceRoom.fingerprintsAdded = true;
        }
        
        // React to keys being pressed to change the size of the influence radius
        if (enlargeRadius) {
            sphereScale *= 1.03;
            sphereScale = Math.min(sphereScale, 4.0);
        }
        if (reduceRadius) {
            sphereScale *= 0.98;
            sphereScale = Math.max(sphereScale, 0.05);
        }
        if (enlargeRadius || reduceRadius) {
            sphere.scale.set(sphereScale, sphereScale, sphereScale);
        }

        raycaster.ray.origin.copy(controls.getObject().position);
        var intersections = raycaster.intersectObjects(objects);

        for (var i = 0; i < intersections.length; i++) {
            console.log(intersections[i]);
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

        // Calculate distance to objects
        let minDist = 100000.0;
        for (let fp of global.data.fingerprints) {
            let d2 = controls.getObject().position.distanceToSquared(fp.mesh.position);
            fp.updateDistanceSquared(d2 * (1.0 / sphereScale));
            if (d2 < minDist) { minDist = d2; }
        }

        // Make the fog really thick when you're close to an object
        if (minDist < 150) {
            scene.fog.density = Math.max(Math.pow(1 - (minDist / 150), 3.0), 0.02);
        } else {
            scene.fog.density = 0.02;
        }

        if (minDist < 1000) {
            global.sound.globalSynthLPF.frequency.value = 2000 - (minDist * 1.4);
        }

        // Move sphere and light to where the camera is
        sphere.position.copy(controls.getObject().position);
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
    },
    cleanUp: function() {
        for(let fprint of global.data.fingerprints) {
            fprint.clearFromTransport();
        }
        global.data.fingerprints = [];
        spaceRoom.fingerprintsAdded = false;
    }
}

let portalRoom = {
    portals: [],
    init: function() {
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
        let material = new THREE.MeshStandardMaterial( { color: 0xffffff, side: THREE.BackSide  } );
        let roomCube = new THREE.Mesh( geometry, material );
        roomCube.receiveShadow = true;
        scene.add( roomCube );

        // Place camera at origin
        controls.getObject().position.copy(new THREE.Vector3(0, 0, 0));

        // Add portals that can be used to teleport to a new room
        portalRoom.portals = []; // Remove any old ones lying around
        let portalGeometry = new THREE.PlaneGeometry( 14, 14, 1, 1 );
        let portalMaterial = new THREE.MeshBasicMaterial( {color: 0xccccff, side: THREE.DoubleSide, map: textures.space} );
        let portal = new THREE.Mesh( portalGeometry, portalMaterial );
        portal.castShadow = true;
        portal.position.set(0, 0, 28);
        portal.userData.roomPointer = spaceRoom;
        scene.add(portal);
        portalRoom.portals.push(portal);
    },
    update: function(cameraDirection) {
        
        

        // Move sphere and light to where the camera is
        sphere.position.copy(controls.getObject().position);
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
        raycaster.setFromCamera( mouse, camera );    

        //3. compute intersections
        var intersects = raycaster.intersectObjects( portalRoom.portals );

        // This should be last in the update function as it might trigger the cleanup of this room
        for (let i = 0; i < intersects.length; i++ ) {
            if(mouseClicked) { // && intersects[i].object.userData.roomPointer != undefined) {
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
    },
    cleanUp: function() {
        for(let fprint of global.data.fingerprints) {
            fprint.clearFromTransport();
        }
        portalRoom.portals = [];
    }
}

function teleportToPortal() {
    currentRoom.cleanUp();
    currentRoom = portalRoom;
    currentRoom.init();
}

function travelToRoom(room) {
    currentRoom.cleanUp();
    currentRoom = room;
    currentRoom.init();
}

export { init_three, animate, scene, objects, spaceRoom, currentRoom }; 