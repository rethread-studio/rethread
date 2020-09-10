import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
// import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js';


let allPackets = [];
const statsPerService = new Map();
const positionPerService = new Map();
const textPerService = new Map();
const indexPerService = new Map(); // Give the service a number used as an index to a lane
const colorPerService = new Map();
const lastRegisteredPerService = new Map();
let activeService = '';


function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

function reset() {
  rectangleObjects = [];
  scene.remove(rectangles_group);
  rectangles_group = new THREE.Group();
  scene.add(rectangles_group);
  particleIndex = 0;
  boxIndex = 0;
  camera.position.set(0, 0, 1300);
}

function random3DPosition(magnitude) {
  return new THREE.Vector3(
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
  )
}

function activateParticle(pIndex) {
  let i = pIndex;
  // particleAlphas[i] = 0.8;
  if(particlesData[i].lifetime == 0) {
    particlesData[i].phase = 0;
  }
  particlesData[i].lifetime = 500;
}

function activateBox(bIndex) {
  let i = bIndex;
  if(boxData[i].lifetime == 0) {
    boxData[i].phase = 0;
  }
  boxData[i].lifetime = 500;
}


var container, stats;

var camera, scene, renderer;
var composer;
var bloomPass, renderPass, pass1;
var positions, colors;

var cameraVel = new THREE.Vector3(0, 0, 0);
var cameraAcc = new THREE.Vector3(0, 0, 0);

let activeParticleColor = new THREE.Color(0xff0000);
var particles_group;
var particlesData = [];
var particles;
var pointCloud;
var particlePositions;
var particleUniforms, particleAlphas, particleColors, particleSizes;

var boxRowX = 90;
var boxRowY = 51;
var numBoxes = boxRowX * boxRowY;
var boxes = [];
var box_group;
let shuffledBoxIndices = [];
for(let i = 0; i < numBoxes; i++) {
  shuffledBoxIndices.push(i);
}
shuffledBoxIndices = shuffle(shuffledBoxIndices);
var boxData = [];

let particlesPerLine = 100;
let particlesPerLineX = 177;
var maxParticleCount = particlesPerLine * particlesPerLineX;
var particleCount = maxParticleCount; // The number of active particles
let shuffledParticleIndices = [];
for(let i = 0; i < maxParticleCount; i++) {
  shuffledParticleIndices.push(i);
}
shuffledParticleIndices = shuffle(shuffledParticleIndices);
var particleIndex = 0; // The index of the next particle (can loop around to recycle old particles)
var boxIndex = 0;
var r = 800;
var rHalf = r / 2;

// Test to make sure the coordinate projection to the camera is working
// window.addEventListener('mousemove', e => {
//   // Update the mouse variable
//   event.preventDefault();
//   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//   mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

//   var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
//   vector.unproject( camera );
//   var dir = vector.sub( camera.position ).normalize();
//   var distance = - camera.position.z / dir.z;
//   var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
//   mouseMesh.position.copy(pos);
// });

var effectController = {
  bloomPassThreshold: 0.0,
  bloomPassStrength: 2.1, //1.26
  bloomPassRadius: 1.4, // 0.8
  doRotation: false,
};

init();
animate();

function initGUI() {
  var gui = new GUI();


  gui.add(effectController, "bloomPassThreshold", 0.0, 2.0, 0.001);
  gui.add(effectController, "bloomPassStrength", 0.0, 20.0, 0.001);
  gui.add(effectController, "bloomPassRadius", 0.0, 20.0, 0.001);
}

function init() {
  // initGUI();

  container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    6000
  );
  camera.position.z = 1300;

  // var controls = new OrbitControls(camera, container);
  // controls.minDistance = 1000;
  // controls.maxDistance = 3000;

  scene = new THREE.Scene();

  particles_group = new THREE.Group();
  scene.add(particles_group);

  // var pMaterial = new THREE.PointsMaterial({
  //   color: 0xffffff,
  //   size: 10,
  //   blending: THREE.AdditiveBlending,
  //   opacity: 0.7,
  //   transparent: true,
  //   sizeAttenuation: true,
  // });

  particleUniforms = {

    // alpha: {value: 1.0}
    pointTexture: { value: new THREE.TextureLoader().load( "assets/textures/spark1.png" ) }

  };

  var shaderMaterial = new THREE.ShaderMaterial( {

    uniforms: particleUniforms,
    vertexShader: document.getElementById( 'vertexshader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    vertexColors: true

  } );


  particles = new THREE.BufferGeometry();
  particlePositions = new Float32Array(maxParticleCount * 3);
  particleColors = new Float32Array(maxParticleCount * 3);
  particleAlphas = new Float32Array(maxParticleCount);
  particleSizes = new Float32Array(maxParticleCount);
  
  

  let col = new THREE.Color();
  col.setHSL(1.0, 0.5, 0.5);

  
  let distanceBetweenParticles = 10;
  let startX = (particlesPerLineX * distanceBetweenParticles) / -2;
  let startY = (particlesPerLine * distanceBetweenParticles) / -2;

  for (var i = 0; i < maxParticleCount; i++) {

    let x = (i % particlesPerLineX);
    let y = Math.floor(i/particlesPerLineX);
    particlePositions[i * 3] = x * distanceBetweenParticles + startX;
    particlePositions[i * 3 + 1] = y * distanceBetweenParticles + startY;
    particlePositions[i * 3 + 2] = 0;

    let hue = 0.0;
    if(Math.random() > 0.8) {
      hue = Math.random();
    }
    col.setHSL(hue, 1.0, Math.random() * 0.5 + 0.5);
    particleColors[i * 3] = col.r;
    particleColors[i * 3 + 1] = col.g;
    particleColors[i * 3 + 2] = col.b;

    particleAlphas[i] = 0.0;


    particleSizes[i] = Math.random() * 20.0 + 20.0;

    // add it to the geometry
    particlesData.push({
      numConnections: 0,
      lifetime: 0,
      maxLifetime: 500,
      phase: 0,
      phaseStep: Math.random() + 1.0,
    });
  }

  particles.setDrawRange(0, particleCount);
  particles.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3).setUsage(
      THREE.DynamicDrawUsage
    )
  );
  particles.setAttribute(
    "color",
    new THREE.BufferAttribute(particleColors, 3).setUsage(
      THREE.DynamicDrawUsage
    )
  );
  particles.setAttribute(
    "alpha",
    new THREE.BufferAttribute(particleAlphas, 1).setUsage(
      THREE.DynamicDrawUsage
    )
  );
  particles.setAttribute( 'size', new THREE.BufferAttribute( particleSizes, 1 ).setUsage( THREE.DynamicDrawUsage ) );

  // create the particle system
  pointCloud = new THREE.Points(particles, shaderMaterial);
  particles_group.add(pointCloud);


  box_group = new THREE.Group();
  scene.add(box_group);

  let distanceBetweenBoxes = 18;
  startX = (boxRowX * distanceBetweenBoxes) / -2;
  startY = (boxRowY * distanceBetweenBoxes) / -2;

  let size = 6.0;
  var geometry = new THREE.BoxGeometry(size, size, size);
  // var geometry = new THREE.CircleGeometry( size, 16 );
  for(let iy = 0; iy < boxRowY; iy++) {
    for(let ix = 0; ix < boxRowX; ix++) {
      let hue = 0.0;
      if(Math.random() > 0.8) {
        hue = Math.random();
      }
      col.setHSL(hue, 1.0, Math.random() * 0.5 + 0.5);
      let material = new THREE.MeshBasicMaterial( { color: 0x00ff00, transparent: false, opacity: 0.9 } );
      material.color.copy(col);
      let cube = new THREE.Mesh( geometry, material );
      cube.position.x = ix * distanceBetweenBoxes + startX;
      cube.position.y = iy * distanceBetweenBoxes + startY;
      cube.position.z = 100;
      boxes.push(cube);
      box_group.add(cube);
      boxData.push({
        numConnections: 0,
        lifetime: 0,
        maxLifetime: 500,
        phase: 0,
        phaseStep: Math.random() + 1.0,
      });
    }
  }


  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild(renderer.domElement);

  // COMPOSER
  composer = new EffectComposer( renderer );

  // RENDER PASSES
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // pass1 = new GlitchPass();
  // composer.addPass(pass1);

  // bloomPass = new UnrealBloomPass();
  // bloomPass.strength = 1.5;
  // bloomPass.threshold = 0.0;
  // bloomPass.radius = 1.1;
  // composer.addPass(bloomPass);
  // bloomPass.renderToScreen = true;

  //
  // stats = new Stats();
  // container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

var lastUpdate = 0;

function animate() {
  let now = Date.now() * 0.001;
  let dt = now - lastUpdate;
  if(!dt || lastUpdate == 0) {
    dt = 0;
  }

  // Update particles
  for (var i = 0; i < particleCount; i++) {
    // get the particle
    var particleData = particlesData[i];

    if(particleData.lifetime <= 0) {
      particleAlphas[i] = 0;
    } else {
      particleData.lifetime--;
      particleAlphas[i] = Math.sin(particleData.phase) - Math.pow(1.0-(particleData.lifetime / particleData.maxLifetime), 2.0);
      particleData.phase += particleData.phaseStep*dt;
    }
  }

  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.alpha.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;

  // Update boxes
  for (var i = 0; i < numBoxes; i++) {
    // get the particle
    var bd = boxData[i];

    if(bd.lifetime <= 0) {
      boxes[i].material.opacity = 0;
    } else {
      bd.lifetime--;
      boxes[i].material.opacity = Math.sin(bd.phase) - Math.pow(1.0-(bd.lifetime / bd.maxLifetime), 2.0);
      bd.phase += bd.phaseStep*dt;
    }
  }

  // // Update effects parameters
  // bloomPass.threshold = effectController.bloomPassThreshold;
  // bloomPass.strength = effectController.bloomPassStrength;
  // bloomPass.radius = effectController.bloomPassRadius;

  // Update camera
  cameraVel.add(cameraAcc);
  cameraVel.clampScalar(-0.1, 0.1);
  let limit = 50;
  if(camera.position.x > limit) {
    cameraAcc.x = Math.abs(cameraAcc.x) * -1;
  }
  if(camera.position.x < -limit) {
    cameraAcc.x = Math.abs(cameraAcc.x);
  }
  if(camera.position.y > limit) {
    cameraAcc.y = Math.abs(cameraAcc.y) * -1;
  }
  if(camera.position.y < -limit) {
    cameraAcc.y = Math.abs(cameraAcc.y);
  }
  if(camera.position.z < 1300) {
    cameraAcc.z = Math.abs(cameraAcc.z);
  }
  if(camera.position.z > 1500) {
    cameraAcc.z = Math.abs(cameraAcc.z) * -1;
  }
  camera.position.add(cameraVel);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  if(Math.random() > 0.96) {
    cameraAcc.set(Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01, Math.random() * 0.005 - 0.0025);
  }

  requestAnimationFrame(animate);

  // stats.update();
  render();

  lastUpdate = now;
}

function render() {
  var time = Date.now() * 0.001;

  // renderer.render(scene, camera);
  composer.render();
}


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
  if (json.event == "reset") {
    reset();
  } else if (json.event == "networkActivity") {
    const packet = json.data;
    if(packet.services.length === 0) {
      packet.services.push(packet.remote_host)
    }

    for(const service of packet.services) {
      // let identifier = service + packet.location;
      // if (!indexPerService.has(identifier)) {
      //   indexPerService.set(identifier, shuffledBoxIndices[particleIndex]);
      //   particleIndex += 1;
      //   if(particleIndex >= numBoxes) {
      //     particleIndex = 0;
      //   }
      // }
      // let isOut = packet.out;
      // activateParticle(indexPerService.get(identifier))
      if(packet.out) {
        activateParticle(shuffledParticleIndices[particleIndex % shuffledParticleIndices.length]);
        particleIndex += 1;
      } else {
        activateBox(shuffledBoxIndices[particleIndex % shuffledBoxIndices.length]);
        boxIndex += 1;
      }
    }
  }
};