import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js';

let allPackets = [];
const statsPerService = new Map();
const positionPerService = new Map();
const textPerService = new Map();
const indexPerService = new Map(); // Give the service a number used as an index to a lane
let activeService = '';

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
        let servicePos = random3DPosition(500);
        createText(service, servicePos);
        positionPerService.set(service, servicePos);
        console.log("new serivce, num: " + positionPerService.size);
        indexPerService.set(service, indexPerService.size);
      }
      addParticle(positionPerService.get(service));
      createRectangle(service, indexPerService.get(service));
      activeService = service;
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
  particlesData[i].lifetime = 500;
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

let textMaterialDefault = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.1 } );
let textMaterialActive = new THREE.MeshBasicMaterial( { color: 0xff0000, transparent: true, opacity: 0.5 } );

function createText(service, servicePos) {
  let geometry = new THREE.TextGeometry( service, {
		font: font,
		size: 80,
		height: 5,
		curveSegments: 12,
		bevelEnabled: false,
  } );
  
  let textMesh = new THREE.Mesh( geometry, textMaterialDefault );
  textMesh.position.copy(servicePos);
  particlesTextObjects.push({
    mesh: textMesh,
    service: service,
  });
  particles_group.add(textMesh);
}

var particles_group;
let particles_rotation = new THREE.Euler();
let particles_rotation_vel = new THREE.Vector3(0, 0, 0);
let particles_rotation_counter = 0;
let particlesTextObjects = [];
var particlesData = [];
var particles;
var pointCloud;
var particlePositions;
var linesMesh;

var container, stats;

var camera, scene, renderer;
var composer;
var positions, colors;

let randomParticle = 0; // Used for drawing lines, this is the starting particle

var maxParticleCount = 50000;
var particleCount = 0; // The number of active particles
var particleIndex = 0; // The index of the next particle (can loop around to recycle old particles)
var r = 800;
var rHalf = r / 2;


var rectangles_group;
var rectangleMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.FrontSide} );
var rectangleMaterialActive = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.FrontSide} );
// var rectangleGeometry = new THREE.PlaneBufferGeometry( 20, 80, 4 );
var rectangleGeometry = new THREE.BoxGeometry( 20, 80, 40 );
var rectangleObjects = [];
var rectangleLeftEdge = 0;


var mouseMesh;
var mouse = new THREE.Vector2();

window.addEventListener('mousemove', e => {
  // Update the mouse variable
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
  vector.unproject( camera );
  var dir = vector.sub( camera.position ).normalize();
  var distance = - camera.position.z / dir.z;
  var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
  mouseMesh.position.copy(pos);
});


function createRectangle(service, index) {
  let plane = new THREE.Mesh( rectangleGeometry, rectangleMaterial );
  let numLanes = indexPerService.size + 1 ;
  // Convert from screen coordinates to camera coordinates
  let left = 1;
  let top = (2/numLanes) * (index + 1) - 1;
  let depth = 0.5; // from -1 to 1, depends how far into the scene you want the object, -1 being very close, 1 being the furthest away the camera can see
  var vector = new THREE.Vector3(left, top, depth);
  vector.unproject( camera );
  var dir = vector.sub( camera.position ).normalize();
  var distance = - camera.position.z / dir.z;
  var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
  console.log(pos);
  // plane.position.set( -1 + 2 * left, 1 - 2 * top, depth ).unproject( camera );
  // plane.position.z = 0;
  plane.position.copy(pos);
  rectangleLeftEdge = -plane.position.x;
  rectangles_group.add(plane);
  rectangleObjects.push({
    mesh: plane,
    vel: new THREE.Vector3(Math.random() * -10 - 5, 0, Math.random()),
    service: service,
  });
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
    size: 10,
    blending: THREE.AdditiveBlending,
    opacity: 0.7,
    transparent: true,
    sizeAttenuation: true,
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
        -.4 + Math.random() * .8,
        -.4 + Math.random() * .8,
        -.4 + Math.random() * .8
      ),
      numConnections: 0,
      lifetime: 0,
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

  var mousegeometry = new THREE.BoxGeometry(20, 20, 20);
  mouseMesh = new THREE.Mesh(mousegeometry, rectangleMaterial);
  scene.add(mouseMesh);


  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild(renderer.domElement);

  // COMPOSER
  composer = new EffectComposer( renderer );

  // RENDER PASSES
  var renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  var pass1 = new GlitchPass();
  composer.addPass(pass1);

  var bloomPass = new UnrealBloomPass();
  composer.addPass(bloomPass);

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

    // for (var i = 0; i < particleCount; i++) particlesData[i].numConnections = 0;

    for (var i = 0; i < particleCount; i++) {
      // get the particle
      var particleData = particlesData[i];

      particlePositions[i * 3] += particleData.velocity.x;
      particlePositions[i * 3 + 1] += particleData.velocity.y;
      particlePositions[i * 3 + 2] += particleData.velocity.z;

      if(particleData.lifetime <= 0) {
        particlePositions[i * 3 + 2] = 2000000; // Hide particle if it's dead
      } else {
        particleData.lifetime--;
      }
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
    for(let rect of rectangleObjects) {
      rect.mesh.position.x += rect.vel.x;
      rect.mesh.position.z += rect.vel.z;
      if(activeService == rect.service) {
        rect.mesh.material = rectangleMaterialActive;
      } else {
        rect.mesh.material = rectangleMaterial;
      }
      if(rect.mesh.position.x < rectangleLeftEdge) {
        // Outside of view, remove it
        rectangles_group.remove(rect.mesh);
      }
      // rect.position.y -= 1;
      // rect.position.z -= 10;
    }

    // Remove rectangles from rectangleObjects
    rectangleObjects = rectangleObjects.filter(rect => rect.mesh.position.x > rectangleLeftEdge);

    // Updateing texts
    for(let text of particlesTextObjects) {
      if(text.service == activeService) {
        text.mesh.material = textMaterialActive;
      } else {
        text.mesh.material = textMaterialDefault;
      }
    }

    requestAnimationFrame(animate);

    stats.update();
    render();
  }
}

function render() {
  var time = Date.now() * 0.001;

  // TODO: Cancel out the rotation effect on the text
  let textRotation = particles_rotation.clone();
  // textRotation.x *= -1;
  // textRotation.y *= -1;
  // textRotation.z *= -1;
  for(let tm of particlesTextObjects) {
    tm.mesh.rotation.copy(textRotation);
  }
  particles_group.rotation.copy(particles_rotation);
  // renderer.render(scene, camera);
  composer.render();
}
