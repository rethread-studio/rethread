var width = window.innerWidth;
var height = window.innerHeight;
var viewAngle = 75;
var nearClipping = 1;
var farClipping = 10000;
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(
  viewAngle,
  width / height,
  nearClipping,
  farClipping
);
camera.position.z = 1000;
let delta = 0;
const clock = new THREE.Clock();

var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.autoClearColor = false;
document.body.appendChild(renderer.domElement);

let fingerPrints = [];
let headers = [];
const values = {};
const points = [];
const points_geometry = new THREE.Geometry();
$.ajax({
  type: "GET",
  url: "data/amiunique-fp.min.csv",
  dataType: "text",
  success: function(data) {
    const t = data.split("\n");
    headers = t[0].split(",");
    fingerPrints = t.slice(1);
    for (let l of fingerPrints) {
      const vs = l.split(",");
      for (let i in vs) {
        let v = headers[i] + "_" + vs[i];
        if (values[v] == null) {
          values[v] = new THREE.Vector3(
            Math.random() * 1000 - 500,
            Math.random() * 1000 - 500,
            Math.random() * 1000 - 250
          );
          points.push(values[v]);
        }
      }
    }
    points_geometry.setFromPoints(points);
    var particleSystem = new THREE.Points(
      points_geometry,
      particle_system_material
    );
    scene.add(particleSystem);
  }
});



var material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 0.1 });
var particle_system_material = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1
});
var geometry = new THREE.BufferGeometry().setFromPoints([]);
var line = new THREE.Line(geometry, material);
scene.add(line);

function getRandomFingerPrint() {
  return fingerPrints[Math.floor(fingerPrints.length * Math.random())];
}

function renderFingerPrint() {
  if (fingerPrints.length == 0) {
    return;
  }
  const p = [];
  let fingerPrint = getRandomFingerPrint()
  const vs = fingerPrint.split(",");
  for (let i in vs) {
    let v = headers[i] + "_" + vs[i];
    p.push(values[v])
  }
  line.geometry = new THREE.BufferGeometry().setFromPoints(p);
  // line.geometry.rotateY(delta * 0.2);
}
setInterval(renderFingerPrint, 1000);

light = new THREE.DirectionalLight(0xffffff, 0.7);
light.position.set(-1, 0, 1);
scene.add(light);

const smokeTexture = new THREE.TextureLoader().load("data/Smoke-Element.png");
const smokeMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff,
  map: smokeTexture,
  transparent: true,
  opacity: 0.22
});
const smokeGeo = new THREE.PlaneGeometry(400, 400);
const smokeParticles = [];

for (p = 0; p < 150; p++) {
  var particle = new THREE.Mesh(smokeGeo, smokeMaterial);
  particle.position.set(
    Math.random() * 500 - 250,
    Math.random() * 500 - 250,
    Math.random() * 1000 - 100
  );
  particle.rotation.z = Math.random() * 360;
  scene.add(particle);
  smokeParticles.push(particle);
}

function evolveSmoke() {
  var sp = smokeParticles.length;
  while (sp--) {
    smokeParticles[sp].rotation.z += delta * 0.15;
  }
}

function animate() {
  requestAnimationFrame(animate);
  delta = clock.getDelta();
  // points_geometry.rotateZ(delta * 0.01);
  evolveSmoke();
  renderer.render(scene, camera);
}
animate();
