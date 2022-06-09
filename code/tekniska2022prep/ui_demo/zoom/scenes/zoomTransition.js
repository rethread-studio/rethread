class ZoomTransitionScene {
  canvas = null;

  constructor(canvas, img, cb) {
    this.canvas = canvas;
    this.img = img;
    this.cb = cb;
    this.zoomImage = new ZoomImage(img, this.canvas);
    this.zoomImage.zoom(1).center();
    this.zoomCoeff = 1.05;
    this.wasIn = false;
    this.move = true;
  }

  async init() {
    this.step = 0;
    this.isDone = false;

    if (window.socket) window.socket.emit("transition", "start");

    this.onKeydown = (e) => {
      if (e.key == "m") {
        this.move = true;
      }
      if (e.key == "n") {
        this.move = false;
      }
      if (e.key == "c") {
        this.zoomImage.zoom(1);
        this.zoomImage.center();
      }
    };
    window.addEventListener("keydown", this.onKeydown);
    // this.zoomImage.zoom(this.canvas.clientHeight / this.img.height).center();
    return this;
  }

  async unload() {
    if (window.socket) window.socket.emit("transition", "end");
    window.removeEventListener("keydown", this.onKeydown);
    this.isDone = true;
    return this;
  }

  async render() {
    if (this.move) {
      this.step++;

      this.zoomImage.zoom(this.zoomImage.scale * this.zoomCoeff); //.center();
      if (this.zoomCoeff < 1.0) {
        // slowly move towards the center
        // this.zoomImage.center(0.001);
      }
      console.log("zoom: " + this.zoomImage.scale);
    }
    this.zoomImage.render({
      clear: true,
      lines: this.zoomImage.scale > 25 && this.zoomImage.scale < 100,
      // values: this.zoomImage.scale > 30,
      values: false,
      subPixels: this.zoomImage.scale >= 100,
      picture: this.zoomImage.scale < 100,
    });

    if (this.zoomImage.scale >= 2500 && !this.wasIn) {
      this.wasIn = true;
      this.zoomCoeff = 0.95;
    } else if (this.wasIn && this.zoomImage.scale * this.zoomCoeff <= 1.1) {
      this.isDone = true;

      if (this.cb) this.cb();
    }

    return this;
  }
}
