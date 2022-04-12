initBg();

hideAll();
showIdle();

const webcam = new Webcam(320, 0 /* automatic */);
webcam.init(() => {
  // capture();
});

const codeExecutor = new CodeExecutor(
  document.getElementById("parent-container"),
  [filters.contrast, filters.saturation]
);

function capture() {
  hideAll();
  document.querySelector(".capture").style.display = "";
  document.getElementById("parent-container").style.transform =
    "translateX(0%)";
  codeExecutor.contexts.original.clearRect(
    0,
    0,
    codeExecutor.contexts.original.width,
    codeExecutor.contexts.original.height
  );
  let snapTime = Math.round(button_map.PICTURE_TIME / 1000);
  document.querySelector(".timer").innerText = snapTime;
  let timerInterval = setInterval(() => {
    if (snapTime == 0) {
      snap();
      clearInterval(timerInterval);
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
  codeExecutor.current = null;
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
  codeExecutor.stepNum = 0;
  showAll();
  document.querySelector(".capture").style.display = "none";
  document.querySelector("#idle").style.display = "none";
  document.querySelector(".settings").style.display = "none";
  const img = webcam.snap();

  const ctx = codeExecutor.contexts.hex_image;
  ctx.font = "12px Serif";
  ctx.fillStyle = "#03A062";
  ctx.textAlign = "center";
  renderHexa(ctx, img, codeExecutor.canvas.hex_image.width);

  let filterIndex = 0;

  codeExecutor.runFilter(filters.capture).then(async () => {
    filterIndex++;
    await codeExecutor.setImage(img);

    while (
      (await nextFilter(filterIndex++, codeExecutor.filters.length + 2)) != null
    ) {
      codeExecutor.jump(0);
      await codeExecutor.runFilter();
    }
    hideAll();
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
  } else if (e.key == "ArrowRight") {
    codeExecutor.runStep();
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
    if (step.speed) {
      step.speed = Math.round(step.speed);
      const speed = Math.min(Math.pow(step.speed, 4.5), 1000);
      codeExecutor.jump(speed);
    }
    codeExecutor.runStep();
  });
}
