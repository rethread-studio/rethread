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
renderer.setClearColor(0xed560b, 1);
document.body.appendChild(renderer.domElement);

function roundedCornerLine(points, radius, smoothness, weight) {
  var nurbsControlPoints = [];
  var nurbsKnots = [];
  var nurbsDegree = 2; // quadratic
  for (let i = 0; i <= nurbsDegree; i++) {
    nurbsKnots.push(0);
  }
  for (let i = 0, j = points.length; i < j; i++) {
    nurbsControlPoints.push(
      new THREE.Vector4(
        points[i].x,
        points[i].y,
        points[i].z,
        i === 1 ? weight : 1
      )
    );
    let knot = (i + 1) / (j - nurbsDegree);
    nurbsKnots.push(THREE.Math.clamp(knot, 0, 1));
  }
  let nurbsCurve = new THREE.NURBSCurve(
    nurbsDegree,
    nurbsKnots,
    nurbsControlPoints
  );
  return new THREE.BufferGeometry().setFromPoints(
    nurbsCurve.getPoints(smoothness)
  );
}

let fingerPrints = [];
let headers = [];
const values = {};
const points = [];
const points_geometry = new THREE.Geometry();
var particle_system_material = new THREE.PointsMaterial({
  color: 0xc7cc00,
  size: 2
});
let particleSystem = null;
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
            Math.random() * 1000 - 500
          );
          points.push(values[v]);
        }
      }
    }
    points_geometry.setFromPoints(points);
    particleSystem = new THREE.Points(
      points_geometry,
      particle_system_material
    );
    scene.add(particleSystem);
    renderFingerPrint();
  }
});

var material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 5 });
var line = new THREE.Line(new THREE.BufferGeometry(), material);
scene.add(line);

function getRandomFingerPrint() {
  return fingerPrints[Math.floor(fingerPrints.length * Math.random())];
}

function renderFingerPrint() {
  if (fingerPrints.length == 0) {
    return;
  }
  const p = [];
  let fingerPrint = getRandomFingerPrint();
  const vs = fingerPrint.split(",");
  for (let i in vs) {
    let v = headers[i] + "_" + vs[i];
    p.push(values[v]);
  }
  var radius = 10;
  var smoothness = 1000;
  line.geometry = roundedCornerLine(p, radius, smoothness, 1);
}
renderFingerPrint();
setInterval(renderFingerPrint, 2500);

light = new THREE.DirectionalLight(0xeb2a00, 0.8);
light.position.set(-1, 0, 1);
scene.add(light);

const smokeTexture = new THREE.TextureLoader().load("data/Smoke-Element.png");
const smokeMaterial = new THREE.MeshLambertMaterial({
  color: 0xeb2a00,
  map: smokeTexture,
  transparent: true,
  opacity: 0.1
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
    smokeParticles[sp].rotation.z += delta * 0.2;
  }
}

function animate() {
  requestAnimationFrame(animate);
  delta = clock.getDelta();
  if (particleSystem) {
    particleSystem.rotateY(delta * 0.005);
    line.rotateY(delta * 0.005);
  }
  evolveSmoke();
  renderer.render(scene, camera);
}
animate();
