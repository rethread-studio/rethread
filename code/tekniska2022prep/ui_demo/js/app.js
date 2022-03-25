const socket = io();
const webcam = new Webcam(320, 0 /* automatic */);

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
  } else if (state == "RESET_BUTTON_ON") {
    document.querySelector(".camera").style.display = "block";
    document.querySelector(".snap img").style.display = "none";
  } else if (state == "IDLE") {
    document.querySelector(".idle").style.display = "block";
    document.querySelector(".camera").style.display = "none";
    document.querySelector(".snap img").style.display = "none";
  }
});
window.addEventListener(
  "load",
  () => {
    webcam.init();
  },
  false
);
