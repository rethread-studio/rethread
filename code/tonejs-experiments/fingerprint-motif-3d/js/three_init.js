// init variables
var objects = [];

var raycaster;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var reduceRadius = false;
var enlargeRadius = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();


// SCENE
var scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
scene.fog = new THREE.FogExp2(0xdddddd, 0.02);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.y = 10;

var light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
light.position.set(0.5, 1, 0.75);
scene.add(light);


var spotLight = new THREE.SpotLight( 0xffffff );
spotLight.castShadow = true;
spotLight.shadow.camera.near = 10;
spotLight.shadow.camera.far = 4000;
spotLight.shadow.camera.fov = 30;
spotLight.power = 30;
spotLight.angle = 0.8;
spotLight.penumbra = 0.9;
scene.add(spotLight);
scene.add( spotLight.target );

var sphereRadius = 30;
var sphereScale = 1.0;
var sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
var sphereMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222233, 
    side: THREE.BackSide,
    wireframe: false, 
    transparent: true, 
    opacity: 0.8, 
    flatShading: true, 
    metalness: 1.0});
var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// CONTROLS

// var controls = new THREE.FirstPersonControls( camera, renderer.domElement );

var controls = new THREE.PointerLockControls(camera, document.body);

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

raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, 10);

// floor

var floorGeometry = new THREE.PlaneBufferGeometry(2000, 2000, 100, 100);
floorGeometry.rotateX(- Math.PI / 2);

// RESIZING

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {
    requestAnimationFrame(animate);
    // controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    // PointerLockControl

    if (controls.isLocked === true) {

        if(enlargeRadius) {
            sphereScale *= 1.05;
            sphereScale = Math.min(sphereScale, 4.0);
        }
        if(reduceRadius) {
            sphereScale *= 0.95;
            sphereScale = Math.max(sphereScale, 0.05);
        }
        if(enlargeRadius || reduceRadius) {
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
        for (fp of fingerprints) {
            let d2 = controls.getObject().position.distanceToSquared(fp.mesh.position);
            fp.updateDistanceSquared(d2 * (1.0/sphereScale));
            if(d2 < minDist) { minDist = d2; }
        }

        // Make the fog really thick when you're close to an object
        if(minDist < 200) {
            scene.fog.density = Math.max(Math.pow(1 - (minDist / 200), 3.0 ), 0.02);
        } else {
            scene.fog.density = 0.02;
        }


        var time = performance.now();
        var delta = (time - prevTime) / 1000;

        // damping
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= velocity.y * 10.0 * delta;

        // for
        // velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass


        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.y = 0;
        direction.normalize(); // this ensures consistent movements in all directions

        // Rotate to the direction we're looking
        let cameraDirection = camera.getWorldDirection(new THREE.Vector3(0, 0, -1));
        // direction = cameraDirection.multiplyScalar(direction.z);
        direction.copy(cameraDirection).multiplyScalar(Number(moveForward) - Number(moveBackward));


        velocity.sub(direction.multiplyScalar(200.0 * delta));


        controls.getObject().position.x -= (velocity.x * delta);
        controls.getObject().position.y -= (velocity.y * delta);
        controls.getObject().position.z -= (velocity.z * delta); // new behavior

        sphere.position.copy(controls.getObject().position);
        spotLight.position.copy(controls.getObject().position);
        spotLight.target.position.copy(cameraDirection);
        spotLight.target.position.add(controls.getObject().position);

        prevTime = time;

    }

    renderer.render(scene, camera);
}
animate();