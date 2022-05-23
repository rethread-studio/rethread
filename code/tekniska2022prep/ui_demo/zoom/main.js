if (window.io) {
  window.socket = io();
}

let currentScene;
async function init() {
  document.getElementById("content").innerText = "";

  const backupImg = await loadImage("./img/portrait.jpg");
  const c1 = document.getElementById("c1");
  c1.width = window.innerWidth * 2;
  c1.height = window.innerHeight * 2;
  //cE.style.width = "100%";

  const c2 = document.getElementById("c2");
  c2.width = window.innerWidth * 2;
  c2.height = window.innerHeight * 2;

  const c3 = document.getElementById("c3");
  c3.width = window.innerWidth * 2;
  c3.height = window.innerHeight * 2;

  const captureScene = new CaptureScene(c1, null);
  const img = await loadScene(captureScene);

  const zoomTransitionScene = new ZoomTransitionScene(c1, img, null);
  const rgbTransitionScene = new RGBScene(c1, img, null);
  await loadScene(Math.random() < 0 ? rgbTransitionScene : zoomTransitionScene);
  const filterScene = new FilterScene(c1, c2, c3, img);
  await loadScene(filterScene);
}

async function loadScene(scene) {
  if (currentScene) await currentScene.unload();
  await scene.init();
  currentScene = scene;
  document.getElementById("content").className =
    "filter-" + scene.constructor.name;

  if (scene.cb !== undefined) {
    return new Promise((resolve) => {
      scene.cb = resolve;
    });
  }
}

async function animate() {
  window.requestAnimationFrame(animate);

  if (currentScene) currentScene.render();
}

window.addEventListener("keydown", (e) => {
  if (e.key == "i") {
    init();
  }
});

if (window.socket) window.socket.on("capture", () => {
  if(currentScene.name != "capture") {
    init();
  }
});
