import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Map3DGeometry from "./Map3DGeometry.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import TWEEN from "https://unpkg.com/@tweenjs/tween.js@18.6.0/dist/tween.esm.js";
import { SMAAPass } from 'https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/SMAAPass.js';

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

let lightPulseSpeed = 40;
let opacityBaseLevel = 0.2;
let countryActiveColor =  '0xff0000';
let countryActivatedColor = '0xffffff';
let countryDarkColor = '0x443333';

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
        country.userData.scale += 0.002;
        // setTimeout(() => {
        //   country.scale.x -= 0.01;
        //   country.scale.y -= 0.01;
        //   country.scale.z -= 0.01;
        // }, 2500);
        if(country.userData.opacityVel === 0) {
          country.userData.opacityVel = lightPulseSpeed;
          country.userData.opacityPhase = 0;
        }
        if(country.userData.pulsesLeft < 10) {
          country.userData.pulsesLeft += 1;
        }
        
        country.userData.activated = true;
        
        // country.material.color.setHex(0xffffff);
        // await pulseCountry(country);
        break;
      }
    }
    lastCountry = location;
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

let container, stats, composer, renderer, camera, scene, controls, countries, bloomPass, smaaPass;
let lastUpdate = 0;
let lastCountry = '';

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
  // initGUI();

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

  bloomPass = new UnrealBloomPass();
  bloomPass.strength = 0.7;
  bloomPass.threshold = 0.01;
  bloomPass.radius = 0.2;
  composer.addPass(bloomPass);
  // Anti-aliasing while using EffectComposer requires a dedicated anti-aliasing pass
  smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
  composer.addPass(smaaPass);

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
  // container.appendChild(stats.dom);

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

setInterval(rotate, 1000);



function animate() {
  let now = Date.now() * 0.001;
  let dt = now - lastUpdate;

  for (let country of countries) {
    country.material.wireframe = effectController.wireframe;
    country.material.opacity += country.userData.opacityVel;
    if(country.userData.pulsesLeft > 0) {
      country.material.opacity = Math.sin(country.userData.opacityPhase) * (1 - opacityBaseLevel) + opacityBaseLevel;
      country.userData.opacityPhase += country.userData.opacityVel * dt;
      if(country.userData.opacityPhase > Math.PI) {
        country.userData.opacityPhase = 0;
        country.userData.pulsesLeft -= 1;
        if(country.userData.pulsesLeft <= 0) {
          country.userData.pulsesLeft = 0;
          country.userData.opacityVel = 0;
          country.material.opacity = opacityBaseLevel;
        }
      }
    }
    if(country.userData.activated) {
      // if(lastCountry == country.geometry.name) {
      //   country.material.color.setHex(countryActiveColor);
      // } else {
        // country.material.color.setHex(countryActivatedColor);
      // }

      // Update scale
      country.userData.scale *= 0.98;
      country.userData.scaleFollower = country.userData.scale * 0.03 + country.userData.scaleFollower * 0.97;
      // country.scale.x = country.userData.baseScale + country.userData.scaleFollower;
      // country.scale.y = country.userData.baseScale + country.userData.scaleFollower;
      // country.scale.z = country.userData.baseScale + country.userData.scaleFollower;

      country.material.color.setRGB(1.0, 1.0 - country.userData.scaleFollower, 1.0 - (country.userData.scaleFollower/1.5));
    } else {
      country.material.color.setHex(countryDarkColor);
    }
    
  }

  TWEEN.update();
  requestAnimationFrame(animate);
  stats.update();
  controls.update();
  render();

  lastUpdate = now;
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
      color: 0x443333,
      transparent: true,
      opacity: opacityBaseLevel,
      shading: THREE.SmoothShading,
      shininess: 50,
    });
    const scale = 20.57236; // + Math.random() / 2;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = scale;
    mesh.scale.y = scale;
    mesh.scale.z = scale;
    mesh.userData.opacityVel = 0;
    mesh.userData.activated = false;
    mesh.userData.pulsesLeft = 0;
    mesh.userData.scale = 0;
    mesh.userData.baseScale = scale;
    mesh.userData.scaleFollower = 0;
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
