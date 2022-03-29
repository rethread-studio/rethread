const socket = io();
const webcam = new Webcam(320, 0 /* automatic */);

socket.on("step", (step) => {
  console.log(step);
});
socket.on("state", (state) => {
  // IDLE, PICTURE, RESET_BUTTON_ON, SPEED1_BUTTON_ON, SPEED2_BUTTON_ON, SPEED3_BUTTON_ON
  // RESET_BUTTON_OFF, SPEED1_BUTTON_OFF, SPEED2_BUTTON_OFF, SPEED3_BUTTON_OFF
  document.querySelector(".current-state").innerHTML = state;
  document.querySelector(".idle").style.display = "none";

  if (state == "PICTURE") {
    const image = webcam.snap();
    socket.emit("picture", image);
    document.querySelector(".camera").style.display = "none";
    document.querySelector(".snap img").style.display = "block";
    document.querySelector(".snap img").src = image;
    loadNewImage(image);
  } else if (state == "RESET_BUTTON_ON") {
    document.querySelector(".camera").style.display = "block";
    document.querySelector(".snap img").style.display = "none";
  } else if (state == "IDLE") {
    document.querySelector(".idle").style.display = "block";
    document.querySelector(".camera").style.display = "none";
    document.querySelector(".snap img").style.display = "none";
  } else if (state == "SPEED1_BUTTON_ON") {
    tunOnSpeed(state);
  } else if (state == "SPEED2_BUTTON_ON") {
    tunOnSpeed(state);
  } else if (state == "SPEED3_BUTTON_ON") {
    tunOnSpeed(state);

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

  filters.push(
    { filter: ERODE, val: [1] },
    { filter: GRAY, val: [1] },
    { filter: BLUR, val: [0.9] }
  );

  // pixels = filters.brightness.apply(this, [pixels, 0.1]);
  // pixels = filters.contrast.apply(this, [pixels, 0.1]);
  // pixels = filters.saturation.apply(this, [pixels, 0.15]);

  objectsToRender = [];
  speed1 = {};
  speed2 = {};

  images = new Images(photograph, filters);
  filter = createFilter(images.getImages());

  objectsToRender.push(filter);

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
