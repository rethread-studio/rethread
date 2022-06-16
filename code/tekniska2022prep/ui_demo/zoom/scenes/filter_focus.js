class FilterScene {
  constructor(canvas, canvas2, canvas3, img) {
    this.canvas = canvas;
    this.img = img;
    this.total_pixels = img.width * img.height;

    this.codeExecutor = new CodeExecutor();
    this.codeExecutor.on("step", () => {
      this.onStep();
    });
    this.codeExecutor.on("filter_end", () => this.onFilterEnd());

    // this.zoomImage = new ZoomImage(img, this.canvas).zoom(
    //   this.canvas.clientHeight / this.img.height
    // );

    this.zoomImage = new ZoomImage(img, this.canvas);
    //this.zoomImage.zoom(
    //  this.canvas.clientWidth / this.img.width
    //);
  }

  async init() {
    this.canvas.height = window.innerHeight;
    this.canvas.width = window.innerWidth;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.left = "0px";
    this.canvas.style.zIndex = "0";

    const bg = document.getElementById("bg");
    bg.style.opacity = "1";

    this.onwheel = (e) => {
      let newSpeed = this.codeExecutor.jumpValue + 100;
      if (e.deltaY < 0) {
        newSpeed = this.codeExecutor.jumpValue - 100;
      }
      this.speed(newSpeed);
    };
    window.document.addEventListener("wheel", this.onwheel);

    if (window.socket) window.socket.emit("stage", "filter_start");
    //if (window.socket)
    //  window.socket.on("zoom", (zoom) => this.zoom(parseInt(zoom)));
    if (window.socket)
      window.socket.on("speed", (speed) => this.speed(parseInt(speed)));
    if (window.socket)
      window.socket.on("filter", (filter) => this.selectFilter(filter));
    if (window.socket)
      window.socket.on("step", () => {
        clearInterval(this.automaticStart);
        this.step();
      });

    this.onKeydown = (e) => {
      if (e.key == "ArrowRight" || e.key == "LeftRight") {
        this.step();
      }
    };
    window.addEventListener("keydown", this.onKeydown);

    // this.automaticStart = setInterval(this.step, 750);

    let content = `
<div class="panel right-panel">
  <div id="progress" class="progress">
    <div class="bar">
      <div class="fill"></div>
    </div>
  </div>
`;

    document.getElementById("content").innerHTML = content;

    const progress = document.getElementById("progress");
    this.progressInstructions = document.createElement("div");
    this.progressInstructions.classList.add("text");
    this.progressPixels = document.createElement("div");
    this.progressPixels.classList.add("text");
    let separator = document.createElement("div");
    separator.classList.add("text");
    separator.innerText = "|";
    progress.appendChild(this.progressInstructions);
    progress.appendChild(separator);
    progress.appendChild(this.progressPixels);
    separator = document.createElement("div");
    separator.classList.add("text");
    separator.innerText = "|";
    progress.appendChild(separator);

    const cpu_widget_container = document.createElement("div");
    cpu_widget_container.id = "cpu-widget-container";
    const cpu_text = document.createElement("span");
    cpu_text.innerText = "CPU";
    cpu_text.style.marginRight = "15px";
    cpu_widget_container.appendChild(cpu_text);
    const cpu_widget = document.createElement("div");
    cpu_widget.id = "cpu-widget";
    for (let i = 0; i < 8; i++) {
      const bar = document.createElement("div");
      bar.classList.add("cpu-bar");
      cpu_widget.appendChild(bar);
    }
    cpu_widget_container.appendChild(cpu_widget);

    progress.appendChild(cpu_widget_container);

    this.current_cpu_bar = 0;
    this.cpuWidgetInterval = () => {
      this.current_cpu_bar = Math.floor(Math.random() * 8);

      const cpu_bar = document.querySelector(
        `#cpu-widget :nth-child(${this.current_cpu_bar + 1})`
      );
      cpu_bar.style.height = `${Math.floor(Math.random() * 100)}%`;
    };
    setInterval(this.cpuWidgetInterval, 100);

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
    this.selectFilter("invert");
    this.zoom(1, this.canvas, this.zoomImage);
    this.speed(2941);

    // this.execInterval = setInterval(() => {
    //   if (this.statementsToRender.length == 0) return;

    //   const maxElement = 35;
    //   const execE = document.getElementById("execution");
    //   for (const current of this.statementsToRender.splice(
    //     this.statementsToRender.length - maxElement
    //   )) {
    //     for (const e of document.querySelectorAll("span.active")) {
    //       e.classList.remove("active");
    //     }
    //     const e = document.getElementById("code_" + current.id);
    //     if (e != null) {
    //       e.className = "active";
    //       e.setAttribute("value", FilterScene.renderValue(current.value));
    //     }

    //     const newValueE = document.createElement("div");
    //     newValueE.className = "value";
    //     // newValueE.innerHTML = FilterScene.renderValue(current.value);
    //     newValueE.innerHTML = `${
    //       current.code
    //     }: <strong>${FilterScene.renderValue(current.value)}</strong>`;
    //     execE.appendChild(newValueE);
    //     if (execE.childElementCount > maxElement)
    //       execE.removeChild(execE.firstChild);
    //   }
    //   execE.scrollTop = execE.scrollHeight;

    //   this.statementsToRender = [];
    // }, 30);

    return this;
  }

  async unload() {
    //if (window.socket) window.socket.removeListener("zoom", this.zoom);
    if (window.socket) window.socket.removeListener("speed", this.speed);
    if (window.socket) window.socket.removeListener("filter", this.filter);
    if (window.socket) window.socket.removeListener("step", this.step);

    clearInterval(this.execInterval);
    clearInterval(this.cpuWidgetInterval);

    window.document.removeEventListener("wheel", this.onwheel);
    window.removeEventListener("keydown", this.onKeydown);
    return this;
  }

  zoom(value, canvas, zoomImage) {
    const total = 1000;

    if (value < canvas.clientWidth / this.img.width)
      value = canvas.clientWidth / this.img.width;
    else if (value > total) value = total;

    /*
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
    */

    zoomImage.zoom(value);
    this.centerToCurrentPixels(canvas, zoomImage);
    // document.getElementById("zoom-input").value = this.zoomImage.scale;

    /*
    document.querySelector("#zoom .text").innerText = `Zoom: x${Math.round(
      value
    )}`;

    document.querySelector("#zoom .fill").style.width = `${(
      (value / total) *
      100
    ).toFixed()}%`;
    */
  }

  speed(value) {
    const total = 10000;

    if (value < 0) value = 0;
    else if (value > total) value = total;

    this.codeExecutor.jump(value);
    // document.getElementById("speed-input").value = value;
  }

  step() {
    this.codeExecutor.runStep();
  }

  static renderValue(value) {
    if (value == null) return "";
    if (value.length) {
      return `${value.constructor.name}[${value.length}]`;
    }
    if (value instanceof Object) {
      return `${value.constructor.name}`;
    }
    return JSON.stringify(value);
  }

  onStep() {
    const current = this.codeExecutor.getCurrent();
    if (current == null) return;

    if (current.ctx.i) this.codeExecutor.iterationIndex = current.ctx.i;

    if (window.socket)
      window.socket.emit("onStep", {
        index: this.codeExecutor.stepNum,
        total: this.nbStep(),
      });

    //this.centerToCurrentPixels(this.canvas, this.zoomImage);
  }

  onFilterEnd() {
    if (window.socket) window.socket.emit("stage", "filter_end");

    this.canvas.width = window.innerWidth * 2;
    this.canvas.height = window.innerHeight * 2;
    this.canvas.style.zIndex = "1";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.zoom(0, this.canvas, this.zoomImage);
    this.unload();
    // document.getElementById("content").innerHTML = "";
  }

  centerToCurrentPixels(canvas, zoomImage) {
    const currentIndex = this.codeExecutor.iterationIndex / 4;
    const x = currentIndex % this.img.width;
    const y = Math.floor(currentIndex / this.img.width);

    if (
      zoomImage.imgWidth - 1 > canvas.width ||
      zoomImage.imgHeight - 1 > canvas.height
    ) {
      let offsetX =
        canvas.width / 2 -
        (x * (zoomImage.scale / zoomImage.canvasRatio) +
          zoomImage.scale / zoomImage.canvasRatio / 2);
      let offsetY =
        canvas.height / 2 -
        (y * (zoomImage.scale / zoomImage.canvasRatio) +
          zoomImage.scale / zoomImage.canvasRatio / 2);

      if (offsetX < 0 && zoomImage.imgWidth + offsetX < canvas.width) {
        offsetX = zoomImage.imgWidth - canvas.width;
      }
      if (offsetY < 0 && zoomImage.imgHeight + offsetY < canvas.height) {
        offsetY = zoomImage.imgHeight - canvas.height;
      }

      zoomImage.offset(Math.min(offsetX, 0), Math.min(offsetY, 0));
    } else {
      zoomImage.offset(
        canvas.width / 2 - zoomImage.imgWidth / 2,
        canvas.height / 2 - zoomImage.imgHeight / 2
      );
    }
  }

  selectFilter(filterName) {
    if (!filters[filterName]) throw new Error(`Filter ${filterName} not found`);
    this.filter = filters[filterName];
    console.log(this.filter);
    this.codeExecutor.runFilter(this.filter, this.zoomImage.changedPixels);
    //this.codeExecutor.runFilter(this.filter, this.zoomImage2.changedPixels);
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

    const progressText = this.progressInstructions;
    if (progressText == null) {
      return;
    }
    // progressText.innerText = `Progress: ${
    //   this.codeExecutor.stepNum
    // }/${total} (${((this.codeExecutor.stepNum / total) * 100).toFixed()}%)`;
    let steps_done = this.codeExecutor.stepNum.toLocaleString("sv");
    let total_steps = total.toLocaleString("sv");
    progressText.innerText = `${steps_done}/${total_steps} instructions`;
    this.progressPixels.innerText = `${this.codeExecutor.pixelCount.toLocaleString(
      "sv"
    )}/${this.total_pixels.toLocaleString("sv")} pixels`;
    document.querySelector("#progress .fill").style.width = `${(
      (this.codeExecutor.stepNum / total) *
      100
    ).toFixed()}%`;
  }

  drawCurrentPixel(zoomImage) {
    if (this.codeExecutor && this.codeExecutor.iterationIndex != undefined) {
      const currentIndex = this.codeExecutor.iterationIndex / 4;
      const x = currentIndex % this.img.width;
      const y = Math.floor(currentIndex / this.img.width);
      const pX =
        x * (zoomImage.scale / zoomImage.canvasRatio) + zoomImage.offsetX;
      const pY =
        y * (zoomImage.scale / zoomImage.canvasRatio) + zoomImage.offsetY;

      zoomImage.ctx.rect(
        pX,
        pY,
        zoomImage.scale / zoomImage.canvasRatio,
        zoomImage.scale / zoomImage.canvasRatio
      );
      zoomImage.ctx.strokeStyle = "white";
      zoomImage.ctx.lineWidth = 3;
      zoomImage.ctx.stroke();
    }
  }

  async render() {
    this.renderProgress();
    this.zoomImage.render({
      lines: false,
      values: false,
      subPixels: false,
      picture: true,
      clear: true,
      pictureOpacity: 0.9,
    });

    // this.drawCurrentPixel(this.zoomImage);
    return this;
  }
}
