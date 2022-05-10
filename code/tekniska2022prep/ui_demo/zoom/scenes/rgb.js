class RGBScene {
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

    this.zoomImage.zoom(this.canvas.clientHeight / this.img.height).center();
    this.r = this.zoomImage.red();
    this.g = this.zoomImage.green();
    this.b = this.zoomImage.blue();
    return this;
  }

  async unload() {
    this.isDone = true;
    return this;
  }

  async render() {
    this.step++;

    const offset = this.r.offsetX - 15;
    this.r.offset(offset, this.r.offsetY);
    this.g.offset(offset, this.r.offsetY);
    this.b.offset(offset, this.b.offsetY);

    if (this.step % 3 == 0) {
      this.r.render({ clear: true });
    }
    if (this.step % 3 == 1) {
      this.g.render({ clear: true });
    }
    if (this.step % 3 == 2) {
      this.b.render({ clear: true });
    }

    if (offset <= 0) {
      this.isDone = true;

      if (this.cb) this.cb();
    }

    return this;
  }
}
