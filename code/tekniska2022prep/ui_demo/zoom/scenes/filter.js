class FilterScene {
  canvas = null;

  constructor(canvas, img) {
    this.canvas = canvas;
    this.img = img;

    this.codeExecutor = new CodeExecutor();
    this.codeExecutor.on("step", () => this.onStep());
    this.codeExecutor.on("filter_end", () => this.onFilterEnd());

    // this.zoomImage = new ZoomImage(img, this.canvas).zoom(
    //   this.canvas.clientHeight / this.img.height
    // );

    this.zoomImage = new ZoomImage(img, this.canvas).zoom(
      this.canvas.clientWidth / this.img.width
    );
  }

  async init() {
    this.canvas.height = window.innerHeight /*- window.innerHeight * 0.25*/ * 2;
    this.canvas.width = window.innerWidth * 1;
    this.canvas.style.width = "50%";
    this.canvas.style.height = "100%";

    this.onwheel = (e) => {
      let newZoom = this.zoomImage.scale * 1.1;
      if (e.deltaY < 0) {
        newZoom = this.zoomImage.scale * 0.9;
      }
      this.zoom(newZoom);
    };
    window.document.addEventListener("wheel", this.onwheel);
    if (window.socket) window.socket.emit("stage", "filter_start");
    if (window.socket)
      window.socket.on("zoom", (zoom) => this.zoom(parseInt(zoom)));
    if (window.socket)
      window.socket.on("speed", (speed) => this.speed(parseInt(speed)));
    if (window.socket)
      window.socket.on("filter", (filter) => this.selectFilter(filter));
    if (window.socket) window.socket.on("step", () => this.step());

    this.onKeydown = (e) => {
      if (e.key == "ArrowRight" || e.key == "LeftRight") {
        this.step();
      }
    };
    window.addEventListener("keydown", this.onKeydown);

    let content = `
<div class="panel right-panel">
  <div id="progress" class="progress">
    <div class="bar">
      <div class="fill"></div>
    </div>
    <div class="text">50%</div>
  </div>

  <div id="speed" class="progress">
    <div class="bar">
      <div class="fill"></div>
    </div>
    <div class="text"></div>
  </div>

  <div id="zoom" class="progress">
    <div class="bar">
      <div class="fill"></div>
    </div>
    <div class="text"></div>
  </div>

  <br><br>

  <div id="code" class="box">
    <div class="content" style="padding: 0">
      <div class="lines"></div>
      <pre><code></code></pre>
    </div>
  </div>
</div><div id="overlay"></div>`;

    document.getElementById("content").innerHTML = content;

    // document.getElementById("zoom-input").oninput = (e) => {
    //   this.zoom(parseInt(e.target.value));
    // };

    // document.getElementById("speed-input").oninput = (e) => {
    //   this.speed(parseInt(e.target.value));
    // };

    // document.getElementById("filter-input").onchange = (e) => {
    //   this.selectFilter(e.target.value);
    // };

    this.codeExecutor.init();
    this.selectFilter("contrast");
    this.zoom(0);
    this.speed(0);
    return this;
  }

  async unload() {
    if (window.socket) window.socket.removeListener("zoom", this.zoom);
    if (window.socket) window.socket.removeListener("speed", this.speed);
    if (window.socket) window.socket.removeListener("filter", this.filter);
    if (window.socket) window.socket.removeListener("step", this.step);

    window.document.removeEventListener("wheel", this.onwheel);
    window.removeEventListener("keydown", this.onKeydown);
    return this;
  }

  zoom(value) {
    const total = 1000;

    if (value < this.canvas.clientWidth / this.img.width)
      value = this.canvas.clientWidth / this.img.width;
    else if (value > total) value = total;

    if (value != this.zoomImage.scale) {
      const overlay = document.getElementById("overlay");
      clearTimeout(this.overlayTimeout);
      overlay.innerHTML = "The image is x" + Math.round(value) + " bigger";
      overlay.classList.add("active");
      this.overlayTimeout = setTimeout(() => {
        overlay.classList.remove("active");
        overlay.innerHTML = "";
      }, 3500);
    }

    this.zoomImage.zoom(value);
    this.centerToCurrentPixels();
    // document.getElementById("zoom-input").value = this.zoomImage.scale;

    document.querySelector("#zoom .text").innerText = `Zoom: x${Math.round(
      value
    )}`;

    document.querySelector("#zoom .fill").style.width = `${(
      (value / total) *
      100
    ).toFixed()}%`;
  }

  speed(value) {
    const total = 10000;

    if (value < 0) value = 0;
    else if (value > total) value = total;

    if (value != this.codeExecutor.jumpValue) {
      const overlay = document.getElementById("overlay");
      clearTimeout(this.overlayTimeout);
      overlay.innerHTML =
        "The processing is x" + Math.round(10000000 / value) + " time slower";
      overlay.classList.add("active");
      this.overlayTimeout = setTimeout(() => {
        overlay.innerHTML = "";
        overlay.classList.remove("active");
      }, 3500);
    }

    this.codeExecutor.jump(value);
    // document.getElementById("speed-input").value = value;

    document.querySelector("#speed .text").innerText = `Speed: x${Math.round(
      value
    )}`;
    document.querySelector("#speed .fill").style.width = `${(
      (value / total) *
      100
    ).toFixed()}%`;
  }

  step() {
    this.codeExecutor.runStep();
  }

  onStep() {
    const current = this.codeExecutor.getCurrent();
    if (current.ctx.i) this.codeExecutor.iterationIndex = current.ctx.i;

    if (current == null) return;

    if (window.socket)
      window.socket.emit("onStep", {
        index: this.codeExecutor.stepNum,
        total: this.nbStep(),
      });
    for (const e of document.querySelectorAll("span.active")) {
      e.classList.remove("active");
    }

    function renderValue(value) {
      if (value == null) return '';
      if (value.length) {
        return `${value.constructor.name}[${value.length}]`;
      }
      if (value instanceof Object) {
        return `${value.constructor.name}`;
      }
      return JSON.stringify(value);
    }

    
    const e = document.getElementById("code_" + current.id);
    if (e != null) {
      e.className = "active";
      // e.innerHTML = renderValue(current.value);
      console.log(current)
      e.setAttribute("value", renderValue(current.value));
      // e.innerText = current.value;
    }
    this.centerToCurrentPixels();
  }

  onFilterEnd() {
    this.zoom(0);
    if (window.socket) window.socket.emit("stage", "filter_end");
  }

  centerToCurrentPixels() {
    if (
      this.zoomImage.imgWidth - 1 > this.canvas.width ||
      this.zoomImage.imgHeight - 1 > this.canvas.height
    ) {
      const currentIndex = this.codeExecutor.iterationIndex / 4;
      const x = currentIndex % this.img.width;
      const y = Math.floor(currentIndex / this.img.width);

      const offsetX =
        this.canvas.width / 2 -
        (x * (this.zoomImage.scale / this.zoomImage.canvasRatio) +
          this.zoomImage.scale / this.zoomImage.canvasRatio / 2);
      const offsetY =
        this.canvas.height / 4 -
        (y * (this.zoomImage.scale / this.zoomImage.canvasRatio) +
          this.zoomImage.scale / this.zoomImage.canvasRatio / 2);

      this.zoomImage.offset(Math.min(offsetX, 0), Math.min(offsetY, 0));
    } else {
      this.zoomImage.offset(
        this.canvas.width / 2 - this.zoomImage.imgWidth / 2,
        this.canvas.height / 2 - this.zoomImage.imgHeight / 2
      );
    }
  }

  selectFilter(filterName) {
    if (!filters[filterName]) throw new Error(`Filter ${filterName} not found`);
    this.filter = filters[filterName];
    this.codeExecutor.runFilter(this.filter, this.zoomImage.changedPixels);
    this.renderCode();
  }

  async renderCode() {
    const sourceCode = this.filter.sourceCode
      .replace(/  /g, "\t")
      .replace(/for/g, "<span class='keyword for'>for</span>")
      .replace(/function/g, "<span class='keyword function'>function</span>")
      .replace(/if/g, "<span class='keyword if'>if</span>")
      .replace(/return/g, "<span class='keyword return'>return</span>")
      .replace(/const/g, "<span class='keyword const'>const</span>")
      .replace(/let/g, "<span class='keyword let'>let</span>");

    document.querySelector("#code pre code").innerHTML = sourceCode;

    document.querySelector("#code .lines").innerHTML = "";
    for (let i = 0; i < sourceCode.split("\n").length; i++)
      document.querySelector("#code .lines").innerHTML += `${i + 1}<br>`;
  }

  nbStep() {
    const nbStepStr =
      this.filter.nbStepStr.indexOf("<nb_pixel>") != -1
        ? this.filter.nbStepStr.replace(
            "<nb_pixel>",
            this.zoomImage.changedPixels.data.length / 4
          )
        : this.filter.nbStepStr;

    return eval(nbStepStr);
  }

  async renderProgress() {
    const total = this.nbStep();

    document.querySelector("#progress .text").innerText = `Progress: ${
      this.codeExecutor.stepNum
    }/${total} (${((this.codeExecutor.stepNum / total) * 100).toFixed()}%)`;
    document.querySelector("#progress .fill").style.width = `${(
      (this.codeExecutor.stepNum / total) *
      100
    ).toFixed()}%`;
  }

  async render() {
    this.renderProgress();
    this.zoomImage.render({
      lines: false,
      values: this.zoomImage.scale > 20 && this.zoomImage.scale < 100,
      subPixels: this.zoomImage.scale >= 85,
      picture: this.zoomImage.scale < 100,
      clear: true,
    });
    return this;
  }
}
