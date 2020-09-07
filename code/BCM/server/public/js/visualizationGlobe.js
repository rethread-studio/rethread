import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Map3DGeometry from "./Map3DGeometry.js";
import Stats from "https://unpkg.com/three@0.119.1/examples/jsm/libs/stats.module.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/UnrealBloomPass.js";
import TWEEN from "https://unpkg.com/@tweenjs/tween.js@18.6.0/dist/tween.esm.js";
import { SMAAPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/SMAAPass.js";

let locations = {
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

function multiplyLocation(loc, scale) {
  loc.x *= scale;
  loc.y *= scale,
  loc.z *= scale;
}

multiplyLocation(locations.top, 0.6);
multiplyLocation(locations.Europe, 1.2);

function splitGreatestDistance(from, to) {
  let dist = Math.abs(from.x - to.x);
  let axis = 'x';
  if(Math.abs(from.y - to.y) > dist) {
    dist = Math.abs(from.y - to.y);
    axis = 'y';
  }
  if(Math.abs(from.z - to.z) > dist) {
    dist = Math.abs(from.z - to.z);
    axis = 'z';
  }
  if(axis == 'x') {
    to.x = (from.x - to.x) * 0.5;
  } else if(axis == 'y') {
    to.y = (from.y - to.y) * 0.5;
  } else if(axis == 'z') {
    to.z = (from.z - to.z) * 0.5;
  }
}

function locationDistance(a, b) {
  return Math.sqrt(Math.pow((b.x - a.x), 2) + Math.pow((b.y - a.y), 2) + Math.pow((b.z - a.z), 2));
}

const easings = [TWEEN.Easing.Exponential.InOut, TWEEN.Easing.Sinusoidal.InOut, TWEEN.Easing.Circular.InOut, TWEEN.Easing.Linear.None];

// Load font
var loader = new THREE.FontLoader();
var font;
loader.load(
  "assets/fonts/helvetiker_regular.typeface.json",
  (response) => (font = response)
);

let positionPerService = new Map();
let lightPulseSpeed = 30;
let opacityBaseLevel = 0.4;
let countryActiveColor = "0xff0000";
let countryActivatedColor = "0xffffff";
let countryDarkColor = "0x665555";

let cameraOffset = new THREE.Vector3(0, 0, 0);

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
  if (json.event == "reset") {
    reset();
  } else if (json.event == "networkActivity") {
    const packet = json.data;
    let location = packet.remote_location.country;
    if (!location) {
      location = packet.local_location.country;
    }
    for (let country of countries) {
      if (country.geometry.name == location) {
        country.userData.scale += 0.003;
        // setTimeout(() => {
        //   country.scale.x -= 0.01;
        //   country.scale.y -= 0.01;
        //   country.scale.z -= 0.01;
        // }, 2500);
        if (country.userData.opacityVel === 0) {
          country.userData.opacityVel = lightPulseSpeed;
          country.userData.opacityPhase = 0;
        }
        if (country.userData.pulsesLeft < 7) {
          country.userData.pulsesLeft += 1;
        }
        country.userData.activated = true;
        break;
      }
    }
    if (location != undefined) {
      lastCountry = location;
    }
    for(const service of packet.services) {
      if (!positionPerService.has(service)) {
        let servicePos = random3DPosition(300);
        positionPerService.set(service, servicePos);
      }
      let pos = positionPerService.get(service).clone().add(random3DPosition(20));
      addParticle(pos, packet.len);
      addParticle(random3DPosition(300), packet.len);
    }
    
  }
};

function addParticle(vec3, packetSize) {
  let i = particleIndex;
  particlePositions[i * 3] = vec3.x;
  particlePositions[i * 3 + 1] = vec3.y;
  particlePositions[i * 3 + 2] = vec3.z;
  particleColors[i * 3] = 1.0;
  particleColors[i * 3 + 1] = Math.max(1.0 - Math.pow(packetSize/700, 2.0), 0);
  particleColors[i * 3 + 2] = Math.max(1.0 - Math.pow(packetSize/1800, 2.0), 0);
  particleAlphas[i] = 0.4;
  particlesData[i].lifetime = 500;
  let scale = 2.0 * 700/packetSize;
  particlesData[i].velocity = new THREE.Vector3(
    (-.4 + Math.random() * .8) * scale,
    (-.4 + Math.random() * .8) * scale,
    (-.4 + Math.random() * .8) * scale
  );
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

function random3DPosition(magnitude) {
  const theta = Math.random() * Math.PI * 2;
  const v = Math.random();
  const phi = Math.acos((2*v)-1);
  const r = magnitude;
  let x = r * Math.sin(phi) * Math.cos(theta);
  let y = r * Math.sin(phi) * Math.sin(theta);
  let z = r * Math.cos(phi);
  const halfMag = magnitude * 0.5;
  return new THREE.Vector3(x, y, z)
}

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

let container,
  stats,
  composer,
  renderer,
  camera,
  scene,
  controls,
  countries,
  bloomPass,
  smaaPass;
let lastUpdate = 0;
let lastCountry = "";

var maxParticleCount = 10000;
var particleCount = 0; // The number of active particles
var particleIndex = 0; // The index of the next particle (can loop around to recycle old particles)
var particlesData = [];
var particles;
var pointCloud;
var particlePositions;
var particleUniforms, particleAlphas, particleColors, particleSizes;

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
        // console.log(touchedCountry.geometry.name);
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
  camera.position.z = 400;
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
  smaaPass = new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
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

    particleColors[i * 3] = 1.0;
    particleColors[i * 3 + 1] = 1.0;
    particleColors[i * 3 + 2] = 1.0;

    particleAlphas[i] = Math.random();

    particleSizes[i] = 3.0;

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
  scene.add(pointCloud);

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
  let location = locations[keys[index]];
  let rotationDur = 1000;

  if(Math.random() > 0.9) {
    // sometimes randomly just rotate to a random position
  } else if (lastCountry === 'United States') {
    // Using the first face for the United States focuses on Hawaii
    location = { ...locations.NordAmerica};
    rotationDur = Math.random() * 400 + 700;
  } else if (countryShapes.hasOwnProperty(lastCountry)) {
    // Find the mesh with that name
    let mesh;
    for (let country of countries) {
      if (country.userData.name == lastCountry) {
        // project camera position from face normal
        let scale = 60;
        let pos = country.geometry.faces[0].normal;
        location = {
          x: pos.x * scale,
          y: pos.y * scale,
          z: pos.z * scale,
        }
        Math.random() * 400 + 700;
      }
    }
  }

  

  var from = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };

  let easing = easings[~~(Math.random() * easings.length)];

  if(locationDistance(from, location) > 70) {
    // if the target location is far away, first move higher not to clip the edges
    // make sure we first move to a location higher than the goal in order to 
    let higherLocation = { ...location }; // shallow copy
    multiplyLocation(higherLocation, 1.3);
    splitGreatestDistance(from, higherLocation);

    rotationDur *= 2;

    var tween = new TWEEN.Tween(from)
      .to(higherLocation, rotationDur * 0.5)
      .easing(easing)
      .onUpdate(function (position) {
        camera.position.set(position.x + cameraOffset.x, position.y + cameraOffset.y, position.z + cameraOffset.z);
        
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      })
      .onComplete(function () {
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        from.x = camera.position.x;
        from.y = camera.position.y;
        from.z = camera.position.z;

        var tween = new TWEEN.Tween(from)
          .to(location, rotationDur * 0.5)
          .easing(easing)
          .onUpdate(function (position) {
            camera.position.set(position.x + cameraOffset.x, position.y + cameraOffset.y, position.z + cameraOffset.z);
            
            camera.lookAt(new THREE.Vector3(0, 0, 0));
          })
          .onComplete(function () {
            camera.lookAt(new THREE.Vector3(0, 0, 0));
          })
          .start();
      })
      .start();
  } else {
    var tween = new TWEEN.Tween(from)
      .to(location, rotationDur)
      .easing(easing)
      .onUpdate(function (position) {
        camera.position.set(position.x + cameraOffset.x, position.y + cameraOffset.y, position.z + cameraOffset.z);
        
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      })
      .onComplete(function () {
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      })
      .start();
  }
  
  let nextRotation = Math.random() * rotationDur * 0.5 + rotationDur + 10;
  setTimeout(rotate, nextRotation);
}

// TODO: The camera.position is only updated when rotating leading to glitchy jumps
function updateCameraOffset() {
  let nextUpdateTime = Math.random() * 600 + 300;
  let newOffset = {
    x: Math.random() * 20 - 10,
    y: Math.random() * 20 - 10,
    z: Math.random() * 20 - 10,
  }
  let from = {
    x: cameraOffset.x,
    y: cameraOffset.y,
    z: cameraOffset.z,
  }
  var tween = new TWEEN.Tween(from)
      .to(newOffset, nextUpdateTime)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onUpdate(function (offset) {
        cameraOffset.set(offset.x, offset.y, offset.z);
        console.log(offset);
      })
      .onComplete(function () {
      })
      .start();
  setTimeout(updateCameraOffset, nextUpdateTime);
}

// updateCameraOffset();

function animate() {
  let now = Date.now() * 0.001;
  let dt = now - lastUpdate;

  for (let country of countries) {
    country.material.wireframe = effectController.wireframe;
    country.material.opacity += country.userData.opacityVel;
    if (country.userData.pulsesLeft > 0) {
      country.material.opacity =
        Math.sin(country.userData.opacityPhase) * (1 - opacityBaseLevel) +
        opacityBaseLevel;
      country.userData.opacityPhase += country.userData.opacityVel * dt;
      if (country.userData.opacityPhase > Math.PI) {
        country.userData.opacityPhase = 0;
        country.userData.pulsesLeft -= 1;
        if (country.userData.pulsesLeft <= 0) {
          country.userData.pulsesLeft = 0;
          country.userData.opacityVel = 0;
          country.material.opacity = opacityBaseLevel;
        }
      }
    }
    if (country.userData.activated) {
      // if(lastCountry == country.geometry.name) {
      //   country.material.color.setHex(countryActiveColor);
      // } else {
      // country.material.color.setHex(countryActivatedColor);
      // }

      // Update scale
      country.userData.scale *= 0.985;
      country.userData.scaleFollower = country.userData.scale * 0.005 + country.userData.scaleFollower * 0.995;
      // country.scale.x = country.userData.baseScale + country.userData.scaleFollower;
      // country.scale.y = country.userData.baseScale + country.userData.scaleFollower;
      // country.scale.z = country.userData.baseScale + country.userData.scaleFollower;

      const colorScale = 1-Math.pow((1-country.userData.scaleFollower), 2);

      country.material.color.setRGB(
        1.0,
        1.0 - colorScale,
        1.0 - colorScale / 1.5
      );
    } else {
      country.material.color.setHex(countryDarkColor);
    }
  }

  // Update particles

  for (var i = 0; i < particleCount; i++) {
    // get the particle
    var particleData = particlesData[i];

    particlePositions[i * 3] += particleData.velocity.x * dt;
    particlePositions[i * 3 + 1] += particleData.velocity.y * dt;
    particlePositions[i * 3 + 2] += particleData.velocity.z * dt;
    particleAlphas[i] *= 1.0 - (dt * 0.5);
    // if(particleData.service == activeService) {
    //   particleColors[i * 3] = activeParticleColor.r;
    //   particleColors[i * 3 + 1] = activeParticleColor.g;
    //   particleColors[i * 3 + 2] = activeParticleColor.b;
    // } else {
    //   particleColors[i * 3] = 1.0;
    //   particleColors[i * 3 + 1] = 1.0;
    //   particleColors[i * 3 + 2] = 1.0;
    // }

    if(particleData.lifetime <= 0) {
      particlePositions[i * 3 + 2] = 2000000; // Hide particle if it's dead
    } else {
      particleData.lifetime--;
    }
  }

  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.alpha.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;

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

function reset() {
  for (let country of countries) {
    country.material.opacity = opacityBaseLevel;
    country.material.color.setHex(0xbb4949);
    country.scale.x = country.userData.baseScale;
    country.scale.y = country.userData.baseScale;
    country.scale.z = country.userData.baseScale;
    country.userData.opacityVel = 0;
    country.userData.activated = false;
    country.userData.pulsesLeft = 0;
    country.userData.scale = 0;
    country.userData.baseScale = scale;
    country.userData.scaleFollower = 0;
  }
  positionPerService.clear();
  particleCount = 0;
  particles.setDrawRange(0, particleCount);
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
      color: 0xbb4949,
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
    mesh.userData.name = name;
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
