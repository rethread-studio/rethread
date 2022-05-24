class ZoomTransitionScene {
  canvas = null;

  constructor(canvas, img, cb) {
    this.canvas = canvas;
    this.img = img;
    this.cb = cb;
    this.zoomImage = new ZoomImage(img, this.canvas);
  }

  async init() {
    this.step = 0;
    this.isDone = false;

    if (window.socket) window.socket.emit("transition", "start");

    this.zoomImage.zoom(this.canvas.clientHeight / this.img.height).center();
    return this;
  }

  async unload() {
    if (window.socket) window.socket.emit("transition", "end");
    this.isDone = true;
    return this;
  }

  async render() {
    this.step++;

    this.zoomImage.zoom(this.zoomImage.scale * 1.05).center();
    this.zoomImage.render({
      clear: true,
      lines: this.zoomImage.scale > 25 && this.zoomImage.scale < 100,
      values: this.zoomImage.scale > 30,
      subPixels: this.zoomImage.scale >= 100,
      picture: this.zoomImage.scale < 100,
    });

    if (this.zoomImage.scale >= 1000) {
      this.isDone = true;

      if (this.cb) this.cb();
    }

    return this;
  }
}
