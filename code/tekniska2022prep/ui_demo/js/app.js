const socket = io();

socket.on("state", (state) => {
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
