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
const lastRegisteredPerService = new Map();
let activeService = '';



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
    if(packet.services.length === 0) {
      packet.services.push(packet.remote_host)
    }

    for(const service of packet.services) {
      if (!indexPerService.has(service)) {
        indexPerService.set(service, indexPerService.size);
      }
      let isOut = packet.out;
      createRectangle(service, indexPerService.get(service), packet.len, isOut);
      let time = Date.now() * 0.001;
      lastRegisteredPerService.set(service, time);
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


var container, stats;

var camera, scene, renderer;
var composer;
var bloomPass, renderPass, pass1;
var positions, colors;

let randomParticle = 0; // Used for drawing lines, this is the starting particle

var r = 800;
var rHalf = r / 2;


var rectangles_group;
var rectangleMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.FrontSide} );
var rectangleMaterialActive = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.FrontSide} );
// var rectangleGeometry = new THREE.PlaneBufferGeometry( 20, 80, 4 );
var rectangleGeometry = new THREE.BoxGeometry( 4, 8, 40 );
var rectangleObjects = [];
var rectangleLeftEdge = 0;
var rectangleRightEdge = 0;

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


function createRectangle(service, index, packetSize, isOut) {
  let plane = new THREE.Mesh( rectangleGeometry, rectangleMaterial );
  let numLanes = indexPerService.size + 1 ;
  // Convert from screen coordinates to camera coordinates
  let left = 1;
  let top = (2/numLanes) * (index + 1) - 1;
  if(isOut) {
    left = -1;
  }
  let depth = 0.5; // from -1 to 1, depends how far into the scene you want the object, -1 being very close, 1 being the furthest away the camera can see
  var vector = new THREE.Vector3(left, top, depth);
  vector.unproject( camera );
  var dir = vector.sub( camera.position ).normalize();
  var distance = - camera.position.z / dir.z;
  var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
  // plane.position.set( -1 + 2 * left, 1 - 2 * top, depth ).unproject( camera );
  // plane.position.z = 0;
  plane.position.copy(pos);
  
  rectangles_group.add(plane);
  let xVel = Math.random() * -240 + (-240000/packetSize) - 180;
  if(isOut) {
    xVel *= -1;
    rectangleLeftEdge = plane.position.x * 2;
    rectangleRightEdge = -plane.position.x * 2;
  } else {
    rectangleLeftEdge = -plane.position.x * 2;
    rectangleRightEdge = plane.position.x * 2;
  }
  rectangleObjects.push({
    mesh: plane,
    vel: new THREE.Vector3(xVel, 0, (Math.random() * 12 - 24) * packetSize),
    service: service,
  });
}

var effectController = {
  bloomPassThreshold: 0.0,
  bloomPassStrength: 0.38,
  bloomPassRadius: 0.15,
  doRotation: false,
};

init();
animate();

function initGUI() {
  var gui = new GUI();


  gui.add(effectController, "bloomPassThreshold", 0.0, 2.0, 0.001);
  gui.add(effectController, "bloomPassStrength", 0.0, 2.0, 0.001);
  gui.add(effectController, "bloomPassRadius", 0.0, 2.0, 0.001);
}

function init() {
  // initGUI();

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

  rectangles_group = new THREE.Group();
  scene.add(rectangles_group);


  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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

  bloomPass = new UnrealBloomPass();
  // bloomPass.strength = 1.5;
  // bloomPass.threshold = 1.0;
  // bloomPass.radius = 1.1;
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

var lastUpdate = 0;

function animate() {
  let now = Date.now() * 0.001;
  let dt = now - lastUpdate;
 
  // Update rectangles
  for(let rect of rectangleObjects) {
    rect.mesh.position.x += rect.vel.x * dt;
    rect.mesh.position.z += rect.vel.z * dt;
    if(activeService == rect.service) {
      rect.mesh.material = rectangleMaterialActive;
    } else {
      rect.mesh.material = rectangleMaterial;
    }
    if(rect.mesh.position.x < rectangleLeftEdge || rect.mesh.position.x > rectangleRightEdge) {
      // Outside of view, remove it
      rectangles_group.remove(rect.mesh);
    }
    // rect.position.y -= 1;
    // rect.position.z -= 10;
  }

  // Remove rectangles from rectangleObjects
  rectangleObjects = rectangleObjects.filter(rect => rect.mesh.position.x > rectangleLeftEdge && rect.mesh.position.x < rectangleRightEdge);

  // if(Math.random() > 0.995) {
  //   showText = !showText;
  // }



  // Update effects parameters
  bloomPass.threshold = effectController.bloomPassThreshold;
  bloomPass.strength = effectController.bloomPassStrength;
  bloomPass.radius = effectController.bloomPassRadius;

  requestAnimationFrame(animate);

  stats.update();
  render();

  lastUpdate = now;
}

function render() {
  var time = Date.now() * 0.001;

  // renderer.render(scene, camera);
  composer.render();
}
