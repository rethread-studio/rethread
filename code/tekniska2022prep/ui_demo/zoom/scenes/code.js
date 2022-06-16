class CodeScene {
  constructor(canvas, img) {
    this.canvas = canvas;
    this.img = img;
    this.statementsToRender = [];
    this.executionTrace = [];

    this.codeExecutor = new CodeExecutor();
    this.codeExecutor.on("step", () => {
      this.onStep();
    });
    this.codeExecutor.on("statement", (data) => this.onStatement(data));
    this.codeExecutor.on("filter_end", () => this.onFilterEnd());

    this.zoomImage = new ZoomImage(img, this.canvas);
    if (window.socket) {
      window.socket.on("image", (image, callback) => {
        const img = document.createElement("img");
        img.src = image;
        img.onload = () => {
          img.width = img.naturalWidth;
          img.height = img.naturalHeight;
          this.zoomImage = new ZoomImage(img, this.canvas);
          console.log("received iamge");
        };
      });
    }
  }

  async init() {
    console.log("code init");
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
<div class="panel code-panel">
  <div id="execution" class="box"></div>
</div>
`;

    document.getElementById("content").innerHTML = content;

    let line_height = 20;
    let columns = 5;
    const execution = document.getElementById("execution");
    execution.style.lineHeight = `${line_height}px`;
    execution.style.columnCount = `${columns}`;
    execution.style.fontSize = "15px";
    this.numExecutionLinesPerColumn = Math.floor(
      execution.offsetHeight / line_height
    );
    this.numExecutionLines = this.numExecutionLinesPerColumn * columns;
    console.log(execution.offsetHeight);
    console.log("num lines: " + this.numExecutionLines);

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
    this.speed(1000);

    this.statementsToRender = [];

    // Run this in a loop to update the code listing, but return early if there's nothing to update.
    this.execInterval = setInterval(() => {
      if (this.statementsToRender.length == 0) return;

      const maxElement = 35;
      const execE = document.getElementById("execution");
      for (const current of this.statementsToRender.splice(
        this.statementsToRender.length - maxElement
      )) {
        for (const e of document.querySelectorAll("span.active")) {
          e.classList.remove("active");
        }
        const e = document.getElementById("code_" + current.id);
        if (e != null) {
          e.className = "active";
          e.setAttribute("value", CodeScene.renderValue(current.value));
        }

        let executionText = `${current.code}: ${CodeScene.renderValue(
          current.value
        )}`;
        this.executionTrace.push(executionText);
        // const newValueE = document.createElement("div");
        // newValueE.className = "value";
        // // newValueE.innerHTML = FilterScene.renderValue(current.value);
        // newValueE.innerHTML = `${current.code}: <strong>${CodeScene.renderValue(
        //   current.value
        // )}</strong>`;
        // execE.appendChild(newValueE);
        // if (execE.childElementCount > maxElement)
        //   execE.removeChild(execE.firstChild);
      }
      while (this.executionTrace.length - this.numExecutionLines > 0) {
        this.executionTrace.splice(0, this.numExecutionLinesPerColumn);
      }
      let allExecution = "";
      for (let et of this.executionTrace) {
        allExecution += '<pre><code class="language-javascript">';
        allExecution += et;
        allExecution += "</code></pre>";
        // allExecution += "<br/>";
      }
      execE.innerHTML = allExecution;

      hljs.highlightAll();
      // hljs.highlightElement(execE);

      execE.scrollTop = execE.scrollHeight;

      this.statementsToRender = [];
    }, 30);

    return this;
  }

  async unload() {
    //if (window.socket) window.socket.removeListener("zoom", this.zoom);
    if (window.socket) window.socket.removeListener("speed", this.speed);
    if (window.socket) window.socket.removeListener("filter", this.filter);
    if (window.socket) window.socket.removeListener("step", this.step);

    clearInterval(this.execInterval);

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

    let timeEstimate = Math.round(50000 / (value + 1));
  }

  step() {
    console.log("step");
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

    // if (window.socket)
    //   window.socket.emit("onStep", {
    //     index: this.codeExecutor.stepNum,
    //     total: this.nbStep(),
    //   });

    //this.centerToCurrentPixels(this.canvas, this.zoomImage);
  }

  onStatement(current) {
    this.statementsToRender.push(current);
  }

  onFilterEnd() {
    if (window.socket) window.socket.emit("stage", "filter_end");

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

    const progressText = document.querySelector("#progress .text");
    if (progressText == null) {
      return;
    }
    progressText.innerText = `Progress: ${
      this.codeExecutor.stepNum
    }/${total} (${((this.codeExecutor.stepNum / total) * 100).toFixed()}%)`;
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

    return this;
  }
}
