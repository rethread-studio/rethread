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
camera.position.z = 800;
let delta = 0;
const clock = new THREE.Clock();

var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.autoClearColor = false;
document.body.appendChild(renderer.domElement);

function roundedCornerLine(points, radius, smoothness, closed) {
  radius = radius !== undefined ? radius : 0.1;
  smoothness = smoothness !== undefined ? Math.floor(smoothness) : 3;
  closed = closed !== undefined ? closed : false;

  let geometry = new THREE.BufferGeometry();

  if (points === undefined) {
    console.log("RoundedCornerLine: 'points' is undefined");
    return geometry;
  }
  if (points.length < 3) {
    console.log(
      "RoundedCornerLine: 'points' has insufficient length (should be equal or greater than 3)"
    );
    return geometry.setFromPoints(points);
  }

  // minimal segment
  let minVector = new THREE.Vector3();
  let minLength = minVector.subVectors(points[0], points[1]).length();
  for (let i = 1; i < points.length - 1; i++) {
    minLength = Math.min(
      minLength,
      minVector.subVectors(points[i], points[i + 1]).length()
    );
  }
  if (closed) {
    minLength = Math.min(
      minLength,
      minVector.subVectors(points[points.length - 1], points[0]).length()
    );
  }

  radius = radius > minLength * 0.5 ? minLength * 0.5 : radius; // radius can't be greater than a half of a minimal segment

  let startIndex = 1;
  let endIndex = points.length - 2;
  if (closed) {
    startIndex = 0;
    endIndex = points.length - 1;
  }

  let curvePath = new THREE.CurvePath();

  for (let i = startIndex; i <= endIndex; i++) {
    let iStart = i - 1 < 0 ? points.length - 1 : i - 1;
    let iMid = i;
    let iEnd = i + 1 > points.length - 1 ? 0 : i + 1;
    let pStart = points[iStart];
    let pMid = points[iMid];
    let pEnd = points[iEnd];

    // key points
    let keyStart = new THREE.Vector3().subVectors(pStart, pMid).normalize();
    let keyMid = pMid;
    let keyEnd = new THREE.Vector3().subVectors(pEnd, pMid).normalize();

    let halfAngle = keyStart.angleTo(keyEnd) * 0.5;

    let keyLength = radius / Math.tan(halfAngle);

    keyStart.multiplyScalar(keyLength).add(keyMid);
    keyEnd.multiplyScalar(keyLength).add(keyMid);

    curvePath.add(new THREE.QuadraticBezierCurve3(keyStart, keyMid, keyEnd));
  }

  let curvePoints = curvePath.getPoints(smoothness);

  let fullPoints = [];
  if (!closed) {
    fullPoints.push(points[0]);
  }
  fullPoints = fullPoints.concat(curvePoints);
  if (!closed) {
    fullPoints.push(points[points.length - 1]);
  } else {
    fullPoints.push(fullPoints[0].clone());
  }

  return geometry.setFromPoints(fullPoints);
}

let fingerPrints = [];
let headers = [];
const values = {};
const points = [];
const points_geometry = new THREE.Geometry();
var particle_system_material = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1
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
  }
});

var material = new THREE.LineDashedMaterial({ color: 0xffffff, linewidth: 1 });
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
  var smoothness = 12;
  line.geometry = roundedCornerLine(p, radius, smoothness, false);
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
  if (particleSystem) {
    particleSystem.rotateY(delta * 0.1);
    line.rotateY(delta * 0.1);
  }
  evolveSmoke();
  renderer.render(scene, camera);
}
animate();
