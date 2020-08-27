import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Map3DGeometry from "./Map3DGeometry.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js";
import TWEEN from "https://unpkg.com/@tweenjs/tween.js@18.6.0/dist/tween.esm.js";

const locations = {
  NordAmerica: {
    x: 45.007262821788274,
    y: 42.636811843287255,
    z: 15.719691443279078,
  },
  SouthAmerica: {
    x: 57.877554836810496,
    y: -11.686766076650507,
    z: -24.581868820798697,
  },
  Africa: {
    x: -20.10638732410356,
    y: 7.104283932574123,
    z: -60.29861083408001,
  },
  Europe: {
    x: -5.914913565619374,
    y: 37.112113595615455,
    z: -32.98037025227866,
  },
  Asia: { x: -47.827295699164246, y: 42.1859899887746, z: -4.853057254243454 },
  Oceania: {
    x: -47.17537192267708,
    y: -18.70291910473583,
    z: 38.92743545187653,
  },
  top: { x: 2.6451793113733446, y: 103.04016038480927, z: -3.2535889089049363 },
};

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

let container, stats, composer, renderer, camera, scene, controls, countries;

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
  renderer = new THREE.WebGLRenderer({
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

  rotate();

  const countryLayers = generateCountries();
  scene.add(countryLayers);

  var geometry = new THREE.SphereGeometry(20, 42, 42, 42);
  var material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: false,
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

function rotate() {
  const keys = Object.keys(locations);
  const index = Math.floor(Math.random() * keys.length);
  const location = locations[keys[index]];

  var from = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };

  var tween = new TWEEN.Tween(from)
    .to(location, 600)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(function (position) {
      camera.position.set(position.x, position.y, position.z);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    })
    .onComplete(function () {
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    })
    .start();
}

setInterval(rotate, 2000);

function animate() {
  for (let country of countries) {
    country.material.wireframe = effectController.wireframe;
  }

  TWEEN.update();
  requestAnimationFrame(animate);
  stats.update();
  controls.update();
  render();
}

function render() {
  renderer.render(scene, camera);
  //composer.render();
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
    const scale = 20 + Math.random() / 2;
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
