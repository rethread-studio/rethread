import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import {createGeometry, loadFont } from "./three-bmfont-text-bundle.js";

let allPackets = [];
const statsPerService = new Map();
const positionPerService = new Map();
const textPerService = new Map();
const indexPerService = new Map(); // Give the service a number used as an index to a lane
const lastRegisteredPerService = new Map();
let activeService = '';

var bmfont;
var bmTextMaterial;
// Load bitmap font
loadFont('fonts/Arial.fnt', function(err, font) {
  // create a geometry of packed bitmap glyphs, 
  // word wrapped to 300px and right-aligned
  bmfont = font;

  
  // the resulting layout has metrics and bounds
  // console.log(geometry.layout.height)
  // console.log(geometry.layout.descender)
})

// the texture atlas containing our glyphs
var textureLoader = new THREE.TextureLoader();
textureLoader.load('fonts/Arial.png', function (texture) {
  // we can use a simple ThreeJS material
  bmTextMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    color: 0xaaffff
  })
});


// Receive packets
const ws = WebSocketClient();

const onmessage = (message) => {
  const json = JSON.parse(message.data);
  if (json.event == "networkActivity") {
    const packet = json.data;
    allPackets.push({
      location: packet.location,
    })
    if(packet.services.length === 0) {
      packet.services.push(packet.remote_ip)
    }

    for(const service of packet.services) {
      if (!indexPerService.has(service)) {
        indexPerService.set(service, indexPerService.size);
      }
      createText(service, service);
      let time = Date.now() * 0.001;
      lastRegisteredPerService.set(service, time);
      activeService = service;
    }
  }
};
ws.addEventListener("message", onmessage)


var container, stats;

var camera, scene, renderer;
var composer;
var bloomPass, renderPass, pass1;
var positions, colors;

let randomParticle = 0; // Used for drawing lines, this is the starting particle

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

// Load font
// var loader = new THREE.FontLoader();
// var font;
// loader.load( 'assets/fonts/' + 'helvetiker_regular.typeface.json', function ( response ) {
//   font = response;
// } );

// let textMaterialDefault = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.7 } );
// let textMaterialActive = new THREE.MeshBasicMaterial( { color: 0xff0000, transparent: true, opacity: 0.9 } );

let textObjects = [];
var text_group;

function createText(text, service) {
  // let geometry = new THREE.TextGeometry( text, {
	// 	font: font,
	// 	size: 20,
  //   height: 0.01,
	// 	curveSegments: 12,
  //   bevelEnabled: true,
  //   bevelSize: 0.1,
  //   bevelOffset: 0.1,
  //   bevelSegments: 1,
  // } );
  
  // let textMesh = new THREE.Mesh( geometry, textMaterialDefault );

  if(textPerService.has(service)) {
    textPerService.get(service).lifetime = 5;
  } else {
    let geometry = createGeometry({
      width: 300,
      align: 'right',
      font: bmfont
    })
  
    // change text and other options as desired
    // the options sepcified in constructor will
    // be used as defaults
    geometry.update(text);
    let textMesh = new THREE.Mesh( geometry, bmTextMaterial );
  
    // Convert from screen coordinates to camera coordinates
    let left = Math.random() * 2 - 1;
    let top = Math.random() * 2 - 1;
    let depth = 1; // from -1 to 1, depends how far into the scene you want the object, -1 being very close, 1 being the furthest away the camera can see
    var vector = new THREE.Vector3(left, top, depth);
    vector.unproject( camera );
    var dir = vector.sub( camera.position ).normalize();
    var distance = - camera.position.z / dir.z;
    var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
    textMesh.position.copy(pos);
    textMesh.position.z = 500;
    // textMesh.rotation.y = Math.PI * 0.5;
    textObjects.push({
      mesh: textMesh,
      service: service,
      // vel: new THREE.Vector3(0, 0, Math.random() * 600 - 1200),
      lifetime: 5,
    });
    text_group.add(textMesh);
    textPerService.set(service, textMesh);
  }
}

init();
animate();

function init() {

  container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.z = 500;

  // var controls = new OrbitControls(camera, container);
  // controls.minDistance = 1000;
  // controls.maxDistance = 3000;

  scene = new THREE.Scene();

  text_group = new THREE.Group();
  scene.add(text_group);


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

  console.log(textObjects.length);
 
  // Update rectangles
  for(let txt of textObjects) {
    txt.mesh.position.x += txt.vel.x * dt;
    txt.mesh.position.y += txt.vel.y * dt;
    txt.mesh.position.z += txt.vel.z * dt;

    if(activeService == txt.service) {
      txt.mesh.material = textMaterialActive;
    } else {
      txt.mesh.material = textMaterialDefault;
    }
    txt.lifetime -= dt;
    if(txt.lifetime < 0) {
      // Outside of view, remove it
      // text_group.remove(txt.mesh);
      txt.mesh.
    }
  }

  // Update effects parameters
  bloomPass.threshold = 0;
  bloomPass.strength = 0.35;
  bloomPass.radius = 0.15;

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
