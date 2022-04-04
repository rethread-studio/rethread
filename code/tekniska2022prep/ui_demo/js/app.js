const socket = io();
const webcam = new Webcam(320, 0 /* automatic */);

socket.on("step", (step) => {
  removeInterval();
  stepFilter(step);
});
socket.on("state", (state) => {
  // IDLE, PICTURE, RESET_BUTTON_ON, SPEED1_BUTTON_ON, SPEED2_BUTTON_ON, SPEED3_BUTTON_ON
  // RESET_BUTTON_OFF, SPEED1_BUTTON_OFF, SPEED2_BUTTON_OFF, SPEED3_BUTTON_OFF
  document.querySelector(".current-state").innerHTML = state;
  document.querySelector(".idle").style.display = "none";

  document.querySelector(".camera").style.display = "none";
  document.querySelector(".snap img").style.display = "none";
  document.querySelector(".snap").style.display = "none";

  if (state == "PICTURE") {
    document.querySelector(".camera").style.display = "block";
    document.querySelector(".snap img").style.display = "none";
    snapPicture();
    cleanAll();
  } else if (state == "RESET_BUTTON_ON") {
    document.querySelector(".camera").style.display = "block";
      document.querySelector(".snap img").style.display = "none";
      appTimer.setTimer(5, () => {
        cleanAll();
        snapPicture();
      });
      objectsToRender.push(appTimer);
  } else if (state == "IDLE") {
    // document.querySelector(".idle").style.display = "block";
    // document.querySelector(".camera").style.display = "none";
    // document.querySelector(".snap img").style.display = "none";
  } else if (state == "SPEED1_BUTTON_ON") {
    tunOnSpeed(state);
  } else if (state == "SPEED2_BUTTON_ON") {
    tunOnSpeed(state);
  } else if (state == "SPEED3_BUTTON_ON") {
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
    images.renderFirstAndLastImage();
  };

  speed2.render = () => {
    images.renderFirstImage();
  };


}

function draw() {
  background(state.backgroundCol);
  update();
  render();
}

function tunOnSpeed(speed) {
  emptyObjectsToRender();
  emptyParticles();
  removeInterval();
  switch (speed) {
    case "SPEED1_BUTTON_ON":
      objectsToRender.push(speed1);
      break;
    case "SPEED2_BUTTON_ON":
      createPixelParticles(images.getFirstImage(), images.getLastImage());
      objectsToRender.push(speed2);
      break;
    case "SPEED3_BUTTON_ON":
      objectsToRender.push(filter);
      createInterval();
      break;
    default:
      break;
  }
}

function keyPressed() {
  cleanAll();


  switch (key) {
    case '1':
      objectsToRender.push(speed1);
      break;
    case '2':
      createPixelParticles(images.getFirstImage(), images.getLastImage())
      objectsToRender.push(speed2);
      break;
    case '3':
      objectsToRender.push(filter);
      createInterval();
      break;
    case 'r':
      document.querySelector(".camera").style.display = "block";
      document.querySelector(".snap img").style.display = "none";
      appTimer.setTimer(5, () => {
        cleanAll();
        snapPicture();
      });
      objectsToRender.push(appTimer);
      break;
    case 'p':
      snapPicture();
      break;
    case 'ArrowRight':
      objectsToRender.push(filter);
      stepFilter("next");
      break;

    case 'ArrowLeft':
      objectsToRender.push(filter);
      stepFilter("previous");
      break;

    default:
      //speed 1
      break;
  }
  return false;
}
