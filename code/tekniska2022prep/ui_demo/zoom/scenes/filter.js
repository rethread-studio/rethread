class FilterScene {
  constructor(canvas, canvas2, canvas3, img) {
    this.canvas = canvas;
    this.canvas2 = canvas2;
    this.canvas3 = canvas3;
    this.img = img;
    this.statementsToRender = [];

    this.codeExecutor = new CodeExecutor();
    this.codeExecutor.on("step", () => this.onStep());
    this.codeExecutor.on("statement", (data) => this.onStatement(data));
    this.codeExecutor.on("filter_end", () => this.onFilterEnd());

    // this.zoomImage = new ZoomImage(img, this.canvas).zoom(
    //   this.canvas.clientHeight / this.img.height
    // );

    this.zoomImage = new ZoomImage(img, this.canvas);
    //this.zoomImage.zoom(
    //  this.canvas.clientWidth / this.img.width
    //);

    this.zoomImage2 = new ZoomImage(img, this.canvas2);
    this.zoomImage3 = new ZoomImage(img, this.canvas3);
  }

  async init() {
    this.canvas.height = window.innerHeight /*- window.innerHeight * 0.25*/ * 1;
    this.canvas.width = window.innerWidth / 2;
    this.canvas.style.width = "25%";
    this.canvas.style.height = "50%";
    this.canvas.style.left = "20px";
    this.canvas.style.zIndex = "1";

    this.canvas2.height = window.innerHeight * 1;
    this.canvas2.width = window.innerWidth / 2;
    this.canvas2.style.width = "25%";
    this.canvas2.style.height = "50%";
    this.canvas2.style.left =
      window.innerWidth / 2 - this.canvas2.width / 4 + "px";
    this.canvas2.style.zIndex = "1";

    this.canvas3.height = window.innerHeight * 1;
    this.canvas3.width = window.innerWidth / 2;
    this.canvas3.style.width = "25%";
    this.canvas3.style.height = "50%";
    this.canvas3.style.right = "20px";
    this.canvas3.style.zIndex = "1";

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

  <br>

  <div id="code" class="box">
    <div class="content" style="padding: 0">
      <div class="lines"></div>
      <pre><code></code></pre>
    </div>
  </div>
  <div id="execution" class="box"></div>
</div>
<div id="overlay">
<div class="selected">Speed back in</div>
<br>
<div id="date_1"> 1837: Analytical Engine </div>
<div id="date_2"> 1940: Enigma </div>
<div id="date_3"> 1969: Apollo 11 </div>
<div id="date_4"> 1990: Internet </div>
<div id="date_5"> 2007: Touchscreen smartphones </div>
<br>
<img id="era_image" height=30%>
</div>`;

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
    this.zoom(0, this.canvas, this.zoomImage);
    this.zoom(15, this.canvas2, this.zoomImage2);
    this.zoom(60, this.canvas3, this.zoomImage3);
    this.speed(0);

    this.statementsToRender = [];

    this.execInterval = setInterval(() => {
      if (this.statementsToRender.length == 0) return;

      const maxElement = 15;
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
          e.setAttribute("value", FilterScene.renderValue(current.value));
        }

        const newValueE = document.createElement("div");
        newValueE.className = "value";
        // newValueE.innerHTML = FilterScene.renderValue(current.value);
        newValueE.innerHTML = `${current.code}: ${FilterScene.renderValue(
          current.value
        )}`;
        execE.appendChild(newValueE);
        if (execE.childElementCount > maxElement)
          execE.removeChild(execE.firstChild);
      }
      execE.scrollTop = execE.scrollHeight;

      this.statementsToRender = [];
    }, 10);

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

    if (value != this.codeExecutor.jumpValue) {
      const overlay = document.getElementById("overlay");
      clearTimeout(this.overlayTimeout);
      //let mhz = Math.round(10000000 / (value+1));
      //overlay.innerHTML =
      //  "The processing is x" + mhz + " times slower";
      overlay.classList.add("active");

      let dateNb = 1;
      let imageSrc =
        "https://inteng-storage.s3.amazonaws.com/img/iea/ZKwJepv36M/sizes/ada-n-the-machine_resize_md.jpg";
      if (value > total / 5) {
        // 1940: Enigma
        dateNb++;
        imageSrc =
          "https://2.bp.blogspot.com/-GG09AfmLSIM/WqHbU4aBrMI/AAAAAAABrL0/fGLsaQJ1kyYm1rG-yOUpqV4Lkfiqu9niACLcBGAs/s640/p00v2b0b.jpg";
      }
      if (value > (2 * total) / 5) {
        // 1969: Apollo 11
        dateNb++;
        imageSrc =
          "https://www.herodote.net/_image/margaret_hamilton1_apollo_maxi.jpg";
      }
      if (value > (3 * total) / 5) {
        // 1990: Internet
        dateNb++;
        imageSrc =
          "https://mediastream.cern.ch/MediaArchive/Photo/Public/1999/9902031/9902031_01/9902031_01-A5-at-72-dpi.jpg";
      }
      if (value > (4 * total) / 5) {
        // 2007: Touchscreen smartphones
        dateNb++;
        imageSrc =
          "https://i.cbc.ca/1.2883789.1419450784!/fileImage/httpImage/image.jpg_gen/derivatives/16x9_780/cellphone.jpg";
      }
      let theDate = document.getElementById("date_" + dateNb);
      theDate.classList.add("selected");

      for (let i = 1; i < 6; i++) {
        if (i != dateNb) {
          let otherDate = document.getElementById("date_" + i);
          otherDate.classList.remove("selected");
        }
      }

      document.getElementById("era_image").src = imageSrc;

      const speedE = document.getElementById("speed");
      if (!speedE.classList.contains("active")) {
        const rect = speedE.getBoundingClientRect();
        speedE.oTop = rect.top + "px";
        speedE.style.position = "fixed";
        speedE.style.top = rect.top + "px";
        setTimeout(() => {
          speedE.classList.add("active");
          speedE.style.top = "25px";
        }, 10);
      }
      this.overlayTimeout = setTimeout(() => {
        //overlay.innerHTML = "";
        overlay.classList.remove("active");
        setTimeout(() => {
          speedE.classList.remove("active");
          speedE.style.top = null;
          speedE.style.position = null;
        }, 50);
        speedE.style.top = speedE.oTop;
      }, 3500);
    }

    this.codeExecutor.jump(value);
    // document.getElementById("speed-input").value = value;

    let timeEstimate = Math.round(50000 / (value + 1));
    document.querySelector("#speed .text").innerText = `Speed: x${Math.round(
      value
    )} (${timeEstimate} seconds to complete)`;
    document.querySelector("#speed .fill").style.width = `${(
      (value / total) *
      100
    ).toFixed()}%`;
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
    this.centerToCurrentPixels(this.canvas2, this.zoomImage2);
    this.centerToCurrentPixels(this.canvas3, this.zoomImage3);
  }

  onStatement(current) {
    this.statementsToRender.push(current);
  }

  onFilterEnd() {
    this.zoom(0, this.canvas, this.zoomImage);
    if (window.socket) window.socket.emit("stage", "filter_end");
  }

  centerToCurrentPixels(canvas, zoomImage) {
    if (
      zoomImage.imgWidth - 1 > canvas.width ||
      zoomImage.imgHeight - 1 > canvas.height
    ) {
      const currentIndex = this.codeExecutor.iterationIndex / 4;
      const x = currentIndex % this.img.width;
      const y = Math.floor(currentIndex / this.img.width);

      const offsetX =
        canvas.width / 2 -
        (x * (zoomImage.scale / zoomImage.canvasRatio) +
          zoomImage.scale / zoomImage.canvasRatio / 2);
      const offsetY =
        canvas.height / 4 -
        (y * (zoomImage.scale / zoomImage.canvasRatio) +
          zoomImage.scale / zoomImage.canvasRatio / 2);

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
    this.zoomImage2.changedPixels = this.zoomImage.changedPixels;
    this.zoomImage3.changedPixels = this.zoomImage.changedPixels;
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

    document.querySelector("#code pre code").innerHTML = sourceCode;

    document.querySelector("#code .lines").innerHTML = "";
    for (let i = 0; i < sourceCode.split("\n").length; i++)
      document.querySelector("#code .lines").innerHTML += `${i + 1}<br>`;

    document.getElementById("execution").style.height =
      document.getElementById("code").clientHeight + "px";
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
    this.zoomImage2.render({
      lines: false,
      values: true,
      subPixels: false,
      picture: true,
      clear: true,
      pictureOpacity: 0.9,
      valuesOpacity: 0.8,
    });
    this.zoomImage3.render({
      lines: false,
      values: true,
      subPixels: false,
      picture: true,
      clear: true,
      pictureOpacity: 0.9,
      valuesOpacity: 0.8,
    });
    return this;
  }
}
