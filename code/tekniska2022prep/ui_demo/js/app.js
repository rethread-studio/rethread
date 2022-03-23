const socket = io();

socket.on("state", (state) => {
  // IDLE, PICTURE, RESET_BUTTON_ON, SPEED1_BUTTON_ON, SPEED2_BUTTON_ON, SPEED3_BUTTON_ON
  // RESET_BUTTON_OFF, SPEED1_BUTTON_OFF, SPEED2_BUTTON_OFF, SPEED3_BUTTON_OFF
  document.querySelector(".current-state").innerHTML = state;
});
window.addEventListener(
  "load",
  () => {
    const webcam = new Webcam(320, 0 /* automatic */);
    webcam.init();
  },
  false
);
