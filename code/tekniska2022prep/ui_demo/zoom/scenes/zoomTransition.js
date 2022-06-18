class ZoomTransitionScene {
  canvas = null;

  constructor(canvas, img, cb) {
    this.canvas = canvas;
    this.img = img;
    this.cb = cb;
    this.zoomImage = new ZoomImage(img, this.canvas);
    this.zoomImage.zoom(1).center();
    this.zoomCoeff = 1.07;
    this.wasIn = false;
    this.move = true;
    this.phase = 0.0;
    this.startScale = 1;
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

      let max_zoom = 500;
      let end_zoom = window.full_size_zoom(this.canvas, this.img);
      let new_zoom = Math.cos(this.phase * Math.PI * 2 + Math.PI) * 0.5 + 0.5;
      new_zoom = Math.pow(new_zoom, 2.0);
      if (this.phase < 0.5) {
        new_zoom = new_zoom * (max_zoom - this.startScale) + this.startScale;
      } else {
        new_zoom = new_zoom * (max_zoom - end_zoom) + end_zoom;
      }

      this.zoomImage.zoom(new_zoom).center();
      // this.zoomImage.zoom(this.zoomImage.scale * this.zoomCoeff).center();
      let full_size_zoom = window.full_size_zoom(this.canvas, this.img);
      if (this.zoomCoeff < full_size_zoom) {
        // slowly move towards the center
        this.zoomImage.center(0.0001);
      }
      console.log("zoom: " + this.zoomImage.scale);
    }
    this.zoomImage.render({
      clear: true,
      lines: this.zoomImage.scale > 25 && this.zoomImage.scale < 100,
      // values: this.zoomImage.scale > 300,
      values: false,
      subPixels: this.zoomImage.scale >= 100,
      picture: this.zoomImage.scale < 100,
    });

    // let full_size_zoom = window.full_size_zoom(this.canvas, this.img);
    // if (this.zoomImage.scale >= 500 && !this.wasIn) {
    //   this.wasIn = true;
    //   this.zoomCoeff = 0.93;
    // } else if (
    //   this.wasIn &&
    //   this.zoomImage.scale * this.zoomCoeff <= full_size_zoom
    // ) {
    //   this.isDone = true;

    //   if (this.cb) this.cb();
    // }

    if (this.phase > 1.0) {
      this.isDone = true;
      if (this.cb) this.cb();
    }

    this.phase += 1.0 / (60 * 7);
    return this;
  }
}
