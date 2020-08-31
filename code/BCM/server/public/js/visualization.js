import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from './three/postprocessing/CustomGlitchPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/SMAAPass.js';

let allPackets = [];
const statsPerService = new Map();
const positionPerService = new Map();
const textPerService = new Map();
const indexPerService = new Map(); // Give the service a number used as an index to a lane
const lastRegisteredPerService = new Map();
let activeService = '';
let packetsOverTime = 0;
let triggerThisFrame = false;

let visMode = 'particles';
let showText = true;


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
  if (json.event == "reset") {
    reset();
  } else if (json.event == "networkActivity") {
    const packet = json.data;
    // console.log(packet.remote_host);
    allPackets.push({
      location: packet.location,
    })
    if(packet.services.length === 0) {
      packet.services.push(packet.remote_host)
    }

    packetsOverTime++;
    if(packetsOverTime > 100) {
      if(!triggerThisFrame) {
        glitchPass.triggerActivation();
      }
    } else {
      for(const service of packet.services) {
        if (!positionPerService.has(service)) {
          let servicePos = random3DPosition(500);
          createText(service, servicePos);
          positionPerService.set(service, servicePos);
          indexPerService.set(service, indexPerService.size);
        }
        addParticle(service, positionPerService.get(service), packet.len);
        let time = Date.now() * 0.001;
        lastRegisteredPerService.set(service, time);
        activeService = service;
      }
    }
  }
};

function reset() {
  allPackets = [];
}

function random3DPosition(magnitude) {
  return new THREE.Vector3(
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
  )
}

function addParticle(service, vec3, packetSize) {
  let i = particleIndex;
  particlePositions[i * 3] = vec3.x;
  particlePositions[i * 3 + 1] = vec3.y;
  particlePositions[i * 3 + 2] = vec3.z;
  particleAlphas[i] = 0.8;
  particlesData[i].lifetime = 500;
  let scale = 60.0 * 700/packetSize;
  particlesData[i].velocity = new THREE.Vector3(
    (-.4 + Math.random() * .8) * scale,
    (-.4 + Math.random() * .8) * scale,
    (-.4 + Math.random() * .8) * scale
  );
  particlesData[i].service = service;
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

let textMaterialDefault = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.7 } );
let textMaterialActive = new THREE.MeshBasicMaterial( { color: 0xff0000, transparent: true, opacity: 0.9 } );

function createText(service, servicePos) {
  let geometry = new THREE.TextGeometry( service, {
		font: font,
		size: 50,
    height: 0.01,
		curveSegments: 12,
    bevelEnabled: true,
    bevelSize: 0.1,
    bevelOffset: 0.1,
    bevelSegments: 1,
  } );
  
  let textMesh = new THREE.Mesh( geometry, textMaterialDefault );
  textMesh.position.copy(servicePos);
  particlesTextObjects.push({
    mesh: textMesh,
    service: service,
  });
  particles_group.add(textMesh);
}

let activeParticleColor = new THREE.Color(0xff0000);
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
var bloomPass, renderPass, glitchPass, smaaPass;
var positions, colors;
var particleUniforms, particleAlphas, particleColors, particleSizes;

let randomParticle = 0; // Used for drawing lines, this is the starting particle

var maxParticleCount = 10000;
var particleCount = 0; // The number of active particles
var particleIndex = 0; // The index of the next particle (can loop around to recycle old particles)
var r = 800;
var rHalf = r / 2;


var effectController = {
  showDots: true,
  showLines: true,
  minDistance: 150,
  limitConnections: false,
  numConnections: 3,
  linesStayingProbability: 0.6,
  particleCount: 0,
  bloomPassThreshold: 0.1,
  bloomPassStrength: 0.7,
  bloomPassRadius: 0.1,
  doRotation: false,
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
  gui.add(effectController, "doRotation");
  gui.add(effectController, "minDistance", 10, 300);
  gui.add(effectController, "limitConnections");
  gui.add(effectController, "numConnections", 0, 20, 1);
  gui.add(effectController, "linesStayingProbability", 0.1, 0.99, 0.001);
  gui.add(effectController, "bloomPassThreshold", 0.0, 2.0, 0.001);
  gui.add(effectController, "bloomPassStrength", 0.0, 2.0, 0.001);
  gui.add(effectController, "bloomPassRadius", 0.0, 2.0, 0.001);
  gui
    .add(effectController, "particleCount", 0, maxParticleCount, 1)
    .onChange(function (value) {
      particleCount = parseInt(value);
      particles.setDrawRange(0, particleCount);
    });
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

  particles_group = new THREE.Group();
  scene.add(particles_group);

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

  particleUniforms = {

    // alpha: {value: 1.0}

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
  col.setHSL(0.0, 1.0, 1.0);

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

    particleColors[i * 3] = col.r;
    particleColors[i * 3 + 1] = col.g;
    particleColors[i * 3 + 2] = col.b;

    particleAlphas[i] = Math.random();

    particleSizes[i] = 20.0;

    // add it to the geometry
    let scale = 60.0;
    particlesData.push({
      velocity: new THREE.Vector3(
        (-.4 + Math.random() * .8) * scale,
        (-.4 + Math.random() * .8) * scale,
        (-.4 + Math.random() * .8) * scale
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

  glitchPass = new GlitchPass();
  composer.addPass(glitchPass);

  bloomPass = new UnrealBloomPass();
  // bloomPass.strength = 1.5;
  // bloomPass.threshold = 1.0;
  // bloomPass.radius = 1.1;
  composer.addPass(bloomPass);

  // Anti-aliasing while using EffectComposer requires a dedicated anti-aliasing pass
  smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
  composer.addPass(smaaPass);

  //
  stats = new Stats();
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

  if(Math.random() > 0.99 && effectController.doRotation) {
    particles_rotation_counter = 0.5;
    const scale = 6.0;
    // TODO: Do a random direction with radius instead
    particles_rotation_vel.set(Math.random()* scale, Math.random() * scale, Math.random() * scale);
  }

  // Update rotation
  if(particles_rotation_counter > 0) {
    particles_rotation.x += particles_rotation_vel.x * dt;
    particles_rotation.y += particles_rotation_vel.y * dt;
    particles_rotation.z += particles_rotation_vel.z * dt;
    particles_rotation_counter -= dt;
  }
  

  // Update particles
  var vertexpos = 0;
  var colorpos = 0;
  var numConnected = 0;

  // for (var i = 0; i < particleCount; i++) particlesData[i].numConnections = 0;

  for (var i = 0; i < particleCount; i++) {
    // get the particle
    var particleData = particlesData[i];

    particlePositions[i * 3] += particleData.velocity.x * dt;
    particlePositions[i * 3 + 1] += particleData.velocity.y * dt;
    particlePositions[i * 3 + 2] += particleData.velocity.z * dt;
    particleAlphas[i] *= 1.0 - dt;
    if(particleData.service == activeService) {
      particleColors[i * 3] = activeParticleColor.r;
      particleColors[i * 3 + 1] = activeParticleColor.g;
      particleColors[i * 3 + 2] = activeParticleColor.b;
    } else {
      particleColors[i * 3] = 1.0;
      particleColors[i * 3 + 1] = 1.0;
      particleColors[i * 3 + 2] = 1.0;
    }

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
  let numConnections = effectController.numConnections;
  let lineParticleIndex = particleIndex - numConnections * 2;
  if(lineParticleIndex < 0) {
    lineParticleIndex += particleCount;
  }
  

  if(particleCount > 2) {
    for(let i = 0; i < numConnections; i++) {
      if(i > particleCount) {
        // There are no eligible pairs
        break;
      }
      let particle1 = lineParticleIndex;
      let particle2 = (lineParticleIndex+1) % particleCount;
      if(particlesData[particle1].lifetime <= 400 
        || (particlesData[particle2].lifetime <= 400)) {
        numConnections += 1;
        lineParticleIndex = particle2;
        continue;
      }
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
      lineParticleIndex = particle2;
    }
  }
  
  linesMesh.geometry.setDrawRange(0, effectController.numConnections * 2);
  linesMesh.geometry.attributes.position.needsUpdate = true;
  linesMesh.geometry.attributes.color.needsUpdate = true;

  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.alpha.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;


  // if(Math.random() > 0.995) {
  //   showText = !showText;
  // }

  // Updateing texts
  for(let text of particlesTextObjects) {
    if(text.service == activeService) {
      text.mesh.material = textMaterialActive;
    } else {
      text.mesh.material = textMaterialDefault;
    }
    if(now - lastRegisteredPerService.get(text.service) < 0.2) {
      text.mesh.visible = true;
    } else {
      text.mesh.visible = false;
    }
    if(showText) {
      textMaterialDefault.opacity = 0.6;
      textMaterialActive.opacity = 0.7;
    } else {
      textMaterialDefault.opacity = 0.0;
      textMaterialActive.opacity = 0.0;
    }
  }

  // Update effects parameters
  bloomPass.threshold = effectController.bloomPassThreshold;
  bloomPass.strength = effectController.bloomPassStrength;
  bloomPass.radius = effectController.bloomPassRadius;

  requestAnimationFrame(animate);

  stats.update();
  render();
  
  packetsOverTime *= 0.8;
  triggerThisFrame = false;
  lastUpdate = now;
}

function render() {
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
