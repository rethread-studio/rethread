import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js";
import { GlitchPass } from "./three/postprocessing/CustomGlitchPass.js";
import { ShaderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/SMAAPass.js";

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

function to3d(x, y, z, w) {
  return {
    x: y + (1 / 2) * (z + w),
    y: Math.sqrt(3) * (z / 2 + w / 6),
    z: (Math.sqrt(6) * w) / 3,
  };
}
function ipTo(ip) {
  const split = ip.split(".").map((x) => parseInt(x));

  const coord = to3d(split[0], split[1], split[2], split[3]);
  return new THREE.Vector3(coord.x, coord.y, coord.z);
}

ws.onmessage = (message) => {
  const json = JSON.parse(message.data);

  if (json.event == "networkActivity") {
    const packet = json.data;
    const ip = packet.remote_ip;
  }
};

var container, stats;

var camera, scene, renderer;
var composer;
var bloomPass, renderPass, glitchPass, smaaPass;
var positions, colors;
var particleUniforms,
  particleSystem,
  particlePositions,
  pointCloud,
  particles_group;
const sizeLayer = 10;
const maxParticleCount = sizeLayer * sizeLayer * sizeLayer;
var particleAlphas = new Float32Array(maxParticleCount);
var particlesData = [];
const particles = new THREE.BufferGeometry(),
  pMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
  });
var effectController = {};

init();
animate();

function init() {
  container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  const scale = 5;

  camera.position.z = 3000;
  camera.position.x = (sizeLayer * scale) / 2;
  camera.position.y = (sizeLayer * scale) / 2;

  scene = new THREE.Scene();

  particles_group = new THREE.Group();
  scene.add(particles_group);

  // create the particle system
  particleSystem = new THREE.Points(particles, pMaterial);
  particlePositions = new Float32Array(maxParticleCount * 3);

  for (let index = 0; index < sizeLayer; index++) {
    for (let index2 = 0; index2 < sizeLayer; index2++) {
      for (let index3 = 0; index3 < sizeLayer; index3++) {
        particlesData.push(
          new THREE.Vector3(index * scale, index2 * scale, index3 * scale)
        );
        const i = index * index2 * index3;
        particlePositions[i * 3] = index * scale;
        particlePositions[i * 3 + 1] = index2 * scale;
        particlePositions[i * 3 + 2] = index3 * scale;
      }
    }
  }
  particles.setDrawRange(0, maxParticleCount);
  particles.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3).setUsage(
      THREE.DynamicDrawUsage
    )
  );
  particles.setAttribute(
    "alpha",
    new THREE.BufferAttribute(particleAlphas, 1).setUsage(
      THREE.DynamicDrawUsage
    )
  );

  pointCloud = new THREE.Points(particles, pMaterial);
  particles_group.add(pointCloud);

  // add it to the scene
  scene.add(particleSystem);

  particleUniforms = {
    // alpha: {value: 1.0}
  };

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: false,
  });
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

var lastUpdate = 0;

function animate() {
  let now = Date.now() * 0.001;
  let dt = now - lastUpdate;

  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.alpha.needsUpdate = true;

  particleAlphas[Math.floor(Math.random() * maxParticleCount)] = 1;
  requestAnimationFrame(animate);

  stats.update();
  render();
  lastUpdate = now;
}

function render() {
  renderer.render(scene, camera);
}
