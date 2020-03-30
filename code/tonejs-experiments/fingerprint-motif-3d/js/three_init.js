// init variables
var objects = [];

var raycaster;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();


// SCENE
var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x555555 );
scene.fog = new THREE.FogExp2( 0xcccccc, 0.002 );

var renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
camera.position.y = 10;

var geometry = new THREE.BoxGeometry();
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );
material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );

var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
light.position.set( 0.5, 1, 0.75 );
scene.add( light );

// CONTROLS

// var controls = new THREE.FirstPersonControls( camera, renderer.domElement );

var controls = new THREE.PointerLockControls( camera, document.body );

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

instructions.addEventListener( 'click', function () {

    controls.lock();

}, false );

controls.addEventListener( 'lock', function () {

    instructions.style.display = 'none';
    blocker.style.display = 'none';

} );

controls.addEventListener( 'unlock', function () {

    blocker.style.display = 'block';
    instructions.style.display = '';

} );

scene.add( controls.getObject() );

camera.position.z = 5;
// controls.update();

var onKeyDown = function ( event ) {

    switch ( event.keyCode ) {

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
            if ( canJump === true ) velocity.y += 350;
            canJump = false;
            break;

    }

};

var onKeyUp = function ( event ) {

    switch ( event.keyCode ) {

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

document.addEventListener( 'keydown', onKeyDown, false );
document.addEventListener( 'keyup', onKeyUp, false );

raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

// floor

var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
floorGeometry.rotateX( - Math.PI / 2 );

// RESIZING

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    requestAnimationFrame( animate );
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    // controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    // PointerLockControl

    if ( controls.isLocked === true ) {

        raycaster.ray.origin.copy( controls.getObject().position );
        var intersections = raycaster.intersectObjects( objects );

        for ( var i = 0; i < intersections.length; i++ ) {
            console.log( intersections[ i ] ); 
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
        for(fp of fingerprints) {
            let d2 = controls.getObject().position.distanceToSquared(fp.mesh.position);
            fp.updateDistanceSquared(d2);
        }


        var time = performance.now();
        var delta = ( time - prevTime ) / 1000;

        // damping
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= velocity.y * 10.0 * delta;

        // for
        // velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass


        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.y = 0;
        direction.normalize(); // this ensures consistent movements in all directions

        // Rotate to the direction we're looking
        let cameraDirection = camera.getWorldDirection(new THREE.Vector3(0, 0, -1));
        direction = cameraDirection.multiplyScalar(direction.z);


        velocity.sub(direction.multiplyScalar(200.0 * delta));


        controls.getObject().position.x -= ( velocity.x * delta );
        controls.getObject().position.y -= ( velocity.y * delta );
        controls.getObject().position.z -= ( velocity.z * delta ); // new behavior

        prevTime = time;

    }


	renderer.render( scene, camera );
}
animate();