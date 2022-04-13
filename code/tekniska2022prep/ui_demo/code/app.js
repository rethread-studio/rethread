const elems = [
  "#filters",
  ".capture",
  "#execution",
  "#idle",
  "#progress",
  ".settings",
];
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

function showIdle() {
  hideAll();
  document.querySelector("#idle").style.display = "";
}

function showCapture() {
  hideAll();
  document.querySelector(".capture").style.display = "";
}

function showFilter() {
  hideAll();
  document.querySelector("#filters").style.display = "";
  document.querySelector("#execution").style.display = "";
  document.querySelector("#progress").style.display = "";
}

function renderCode(filter) {
  const sourceCode = filter.sourceCode
    .replace(/for/g, "<span class='keyword for'>for</span>")
    .replace(/function/g, "<span class='keyword function'>function</span>")
    .replace(/if/g, "<span class='keyword if'>if</span>")
    .replace(/return/g, "<span class='keyword return'>return</span>")
    .replace(/const/g, "<span class='keyword const'>const</span>")
    .replace(/let/g, "<span class='keyword let'>let</span>");
  if (!filter) filter = codeExecutor.currentFilter;
  document.querySelector(".code .title").innerHTML = `Code: ${filter.name}`;
  document.querySelector("code").innerHTML = sourceCode;
  document.querySelector(".code .lines").innerHTML = "";
  for (let i = 0; i < sourceCode.split("\n").length; i++)
    document.querySelector(".code .lines").innerHTML += `${i + 1}<br>`;
}

function renderProgress(filter) {
  const nbStepStr =
    filter.nbStepStr.indexOf("<nb_pixel>") != -1
      ? filter.nbStepStr.replace(
          "<nb_pixel>",
          codeExecutor.original_pixels.data.length / 4
        )
      : filter.nbStepStr;

  const total = eval(nbStepStr);

  document.querySelector("#progress .text").innerText = `${
    codeExecutor.stepNum
  }/${total} (${((codeExecutor.stepNum / total) * 100).toFixed()}%)`;
  document.querySelector("#progress .fill").style.width = `${(
    (codeExecutor.stepNum / total) *
    100
  ).toFixed()}%`;
}

function renderHexa(ctx, str, maxWidth) {
  function splitMaxSize() {
    var lines = [],
      line = "",
      width = 0;
    for (let i = 0; i < str.length; i++) {
      const letter = str[i];
      const w = letter ? ctx.measureText(letter).width : 0;
      if (w) {
        width += w;
      }
      if (w && width < maxWidth) {
        line += letter;
      } else {
        lines.push(line);
        line = letter;
        width = w;
      }
    }
    lines.push(line);
    return lines;
  }
  const lines = splitMaxSize();
  for (let i = 0; i < 100; i++) {
    ctx.fillText(lines[i], maxWidth / 2, i * 12);
  }
}

function render(filter) {
  const current = codeExecutor.getCurrent();

  if (codeExecutor.transformed_pixels && codeExecutor.currentCxt())
    codeExecutor
      .currentCxt()
      .putImageData(codeExecutor.transformed_pixels, 0, 0);

  // progress
  renderProgress(filter);

  for (const e of document.querySelectorAll("span.active")) {
    e.classList.remove("active");
  }

  if (current == null) return;

  const e = document.getElementById("code_" + current.id);
  if (e != null) {
    e.setAttribute("value", current.value);
    e.className = "active";
  }

  renderState(filter);
}

function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
}

function renderMessage(message) {
  const overlayE = document.querySelector("#overlay_body");
  if (!overlayE) return;
  overlayE.innerHTML = message;
  overlayE.classList.add("active");
  setTimeout(() => {
    // overlayE.innerHTML = "";
    overlayE.classList.remove("active");
  }, 3500);
}

function renderState(filter) {
  const currentState = codeExecutor.getCurrent();
  if (currentState.ctx.i != null) {
    document.getElementById("transformation").innerHTML = `<div class="col">
    <div class="center">
      <div class="pixel" id="original_pixel"></div>
    </div>
    <span class="label">red:</span
    ><span class="r" id="o_r">N.A</span><br />
    <span class="label">green:</span
    ><span class="g" id="o_g">N.A</span><br />
    <span class="label">blue:</span
    ><span class="b" id="o_b">N.A</span>
  </div>
  <div class="col">
    <div class="center">
      <div class="pixel" id="transformed_pixel"></div>
    </div>
    <span class="r" id="t_r">N.A</span><br />
    <span class="g" id="t_g">N.A</span><br />
    <span class="b" id="t_b">N.A</span>
  </div>`;

    const o_r = codeExecutor.original_pixels.data[currentState.ctx.i];
    const o_g = codeExecutor.original_pixels.data[currentState.ctx.i + 1];
    const o_b = codeExecutor.original_pixels.data[currentState.ctx.i + 2];
    document.getElementById(
      "original_pixel"
    ).style.backgroundColor = `rgb(${o_r}, ${o_g}, ${o_b})`;
    document.getElementById("o_r").innerText = o_r;
    document.getElementById("o_g").innerText = o_g;
    document.getElementById("o_b").innerText = o_b;

    const r = codeExecutor.transformed_pixels.data[currentState.ctx.i];
    const g = codeExecutor.transformed_pixels.data[currentState.ctx.i + 1];
    const b = codeExecutor.transformed_pixels.data[currentState.ctx.i + 2];
    document.getElementById(
      "transformed_pixel"
    ).style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    document.getElementById("t_r").innerText = r;
    document.getElementById("t_g").innerText = g;
    document.getElementById("t_b").innerText = b;

    const leftCanvas = codeExecutor.previousCanvas();
    const leftPos = getOffset(leftCanvas);
    const width = leftCanvas.width;
    const height = leftCanvas.height;
    const rWidth = leftCanvas.clientWidth;
    const pSize = rWidth / width;
    const rightCanvas = codeExecutor.currentCanvas();
    const rightPos = getOffset(rightCanvas);

    const index = currentState.ctx.i / 4;
    const x = index % width;
    const y = Math.floor(index / width);

    const overlay = document.querySelector("#overlay");
    const overlayCanvas = document.querySelector("#canvas_overlay");
    overlayCanvas.width = overlay.clientWidth;
    overlayCanvas.height = overlay.clientHeight;
    const ctx = overlayCanvas.getContext("2d");
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (y < height) {
      ctx.beginPath();
      ctx.lineWidth = "3";
      ctx.strokeStyle = "#03A062";
      ctx.rect(leftPos.left + x * pSize, leftPos.top + y * pSize, pSize, pSize);
      ctx.rect(
        rightPos.left + x * pSize,
        rightPos.top + y * pSize,
        pSize,
        pSize
      );

      const oPOffset = getOffset(document.getElementById("original_pixel"));
      const tPOffset = getOffset(document.getElementById("transformed_pixel"));
      ctx.moveTo(
        leftPos.left + x * pSize + pSize,
        leftPos.top + y * pSize + pSize / 2
      );
      ctx.lineTo(oPOffset.left, oPOffset.top + 33.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(
        rightPos.left + x * pSize,
        rightPos.top + y * pSize + pSize / 2
      );
      ctx.lineTo(tPOffset.left + 67, tPOffset.top + 33.5);

      ctx.stroke();
    }
  } else {
    document.getElementById("transformation").innerHTML = "";
  }
  let content = ``;
  for (const i in currentState.ctx) {
    const className = i
      .replace(/\+/g, "")
      .replace(/\./g, "")
      .replace(/ /g, "_")
      .replace(/\[/g, "")
      .replace(/\]/g, "")
      .replace(/\(/g, "")
      .replace(/\)/g, "");

    const previousE = document.querySelector(".value." + className);
    const isNew =
      !previousE || previousE.innerHTML != renderValue(currentState.ctx[i]);

    content += `<span class="variable">${i}</span
      >=<span class="value ${className} ${isNew ? "new" : ""}">${renderValue(
      currentState.ctx[i]
    )}</span><br />`;
  }
  document.getElementById("state").innerHTML = content;
}

function renderValue(value) {
  if (Array.isArray()) {
    return `Array(${value.length})`;
  }
  if (value instanceof Object) {
    return `${value.constructor.name}(${Object.keys(value).length})`;
  }
  return JSON.stringify(value);
}
