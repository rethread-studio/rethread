initBg();

const webcam = new Webcam(320, 0 /* automatic */);
webcam.init(() => {
  capture();
});

const codeExecutor = new CodeExecutor(
  document.getElementById("parent-container"),
  Object.values(filters)
);

function displayCode() {
  document.querySelector("code").innerHTML =
    codeExecutor.currentFilter.sourceCode;
  document.querySelector(
    ".code .title"
  ).innerHTML = `Code: ${codeExecutor.currentFilter.name}`;
}
displayCode();

const elems = ["#parent-container", ".capture", "#execution", "#progress"];
function hideAll() {
  for (const e of elems) {
    document.querySelector(e).style.display = "none";
  }
}

function showAll() {
  for (const e of elems) {
    document.querySelector(e).style.display = "";
  }
}
function capture() {
  hideAll();
  document.querySelector(".capture").style.display = "";
  codeExecutor.currentFilter = codeExecutor.filters[0];
  document.getElementById("parent-container").style.transform =
    "translateX(0%)";
  let snapTime = 1;
  let timerInterval = setInterval(() => {
    document.querySelector(".timer").innerText = snapTime--;
    if (snapTime == 0) {
      snap();
      clearInterval(timerInterval);
    }
  }, 1000);
}

async function snap() {
  showAll();
  document.querySelector(".capture").style.display = "none";
  await codeExecutor.setImage(webcam.snap());
  codeExecutor.init();

  codeExecutor.runFilter().then(() => {
    render();
    codeExecutor.nextFilter();
    document.getElementById("parent-container").style.transform =
      "translateX(-33%)";
    displayCode();

    codeExecutor.init();
    codeExecutor.runFilter().then(() => render());
    step();
  });
  step();
}

// update options
codeExecutor.stopOn(document.getElementById("stop_on").value);
document.getElementById("stop_on").addEventListener("change", (e) => {
  codeExecutor.stopOn(document.getElementById("stop_on").value);
});
codeExecutor.jump(document.getElementById("jump").value);
document.getElementById("jump").addEventListener("change", (e) => {
  codeExecutor.jump(document.getElementById("jump").value);
});

function step() {
  codeExecutor.runStep();
  render();
}

let pause = true;
function play() {
  const int = document.getElementById("step_interval").value;
  // execute next step
  if (pause) return;
  setTimeout(() => {
    step();
    play();
  }, int);
}

window.addEventListener("keydown", function (e) {
  if (e.key == " ") {
    pause = !pause;
    if (!pause) play();
  } else if (e.key == "ArrowRight") {
    codeExecutor.runStep();
    render();
  }
});

if (io !== undefined) {
  const socket = io();
  socket.on("state", (state) => {
    if (state == "PICTURE") {
      snap();
    } else if (state == "RESET_BUTTON_OFF") {
      capture();
    }
  });
  socket.on("step", (step) => {
    codeExecutor.runStep();
  });
}
