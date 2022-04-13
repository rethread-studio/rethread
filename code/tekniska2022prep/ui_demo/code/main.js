initBg();

hideAll();
showIdle();

const webcam = new Webcam(320, 0 /* automatic */);
webcam.init(() => {
  capture();
});

const codeExecutor = new CodeExecutor(
  document.getElementById("parent-container"),
  [filters.contrast, filters.saturation]
);

function capture() {
  reset();
  showCapture();

  let snapTime = Math.round(button_map.PICTURE_TIME / 1000);
  document.querySelector(".timer").innerText = snapTime;
  let timerInterval = setInterval(() => {
    if (snapTime == 0) {
      clearInterval(timerInterval);
      if (!socket) snap();
    } else {
      document.querySelector(".timer").innerText = --snapTime;
    }
  }, 1000);
}

codeExecutor.on("filter_start", (filter) => {
  renderCode(filter);
  render(filter);
});
codeExecutor.on("filter_end", (filter) => render(filter));
codeExecutor.on("step", (filter) => render(filter));

async function nextFilter(index, total) {
  codeExecutor.stopFilter();
  codeExecutor.jump(0);
  return new Promise((resolve) => {
    if (index < total - 1)
      document.getElementById(
        "parent-container"
      ).style.transform = `translateX(-${(index * 100) / total}%)`;
    setTimeout(() => {
      const next = codeExecutor.nextFilter();
      if (next != null) codeExecutor.init();
      resolve(next);
    }, 1000);
  });
}

async function snap() {
  codeExecutor.stopFilter();
  showFilter();

  const img = webcam.snap();
  if (socket) socket.emit("picture", img);

  codeExecutor.stepNum = 0;

  const ctx = codeExecutor.contexts.hex_image;
  ctx.font = "12px Serif";
  ctx.fillStyle = "#03A062";
  ctx.textAlign = "center";
  ctx.clearRect(
    0,
    0,
    codeExecutor.canvas.hex_image.width,
    codeExecutor.canvas.hex_image.height
  );
  renderHexa(ctx, img, codeExecutor.canvas.hex_image.width);

  let filterIndex = 0;
  codeExecutor.runFilter(filters.capture).then(async () => {
    filterIndex++;
    await codeExecutor.setImage(img);

    while (
      (await nextFilter(filterIndex++, codeExecutor.filters.length + 2)) != null
    ) {
      codeExecutor.jump(0);
      document.getElementById("transformation").innerHTML = "";
      document
        .querySelector("#canvas_overlay")
        .getContext("2d")
        .clearRect(0, 0, 100000, 100000);
      await codeExecutor.runFilter();
    }

    // done
    if (socket) socket.emit("state", "DONE");

    document.getElementById("execution").style.display = "none";
    document.getElementById("progress").style.display = "none";
    document.getElementById("transformation").innerHTML = "";
    document
      .querySelector("#canvas_overlay")
      .getContext("2d")
      .clearRect(0, 0, 100000, 100000);
    setTimeout(() => {
      document.getElementById("filters").className = "done";
    }, 500);
  });
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
  } else if (e.key == "r") {
    const values = new Array(12).fill(0);
    values[button_map.RESET_BUTTON] = 10000;
    socket.emit("serial", values.join(","));
    values[button_map.RESET_BUTTON] = 0;
    socket.emit("serial", values.join(","));
  } else if (e.key == "ArrowRight" || e.key == "LeftRight") {
    socket.emit("rotary", { direction: "R", value: 0 });
  }
});

function reset() {
  codeExecutor.stopFilter();
  codeExecutor.currentFilter = null;
  codeExecutor.transformed_pixels = null;
  codeExecutor.original_pixels = null;
  codeExecutor.contexts.original.clearRect(
    0,
    0,
    codeExecutor.canvas.original.width,
    codeExecutor.canvas.original.height
  );
  document.getElementById("parent-container").style.transform =
    "translateX(0%)";
  document.getElementById("filters").className = "";
  document.getElementById("transformation").innerHTML = "";
  document
    .querySelector("#canvas_overlay")
    .getContext("2d")
    .clearRect(0, 0, 100000, 100000);
  showIdle();
}

const socket = io();
socket.on("state", (state) => {
  if (state == "PICTURE") {
    if (webcam.streaming) snap();
  } else if (state == "IDLE") {
    reset();
  } else if (state == "RESET_BUTTON_OFF") {
    capture();
  }
});
socket.on("step", (step) => {
  if (step.speed) {
    step.speed = Math.round(step.speed);
    const speed = Math.min(Math.pow(step.speed, 4.5), 1000);
    codeExecutor.jump(speed);
  }
  codeExecutor.runStep();
});
