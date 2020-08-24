import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";

let allPackets = [];
const statsPerService = new Map();
const positionPerService = new Map();
const textPerService = new Map();

let visMode = 'particles';


// Load font
var loader = new THREE.FontLoader();
var font;
loader.load( 'assets/fonts/' + 'helvetiker_regular.typeface.json', function ( response ) {

  font = response;

} );

// Receive packets
let protocol = "ws";
if (document.location.protocol == "https:") {
  protocol += "s";
}
let host = document.location.hostname;
if (document.location.port) {
  host += ":" + document.location.port;
}
const ws = new WebSocket(protocol + "://" + host);

ws.onmessage = (message) => {
  const json = JSON.parse(message.data);
  if (json.event == "networkActivity") {
    const packet = json.data;
    // console.log(packet);
    allPackets.push({
      location: packet.location,
    })

    for(const service of packet.services) {
      if (!positionPerService.has(service)) {
        let servicePos = random3DPosition(300);
        createText(service, servicePos);
        positionPerService.set(service, servicePos);
        console.log("new serivce, num: " + positionPerService.size);
      }
      addParticle(positionPerService.get(service));
      createRectangle();
    }
  }
};

function random3DPosition(magnitude) {
  return new THREE.Vector3(
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
  )
}

function addParticle(vec3) {
  let i = particleIndex;
  particlePositions[i * 3] = vec3.x;
  particlePositions[i * 3 + 1] = vec3.y;
  particlePositions[i * 3 + 2] = vec3.z;
  particleIndex++;
  if(particleIndex >= maxParticleCount) {
    particleIndex = 0;
  }
  particleCount++;
  if(particleCount > maxParticleCount) {
    particleCount = maxParticleCount;
  }
  particles.setDrawRange(0, particleCount);
}

function createText(text, servicePos) {
  let geometry = new THREE.TextGeometry( text, {
		font: font,
		size: 80,
		height: 5,
		curveSegments: 12,
		bevelEnabled: false,
  } );
  let material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.6 } );
  let textMesh = new THREE.Mesh( geometry, material );
  textMesh.position.copy(servicePos);
  particles_text_meshes.push(textMesh);
  particles_group.add(textMesh);
}

var particles_group;
let particles_rotation = new THREE.Euler();
let particles_rotation_vel = new THREE.Vector3(0, 0, 0);
let particles_rotation_counter = 0;
let particles_text_meshes = [];
var particlesData = [];
var particles;
var pointCloud;
var particlePositions;
var linesMesh;

var container, stats;

var camera, scene, renderer;
var positions, colors;

let randomParticle = 0; // Used for drawing lines, this is the starting particle

var maxParticleCount = 50000;
var particleCount = 0; // The number of active particles
var particleIndex = 0; // The index of the next particle (can loop around to recycle old particles)
var r = 800;
var rHalf = r / 2;


var rectangles_group;
var rectangleMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
var rectangleGeometry = new THREE.PlaneBufferGeometry( 20, 80, 4 );
var rectangleMeshes = [];
var rectangleLeftEdge = 0; 

function createRectangle() {
  let plane = new THREE.Mesh( rectangleGeometry, rectangleMaterial );
  // Convert from screen coordinates to camera coordinates
  let left = window.innerWidth/2;
  let top = (Math.random() * 2 - 1) * window.innerHeight;
  let depth = 0; // from -1 to 1, depends how far into the scene you want the object, -1 being very close, 1 being the furthest away the camera can see
  plane.position.set( -1 + 2 * left, 1 - 2 * top, depth ).unproject( camera );
  plane.position.z = 0;
  rectangleLeftEdge = -plane.position.x;
  rectangles_group.add(plane);
  rectangleMeshes.push(plane);
}

var effectController = {
  showDots: true,
  showLines: true,
  minDistance: 150,
  limitConnections: false,
  numConnections: 3,
  linesStayingProbability: 0.6,
  particleCount: 0,
};

init();
animate();

function initGUI() {
  var gui = new GUI();

  gui.add(effectController, "showDots").onChange(function (value) {
    pointCloud.visible = value;
  });
  gui.add(effectController, "showLines").onChange(function (value) {
    linesMesh.visible = value;
  });
  gui.add(effectController, "minDistance", 10, 300);
  gui.add(effectController, "limitConnections");
  gui.add(effectController, "numConnections", 0, 20, 1);
  gui.add(effectController, "linesStayingProbability", 0.1, 0.99, 0.001);
  gui
    .add(effectController, "particleCount", 0, maxParticleCount, 1)
    .onChange(function (value) {
      particleCount = parseInt(value);
      particles.setDrawRange(0, particleCount);
    });
}

function init() {
  initGUI();

  container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.z = 1750;

  // var controls = new OrbitControls(camera, container);
  // controls.minDistance = 1000;
  // controls.maxDistance = 3000;

  scene = new THREE.Scene();

  particles_group = new THREE.Group();
  scene.add(particles_group);

  rectangles_group = new THREE.Group();
  scene.add(rectangles_group);

  // var helper = new THREE.BoxHelper(
  //   new THREE.Mesh(new THREE.BoxBufferGeometry(r, r, r))
  // );
  // helper.material.color.setHex(0x101010);
  // helper.material.blending = THREE.AdditiveBlending;
  // helper.material.transparent = true;
  // group.add(helper);

  // var segments = maxParticleCount * maxParticleCount;

  // positions = new Float32Array(segments * 3);
  // colors = new Float32Array(segments * 3);

  var pMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    blending: THREE.AdditiveBlending,
    opacity: 0.7,
    transparent: true,
    sizeAttenuation: false,
  });

  particles = new THREE.BufferGeometry();
  particlePositions = new Float32Array(maxParticleCount * 3);

  for (var i = 0; i < maxParticleCount; i++) {
    // var x = Math.random() * r - r / 2;
    // var y = Math.random() * r - r / 2;
    // var z = Math.random() * r - r / 2;

    // particlePositions[i * 3] = x;
    // particlePositions[i * 3 + 1] = y;
    // particlePositions[i * 3 + 2] = z;

    particlePositions[i * 3] = 0;
    particlePositions[i * 3 + 1] = 0;
    particlePositions[i * 3 + 2] = 0;

    // add it to the geometry
    particlesData.push({
      velocity: new THREE.Vector3(
        -.2 + Math.random() * .4,
        -.2 + Math.random() * .4,
        -.2 + Math.random() * .4
      ),
      numConnections: 0,
    });
  }

  particles.setDrawRange(0, particleCount);
  particles.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3).setUsage(
      THREE.DynamicDrawUsage
    )
  );

  // create the particle system
  pointCloud = new THREE.Points(particles, pMaterial);
  particles_group.add(pointCloud);


  // LINE SEGMENTS

  var segments = maxParticleCount;

  positions = new Float32Array(segments * 3);
  colors = new Float32Array(segments * 3);

  var geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  );
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage)
  );

  geometry.computeBoundingSphere();

  geometry.setDrawRange(0, 0);

  var material = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });

  linesMesh = new THREE.LineSegments(geometry, material);
  particles_group.add(linesMesh);


  //
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild(renderer.domElement);

  //
  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if(visMode === 'particles') {

    if(Math.random() > 0.99) {
      particles_rotation_counter = 8;
      const scale = 0.1;
      // TODO: Do a random direction with radius instead
      particles_rotation_vel.set(Math.random()* scale, Math.random() * scale, Math.random() * scale);
    }

    // Update rotation
    if(particles_rotation_counter > 0) {
      particles_rotation.x += particles_rotation_vel.x;
      particles_rotation.y += particles_rotation_vel.y;
      particles_rotation.z += particles_rotation_vel.z;
      particles_rotation_counter -= 1;
    }
    

    // Update particles
    var vertexpos = 0;
    var colorpos = 0;
    var numConnected = 0;

    for (var i = 0; i < particleCount; i++) particlesData[i].numConnections = 0;

    for (var i = 0; i < particleCount; i++) {
      // get the particle
      var particleData = particlesData[i];

      particlePositions[i * 3] += particleData.velocity.x;
      particlePositions[i * 3 + 1] += particleData.velocity.y;
      particlePositions[i * 3 + 2] += particleData.velocity.z;
    }

    if(Math.random() > effectController.linesStayingProbability) {
      randomParticle = Math.floor(Math.random() * particleCount);
    }
    
    let alpha = 0.2;

    let particleIndex = randomParticle;

    for(let i = 0; i < effectController.numConnections; i++) {
      let particle1 = particleIndex;
      let particle2 = (particleIndex+1) % particleCount;
      positions[vertexpos++] = particlePositions[particle1 * 3];
      positions[vertexpos++] = particlePositions[particle1 * 3 + 1];
      positions[vertexpos++] = particlePositions[particle1 * 3 + 2];
      positions[vertexpos++] = particlePositions[particle2 * 3];
      positions[vertexpos++] = particlePositions[particle2 * 3 + 1];
      positions[vertexpos++] = particlePositions[particle2 * 3 + 2];
      colors[colorpos++] = alpha;
      colors[colorpos++] = alpha;
      colors[colorpos++] = alpha;
      colors[colorpos++] = alpha;
      colors[colorpos++] = alpha;
      colors[colorpos++] = alpha;
      particleIndex = particle2;
    }

    linesMesh.geometry.setDrawRange(0, effectController.numConnections * 2);
    linesMesh.geometry.attributes.position.needsUpdate = true;
    linesMesh.geometry.attributes.color.needsUpdate = true;

    pointCloud.geometry.attributes.position.needsUpdate = true;

    // Update rectangles
    for(let rect of rectangleMeshes) {
      rect.position.x -= 10;
      if(rect.position.x < rectangleLeftEdge) {
        // Outside of view, remove it
        rectangles_group.remove(rect);
      }
      // rect.position.y -= 1;
      // rect.position.z -= 10;
    }

    // Remove rectangles from rectangleMeshes
    rectangleMeshes = rectangleMeshes.filter(rect => rect.position.x > rectangleLeftEdge);

    requestAnimationFrame(animate);

    stats.update();
    render();
  }
}

function render() {
  var time = Date.now() * 0.001;

  // TODO: Cancel out the rotation effect on the text
  let textRotation = particles_rotation.clone();
  textRotation.x *= -1;
  textRotation.y *= -1;
  textRotation.z *= -1;
  for(let tm of particles_text_meshes) {
    tm.rotation.copy(textRotation);
  }
  particles_group.rotation.copy(particles_rotation);
  renderer.render(scene, camera);
}
