const socket = io();
const webcam = new Webcam(600, 0 /* automatic */);

socket.on("step", (step) => {
  if (appTimer == null || appTimer.isTimerActive()) return;
  if (!isFilterOn()) tunOnSpeed("SPEED3_BUTTON_ON");
  removeInterval();
  stepFilter(step.direction);
});

socket.on("state", (state) => {
  // IDLE, PICTURE, RESET_BUTTON_ON, SPEED1_BUTTON_ON, SPEED2_BUTTON_ON, SPEED3_BUTTON_ON
  // RESET_BUTTON_OFF, SPEED1_BUTTON_OFF, SPEED2_BUTTON_OFF, SPEED3_BUTTON_OFF
  if (appTimer == null || appTimer.isTimerActive()) return;

  if (state == "PICTURE") {
    showCamera();
    snapPicture();
    cleanAll();
  } else if (state == "RESET_BUTTON_OFF") {
    cleanAll();
    showCamera();
    appTimer.setTimer(5, () => {
      cleanAll();
      snapPicture();
    });
    objectsToRender.push(appTimer);
  } else if (state == "IDLE") {
    if (isFilterOn()) return;
    cleanAll();
    document.querySelector(".idle").style.display = "block";
  } else if (state == "SPEED1_BUTTON_ON" || state == "SPEED1_BUTTON_OFF") {
    if (state == "SPEED1_BUTTON_OFF") return;
    tunOnSpeed(state);
  } else if (state == "SPEED2_BUTTON_ON" || state == "SPEED2_BUTTON_OFF") {
    if (state == "SPEED2_BUTTON_OFF") return;
    tunOnSpeed(state);
  } else if (state == "SPEED3_BUTTON_ON" || state == "SPEED3_BUTTON_OFF") {
    if (state == "SPEED3_BUTTON_OFF") return;
    tunOnSpeed(state);
  }
});
window.addEventListener(
  "load",
  () => {
    webcam.init();
  },
  false
);

function preload() {
  photograph = loadImage("./img/portrait100.jpg");
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  frameRate(state.frameRate);

  //clarendon
  filtersToApply.push(
    { filter: brightnessFilterous, val: 0.1 },
    { filter: contrastFilterous, val: 0.1 },
    { filter: saturationFilterous, val: 0.15 }
  );

  //Moon
  // filtersToApply.push(
  //   { filter: grayscaleFilterous, val: 0.1 },
  //   { filter: contrastFilterous, val: -0.4 },
  //   { filter: brightnessFilterous, val: 0.1 }
  // );

  //Reyes
  // filtersToApply.push(
  //   { filter: sepiaFilterous, val: 0.1 },
  //   { filter: brightnessFilterous, val: -0.4 },
  //   { filter: contrastFilterous, val: 0.1 }
  // );

  objectsToRender = [];
  speed1 = {};
  speed2 = {};

  images = new Images(photograph, filtersToApply);
  filter = createFilter(images.getImages());

  objectsToRender.push(filter);

  appTimer = new AppTimer();

  speed1.render = () => {
    // images.renderFirstAndLastImage();
    images.renderFirstImage();
  };

  speed2.render = () => {
    images.renderFirstImage();
  };


  tunOnSpeed("SPEED1_BUTTON_ON");
}

function draw() {
  background(state.backgroundCol);
  drawAvailableSpaceBg();
  update();
  render();

}

