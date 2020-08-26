import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Map3DGeometry from "./Map3DGeometry.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js";

// Load font
var loader = new THREE.FontLoader();
var font;
loader.load(
  "assets/fonts/helvetiker_regular.typeface.json",
  (response) => (font = response)
);

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

ws.onmessage = async (message) => {
  const json = JSON.parse(message.data);
  if (json.event == "networkActivity") {
    const packet = json.data;
    let location = packet.remote_location.country;
    if (!location) {
      location = packet.local_location.country;
    }
    for (let country of countries) {
      if (country.geometry.name == location) {
        country.scale.x += 0.01;
        country.scale.y += 0.01;
        country.scale.z += 0.01;
        setTimeout(() => {
          country.scale.x -= 0.01;
          country.scale.y -= 0.01;
          country.scale.z -= 0.01;
        }, 2500);
        country.material.opacity = 1;
        country.material.color.setHex(0xffffff);
        await pulseCountry(country);
        break;
      }
    }
  }
};

async function wait(time) {
  await new Promise((resolve) => setTimeout(resolve, time));
}
async function pulseCountry(country) {
  if (country.inPuse) {
    return;
  }
  country.inPuse = true;
  for (let i = 0; i < effectController.nbPulse; i++) {
    country.scale.x += effectController.pulseIntensity;
    country.scale.y += effectController.pulseIntensity;
    country.scale.z += effectController.pulseIntensity;
    await wait(effectController.pulseInterval);
    country.scale.x -= effectController.pulseIntensity;
    country.scale.y -= effectController.pulseIntensity;
    country.scale.z -= effectController.pulseIntensity;
    await wait(effectController.pulseInterval);
  }
  country.inPuse = false;
}

var effectController = {
  nbPulse: 4,
  pulseIntensity: 1.5,
  pulseInterval: 30,
  wireframe: false,
};

let container, stats, composer, camera, scene, controls, countries;

init();
animate();

function initGUI() {
  var gui = new GUI();

  gui.add(effectController, "nbPulse", 0, 10, 1);
  gui.add(effectController, "pulseIntensity", 0.0, 20, 0.5);
  gui.add(effectController, "pulseInterval", 10, 250, 1);
  gui.add(effectController, "wireframe");
}

function init() {
  initGUI();

  container = document.getElementById("container");

  document.addEventListener(
    "mousedown",
    (event) => {
      event.preventDefault();
      const mouse = new THREE.Vector2(); // create once

      mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
      const raycaster = new THREE.Raycaster(); // create once

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(countries, false);
      if (intersects.length > 0) {
        const touchedCountry = intersects[0].object;
        console.log(touchedCountry.geometry.name);
      }
    },
    false
  );

  const WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight,
    // set some camera attributes
    VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

  // set basic attributes
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    //powerPreference: "high-performance",
  });
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  controls = new OrbitControls(camera, renderer.domElement);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild(renderer.domElement);

  // COMPOSER
  composer = new EffectComposer(renderer);

  // RENDER PASSES
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  controls.minDistance = 50;
  controls.maxDistance = 650;
  controls.zoomSpeed = 0.3;
  controls.zoomDampingFactor = 0.3;
  controls.momentumDampingFactor = 0.5;
  controls.rotateSpeed = 0.6;

  camera.position.z = 100;

  const countryLayers = generateCountries();
  scene.add(countryLayers);

  var geometry = new THREE.SphereGeometry(18, 32, 32);
  var material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.8,
  });
  var sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  countries = countryLayers.countries;

  scene.fog = new THREE.Fog(0xfafafa, 40, 2000);
  const light = new THREE.HemisphereLight(0xffffff, 0x555555, 0.7);
  scene.add(light);

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
  // for (let country of countries) {
  //   const scale = Math.round(10 + Math.random() * 20);
  //   country.scale.x = scale;
  //   country.scale.y = scale;
  //   country.scale.z = scale;
  // }

  for (let country of countries) {
    country.material.wireframe = effectController.wireframe;
  }

  requestAnimationFrame(animate);
  stats.update();
  controls.update();
  render();
}

function render() {
  // renderer.render(scene, camera);
  composer.render();
}

function generateCountries() {
  var layer = new THREE.Object3D();
  var factor = 1;

  layer.scale.set(factor, factor, factor);

  var polygons = Object.keys(countryShapes).map(function (name) {
    const country = countryShapes[name];
    const geometry = new Map3DGeometry(country, 0.95);
    geometry.name = name;

    const material = new THREE.MeshPhongMaterial({
      wireframe: true,
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      shading: THREE.SmoothShading,
    });
    const scale = 20;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = scale;
    mesh.scale.y = scale;
    mesh.scale.z = scale;
    layer.add(mesh);

    return mesh;
  });
  layer.getGeometryByName = function (name) {
    return polygons[Object.keys(countryShapes).indexOf(name)];
  };

  layer.getGeometryByIndex = function (index) {
    return polygons[index];
  };
  layer.countries = polygons;
  return layer;
}
