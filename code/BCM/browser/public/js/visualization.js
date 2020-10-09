import * as THREE from "https://unpkg.com/three@0.119.1/build/three.module.js";
import Map3DGeometry from "./Map3DGeometry.js";
import { GUI } from "https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js";
import { EffectComposer } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/EffectComposer.js";
import { OrbitControls } from "https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js";
import { RenderPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/RenderPass.js";
import { GlitchPass } from "./three/postprocessing/CustomGlitchPass.js";
import { SMAAPass } from "https://unpkg.com/three@0.119.1/examples/jsm/postprocessing/SMAAPass.js";
import TWEEN from "https://unpkg.com/@tweenjs/tween.js@18.6.0/dist/tween.esm.js";

const positionPerService = new Map();
const textPerService = new Map();
const indexPerService = new Map(); // Give the service a number used as an index to a lane
const lastRegisteredPerService = new Map();
let activeService = "";
let packetsOverTime = 0;
let glitchThreshold = 130;
let triggerThisFrame = false;

let initiator = "";

// Load font
var loader = new THREE.FontLoader();
var font;
loader.load("fonts/" + "helvetiker_regular.typeface.json", function (
  response
) {
  font = response;
});

// GLOBE SETUP
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
  if (Math.abs(from.y - to.y) > dist) {
    dist = Math.abs(from.y - to.y);
    axis = 'y';
  }
  if (Math.abs(from.z - to.z) > dist) {
    dist = Math.abs(from.z - to.z);
    axis = 'z';
  }
  if (axis == 'x') {
    to.x = (from.x - to.x) * 0.5;
  } else if (axis == 'y') {
    to.y = (from.y - to.y) * 0.5;
  } else if (axis == 'z') {
    to.z = (from.z - to.z) * 0.5;
  }
}

function locationDistance(a, b) {
  return Math.sqrt(Math.pow((b.x - a.x), 2) + Math.pow((b.y - a.y), 2) + Math.pow((b.z - a.z), 2));
}

const easings = [TWEEN.Easing.Exponential.InOut, TWEEN.Easing.Sinusoidal.InOut, TWEEN.Easing.Circular.InOut, TWEEN.Easing.Linear.None];

let lightPulseSpeed = 30;
let opacityBaseLevel = 0.3;
let countryDarkColor = "0x665555";

let cameraPosition = new THREE.Vector3(45, 42, 15);
let globeRotation = new THREE.Vector3(0, 0, 0);

let countries;
let countryLayers;
let lastCountry = "";

// END GLOBE SETUP

//SERVICE PARTICLE VIZ OPTIONS
const options = {

  length: 400,
  fov: 90,

  installation: false,

  colors: {
    url: 0xee4035,
    service: 0x0a0a0a,
    package: 0x000000,
  },
  showLabels: true,
  lightHelpers: false,
  angleStep: 30,

  countries: {
    color: 0xFFFFFF,
    transparent: false,
    opacityBaseLevel: 0.5
  }
}
//modify styles if to match installation settings
document.body.style.paddingTop = options.installation ? '470px' : 0;


function changeColor() {
  colorPos = colorPos + 1 > options.backgroundColors.length ? 0 : colorPos + 1;
  document.body.style.backgroundColor = options.backgroundColors[colorPos];
}

// setInterval(changeColor, 5000)


// Receive packets
const ws = WebSocketClient();

const containerViz = document.getElementById("container-particles");
const myApp = new AppViz(containerViz, options);
myApp.init();
// SERVICE VIZ 
// const serviceViz = new ServiceGenerator(1220, window.innerWidth);



//READ THE SOCKET FOR ACTIVITY
const onmessage = (message) => {
  const json = JSON.parse(message.data);

  //Per request we want to add three elements
  //INITIALIZAR
  //SERVICE
  //EVENT
  //REQUEST CREATED
  if (json.event == "request_created") {

    //Add a new initiator 
    if (initiator != json.request.initiator) {
      initiator = json.request.initiator;
      // changeColor();
      const packet = json.request;

      //ADD URL when they navigate one tab
      if (packet.type == "main_frame") {


        myApp.addURL(packet.url, packet.requestId)

        const message = {
          se: "Det äar en experiment för alt",
          en: "This is an experimetn for all"
        }
        typeMessage(message)

        //add
      }
      //To do: RESET VISUALS
    }

  } else if (json.event == "request_completed") {
    //ADD INITIATOR

    //Get the information from the request
    const packet = json.request;

    // //CHECK if it has any packaggites
    //if it does not have, include the host name as a service
    if (packet.services.length === 0) {
      packet.services.push(packet.hostname);
    }
    let location = packet.location != null && packet.location != undefined ? countryList.name(packet.location.country) : "";

    // if (!location) {
    //   location = packet.local_location.country;
    // }
    for (let c of countries) {
      if (c.geometry.name == location) {
        c.userData.scale += 0.003;
        if (c.userData.opacityVel === 0) {
          c.userData.opacityVel = lightPulseSpeed;
          c.userData.opacityPhase = 0;
        }
        if (c.userData.pulsesLeft < 7) {
          c.userData.pulsesLeft += 1;
        }
        c.userData.activated = true;
        break;
      }
    }
    if (location != undefined) {
      lastCountry = location;
    }

    //Increment the counter for packetsOverTime
    packetsOverTime++;
    //If it goes over the glitchThreshold trigger glitch
    if (packetsOverTime > glitchThreshold) {
      if (!triggerThisFrame) {
        glitchPass.triggerActivation(packetsOverTime);
        triggerThisFrame = true;
      }
    } else {
      //Process each of the services in the packet
      for (const service of packet.services) {
        //ADD SERVICE TO TEXT
        // serviceViz.addService(service)
        // ADD A NEW 3D SERVICE
        myApp.addService(service, json.request.type, json.request.requestId);

        //if the service does not exist
        const country = packet.location != null && packet.location != undefined ? getCountryName(packet.location.country) : "";

        if (!positionPerService.has(country)) {
          //create a text to display
          let servicePos = random3DPosition(500);
          createText(country, servicePos);
          positionPerService.set(country, servicePos);
          indexPerService.set(country, indexPerService.size);
        }
        //add the text and particles
        updateText(country);
        addParticle(country, positionPerService.get(country), packet.len);
        //
        let time = Date.now() * 0.001;
        lastRegisteredPerService.set(country, time);
        activeService = country;
      }
    }
    // console.log(json.request)
    // if (jserviceVizson.request.initiator != undefined) serviceViz.addInitiator(json.request.initiator)
    myApp.addPackage(json.request.method, json.request.type, json.request.requestId, json.request.services[0]);


  }
};

//LISTEN to new messages with the function created
ws.addEventListener("message", onmessage);


//RESET ALL CONFIGURATION
function reset() {
  allPackets = [];
  particleCount = 0;
  particles.setDrawRange(0, particleCount);
  particleIndex = 0;
  positionPerService.clear();
  textPerService.clear();
  indexPerService.clear();
  lastRegisteredPerService.clear();
}

//CREATE a random position
function random3DPosition(magnitude) {
  return new THREE.Vector3(
    (-1 + Math.random() * 2) * magnitude,
    (-1 + Math.random() * 2) * magnitude,
    (1 + Math.random() * 1) * magnitude
  );
}

//ADD PARTICLE:
//set the position for a group of particles according to the service
function addParticle(service, vec3, packetSize) {
  let i = particleIndex;
  particlePositions[i * 3] = vec3.x;
  particlePositions[i * 3 + 1] = vec3.y;
  particlePositions[i * 3 + 2] = vec3.z;
  particleAlphas[i] = 0.8;
  particlesData[i].lifetime = 500;
  let scale = (60.0 * 700) / packetSize;
  particlesData[i].velocity = new THREE.Vector3(
    (-0.4 + Math.random() * 0.8) * scale,
    (-0.4 + Math.random() * 0.8) * scale,
    (-0.4 + Math.random() * 0.8) * scale
  );
  particlesData[i].service = service;
  particleIndex++;
  if (particleIndex >= maxParticleCount) {
    particleIndex = 0;
  }
  particleCount++;
  if (particleCount > maxParticleCount) {
    particleCount = maxParticleCount;
  }
  particles.setDrawRange(0, particleCount);
}


//NOT USED
let textMaterialDefault = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.7,
});
let textMaterialActive = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.9,
});

//Create a 3d text
// take the service and its position
// 
function createText(service, servicePos) {

  let material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });
  let geometry = new THREE.TextGeometry(service, {
    font: font,
    size: 50,
    height: 0.001,
    curveSegments: 2,
    bevelEnabled: true,
    bevelSize: 0.1,
    bevelOffset: 0.1,
    bevelSegments: 1,
  });

  let textMesh = new THREE.Mesh(geometry, material);
  textMesh.position.copy(servicePos);
  let textObj = {
    mesh: textMesh,
    service: service,
    lifetime: 0.5,
  };
  particlesTextObjects.push(textObj);
  particles_group.add(textMesh);
  textPerService.set(service, textObj);
}

//Update the life time of the text
function updateText(service) {
  let text = textPerService.get(service);
  if (text) {
    if (text.lifetime < 0.5) {
      text.lifetime = 0.5;
    } else if (text.lifetime < 2.0) {
      text.lifetime *= 1.005;
    }
  }
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
    window.innerWidth / 1220,
    1,
    4000
  );
  camera.position.z = 1750;

  // var controls = new OrbitControls(camera, container);
  // controls.minDistance = 1000;
  // controls.maxDistance = 3000;

  scene = new THREE.Scene();

  // GLOBE
  countryLayers = generateCountries();
  scene.add(countryLayers);
  countryLayers.position.set(0, 0, 1690);

  countries = countryLayers.countries;

  scene.fog = new THREE.Fog(0xfafafa, 40, 2000);
  const light = new THREE.HemisphereLight(0xffffff, 0x555555, 0.7);
  scene.add(light);

  if (options.lightHelpers) {
    let helper = new THREE.HemisphereLightHelper(light, 5);
    scene.add(helper);
  }

  // END GLOBE

  particles_group = new THREE.Group();
  scene.add(particles_group);

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

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,

    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    vertexColors: true,
  });

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
        (-0.4 + Math.random() * 0.8) * scale,
        (-0.4 + Math.random() * 0.8) * scale,
        (-0.4 + Math.random() * 0.8) * scale
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
  particles.setAttribute(
    "size",
    new THREE.BufferAttribute(particleSizes, 1).setUsage(THREE.DynamicDrawUsage)
  );

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
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth / 2, 1220);
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild(renderer.domElement);

  // COMPOSER
  composer = new EffectComposer(renderer);

  // RENDER PASSES
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  glitchPass = new GlitchPass();
  composer.addPass(glitchPass);

  // bloomPass = new UnrealBloomPass();
  // bloomPass.strength = 1.5;
  // bloomPass.threshold = 1.0;
  // bloomPass.radius = 1.1;
  // composer.addPass(bloomPass);

  // Anti-aliasing while using EffectComposer requires a dedicated anti-aliasing pass
  smaaPass = new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    1220 * renderer.getPixelRatio()
  );
  composer.addPass(smaaPass);

  //
  // stats = new Stats();
  // container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / 1220;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth / 2, 1220);
}

function rotateGlobe() {
  const keys = Object.keys(locations);
  const index = Math.floor(Math.random() * keys.length);
  let location = locations[keys[index]];
  let rotationDur = 1000;
  let newRotation = {
    x: 0,
    y: 0,
    z: 0,
  }


  if (countryShapes.hasOwnProperty(lastCountry)) {
    // Find the mesh with that name
    let mesh;
    for (let country of countries) {
      if (country.userData.name == lastCountry) {
        // project camera position from face normal
        let scale = 60;
        let faceIndex = 0;
        if (lastCountry === 'United States') {
          faceIndex = 2;
        }
        let pos = country.geometry.faces[faceIndex].normal;

        let rotX = circleRotation(new THREE.Vector3(1, 0, 0), pos);
        let rotY = circleRotation(new THREE.Vector3(0, 1, 0), pos);
        newRotation.x = rotX * -1;
        newRotation.y = rotY;
        // newRotation.x = pos.x;
        // newRotation.y = pos.y;
        // newRotation.z = pos.z;

      }
    }
  } else {
    // newRotation.x = Math.random() * Math.PI * 2 - Math.PI;
  }

  var from = {
    x: globeRotation.x,
    y: globeRotation.y,
    z: globeRotation.z,
  };

  let easing = easings[~~(Math.random() * easings.length)];

  var tween = new TWEEN.Tween(from)
    .to(newRotation, rotationDur)
    .easing(easing)
    .onUpdate(function (position) {
      globeRotation.set(position.x, position.y, position.z);
    })
    .onComplete(function () {
    })
    .start();

  let nextRotation = Math.random() * rotationDur * 0.5 + rotationDur + 10;
  setTimeout(rotateGlobe, nextRotation);
}

// rotateGlobe();

var lastUpdate = 0;

function animate() {
  let now = Date.now() * 0.001;
  let dt = now - lastUpdate;
  if (dt !== dt) {
    dt = 0;
  }

  // Update Globe
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

      const colorScale = 1 - Math.pow((1 - country.userData.scaleFollower), 2);

      country.material.color.setRGB(
        1.0,
        1.0 - colorScale,
        1.0 - colorScale / 1.5
      );
    } else {
      country.material.color.setHex(countryDarkColor);
    }
  }

  if (Math.random() > 0.99 && effectController.doRotation) {
    particles_rotation_counter = 0.5;
    const scale = 6.0;
    // TODO: Do a random direction with radius instead
    particles_rotation_vel.set(
      Math.random() * scale,
      Math.random() * scale,
      Math.random() * scale
    );
  }

  // Update rotation
  if (particles_rotation_counter > 0) {
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
    particleAlphas[i] *= 1.0 - dt * 0.8;
    if (particleData.service == activeService) {
      particleColors[i * 3] = activeParticleColor.r;
      particleColors[i * 3 + 1] = activeParticleColor.g;
      particleColors[i * 3 + 2] = activeParticleColor.b;
    } else {
      particleColors[i * 3] = 1.0;
      particleColors[i * 3 + 1] = 1.0;
      particleColors[i * 3 + 2] = 1.0;
    }

    if (particleData.lifetime <= 0) {
      particlePositions[i * 3 + 2] = 2000000; // Hide particle if it's dead
    } else {
      particleData.lifetime--;
    }
  }

  if (Math.random() > effectController.linesStayingProbability) {
    randomParticle = Math.floor(Math.random() * particleCount);
  }

  let alpha = 0.2;
  let numConnections = effectController.numConnections;
  let lineParticleIndex = particleIndex - numConnections * 2;
  if (lineParticleIndex < 0) {
    lineParticleIndex += particleCount;
  }

  if (particleCount > 2) {
    for (let i = 0; i < numConnections; i++) {
      if (i > particleCount) {
        // There are no eligible pairs
        break;
      }
      let particle1 = lineParticleIndex;
      let particle2 = (lineParticleIndex + 1) % particleCount;
      if (
        particlesData[particle1].lifetime <= 400 ||
        particlesData[particle2].lifetime <= 400
      ) {
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
  for (let text of particlesTextObjects) {
    if (text.service == activeService) {
      text.mesh.material.color.setHex(0xff0000);
    } else {
      text.mesh.material.color.setHex(0xffffff);
    }
    let timeSincePacket = now - lastRegisteredPerService.get(text.service);
    if (timeSincePacket < text.lifetime) {
      text.mesh.material.opacity = Math.sin(
        (1.0 - Math.pow(1.0 - timeSincePacket / text.lifetime, 2.0)) * Math.PI
      );
      text.mesh.visible = true;
    } else {
      text.mesh.visible = false;
      text.lifetime = 0;
    }
    // if(showText) {
    //   textMaterialDefault.opacity = 0.6;
    //   textMaterialActive.opacity = 0.7;
    // } else {
    //   textMaterialDefault.opacity = 0.0;
    //   textMaterialActive.opacity = 0.0;
    // }
  }

  TWEEN.update();

  // Update camera
  // camera.position.set(cameraPosition.x + cameraOffset.x, cameraPosition.y + cameraOffset.y, cameraPosition.z + cameraOffset.z);
  // camera.lookAt(new THREE.Vector3(0, 0, 0));
  // countryLayers.rotation.copy(globeRotation);
  globeRotation.x = Math.sin(now * 0.3) * 0.6 + 0.2;
  globeRotation.y += dt * 0.5;
  countryLayers.rotation.set(globeRotation.x, globeRotation.y, globeRotation.z);

  // Update effects parameters
  // bloomPass.threshold = effectController.bloomPassThreshold;
  // bloomPass.strength = effectController.bloomPassStrength;
  // bloomPass.radius = effectController.bloomPassRadius;

  requestAnimationFrame(animate);

  // stats.update();
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
  for (let tm of particlesTextObjects) {
    tm.mesh.rotation.copy(textRotation);
  }
  particles_group.rotation.copy(particles_rotation);
  // renderer.render(scene, camera);
  composer.render();
}

function generateCountries() {
  var layer = new THREE.Object3D();
  var factor = 1;

  layer.scale.set(factor, factor, factor);

  var polygons = Object.keys(countryShapes).map(function (name) {
    const country = countryShapes[name];
    const geometry = new Map3DGeometry(country, 0.99);
    geometry.name = name;

    const material = new THREE.MeshPhongMaterial({
      wireframe: true,
      color: options.countries.color,
      transparent: options.countries.transparent,
      opacity: options.countries.opacityBaseLevel,
      shading: THREE.SmoothShading,
      shininess: 50,
    });
    const scale = 18; // + Math.random() / 2;
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

function circleRotation(vec1, vec2) {
  let cross = vec1.clone().cross(vec2);
  let dot = vec1.clone().dot(vec2);
  return Math.atan2(cross.length(), dot);
}