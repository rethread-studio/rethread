if (window.io) {
  window.socket = io();
}

let currentScene;
async function init() {
  document.getElementById("content").innerText = "";

  const backupImg = await loadImage("./img/portrait.jpg");
  const cE = document.getElementById("c");
  cE.width = window.innerWidth * 2;
  cE.height = window.innerHeight * 2;
  cE.style.width = "100%";

  const captureScene = new CaptureScene(cE, null);
  const img = await loadScene(captureScene);

  const zoomTransitionScene = new ZoomTransitionScene(cE, img, null);
  const rgbTransitionScene = new RGBScene(cE, img, null);
  await loadScene(Math.random() < 0 ? rgbTransitionScene : zoomTransitionScene);
  const filterScene = new FilterScene(cE, img);
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
