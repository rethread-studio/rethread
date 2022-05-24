class ZoomImage {
  opt = {
    imageMode: "canvas",
    colorLine: "#000000",
  };

  scale = 1;
  offsetX = 0;
  offsetY = 0;
  imgWidth = 0;
  imgHeight = 0;
  pixelData = [];

  constructor(img, canvas, opt) {
    this.img = img;
    this.canvas = canvas;

    this.canvasRatio = this.canvas.clientWidth / this.canvas.width;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.image(img);
  }

  image(img) {
    this.img = img;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.width;
    tmpCanvas.height = img.height;
    const tmpCtx = tmpCanvas.getContext("2d");

    tmpCtx.drawImage(img, 0, 0, img.width, img.height);
    this.pixelData = tmpCtx.getImageData(0, 0, img.width, img.height).data;
    this.changedPixels = tmpCtx.getImageData(0, 0, img.width, img.height);

    this.imgWidth = (this.img.width * this.scale) / this.canvasRatio;
    this.imgHeight = (this.img.height * this.scale) / this.canvasRatio;
    return this;
  }

  center() {
    this.offset(
      Math.floor(this.canvas.width / 2 - this.imgWidth / 2),
      Math.floor(this.canvas.height / 2 - this.imgHeight / 2)
    );
    return this;
  }

  offset(x, y) {
    this.offsetX = x;
    this.offsetY = y;
    return this;
  }

  setColor(x, y, color) {
    this.changedPixels.data[4 * (y * this.img.width + x) + 0] = color.r;
    this.changedPixels.data[4 * (y * this.img.width + x) + 1] = color.g;
    this.changedPixels.data[4 * (y * this.img.width + x) + 2] = color.b;
    this.changedPixels.data[4 * (y * this.img.width + x) + 3] =
      color.a === undefined ? 255 : color.a;
  }

  clone() {
    const o = new ZoomImage(this.img, this.canvas);
    o.zoom(this.scale);
    o.offset(this.offsetX, this.offsetY);
    return o;
  }

  red() {
    const o = this.clone();
    for (let i = 0; i < o.changedPixels.data.length; i += 4) {
      o.changedPixels.data[i] = 0;
      o.changedPixels.data[i + 1] = 0;
      o.changedPixels.data[i + 3] = 255 - o.changedPixels.data[i + 2];
    }
    return o;
  }

  blue() {
    const o = this.clone();
    for (let i = 0; i < o.changedPixels.data.length; i += 4) {
      o.changedPixels.data[i + 1] = 0;
      o.changedPixels.data[i + 2] = 0;
      o.changedPixels.data[i + 3] = 255 - o.changedPixels.data[i];
    }
    return o;
  }

  green() {
    const o = this.clone();
    for (let i = 0; i < o.changedPixels.data.length; i += 4) {
      o.changedPixels.data[i] = 0;
      o.changedPixels.data[i + 2] = 0;
      o.changedPixels.data[i + 3] = 255 - o.changedPixels.data[i + 1];
    }
    return o;
  }

  getColor(x, y) {
    return {
      r: this.changedPixels.data[4 * (y * this.img.width + x) + 0],
      g: this.changedPixels.data[4 * (y * this.img.width + x) + 1],
      b: this.changedPixels.data[4 * (y * this.img.width + x) + 2],
    };
  }

  zoom(scale, opt) {
    this.canvasRatio = this.canvas.clientWidth / this.canvas.width;

    if (scale > 10) scale = (0.5 + scale) | 0;

    this.imgWidth = (this.img.width * scale) / this.canvasRatio;
    this.imgHeight = (this.img.height * scale) / this.canvasRatio;

    if (opt?.center) {
      this.offsetX +=
        ((this.img.width * this.scale) / this.canvasRatio - this.imgWidth) / 2;
      this.offsetY +=
        ((this.img.height * this.scale) / this.canvasRatio - this.imgHeight) /
        2;
    }

    this.scale = scale;
    return this;
  }

  position(x, y) {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY,
    };
  }

  renderLines(opt) {
    const canvasScale = this.scale / this.canvasRatio;

    const lineOffsetX = this.offsetX % canvasScale;
    const lineOffsetY = this.offsetY % canvasScale;

    const startX = Math.max(this.offsetX, lineOffsetX);
    const endX = Math.min(this.canvas.width, this.imgWidth + this.offsetX);

    const startY = Math.max(this.offsetY, lineOffsetY);
    const endY = Math.min(this.canvas.height, this.imgHeight + this.offsetY);

    this.ctx.globalAlpha = opt?.linesOpacity || 1;

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.opt.colorLine;
    for (let i = startX; i < endX; i += canvasScale) {
      this.ctx.moveTo(i, startY);
      this.ctx.lineTo(i, endY);
    }
    for (let j = startY; j < endY; j += canvasScale) {
      this.ctx.moveTo(startX, j);
      this.ctx.lineTo(endX, j);
    }
    this.ctx.stroke();
  }

  renderSubPixel(opt) {
    const canvasScale = this.scale / this.canvasRatio;

    const lineOffsetX = this.offsetX % canvasScale;
    const lineOffsetY = this.offsetY % canvasScale;

    const startX = Math.max(this.offsetX, lineOffsetX);
    const endX = Math.min(this.canvas.width, this.imgWidth + this.offsetX);

    const startY = Math.max(this.offsetY, lineOffsetY);
    const endY = Math.min(this.canvas.height, this.imgHeight + this.offsetY);

    this.ctx.globalAlpha = opt?.subPixelOpacity || 1;

    if (!opt?.picture) {
      this.ctx.rect(0, 0, endX, this.canvas.height);
      this.ctx.fillStyle = "black";
      this.ctx.fill();
    }

    this.ctx.beginPath();
    // this.ctx.fillStyle = `rgb(0, 0, 0)`;
    // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let i = startX; i < endX; i += canvasScale) {
      const x = (i - this.offsetX) / canvasScale;
      for (let j = startY; j < endY; j += canvasScale) {
        const y = (j - this.offsetY) / canvasScale;

        const r = this.changedPixels.data[(y * this.img.width + x) * 4];
        const g = this.changedPixels.data[(y * this.img.width + x) * 4 + 1];
        const b = this.changedPixels.data[(y * this.img.width + x) * 4 + 2];

        if (opt?.subRed === true || (opt?.subRed === undefined && r)) {
          this.ctx.fillStyle = `rgb(${r}, 0, 0)`;
          this.ctx.fillRect(
            (0.5 + i + canvasScale * 0.05) | 0,
            (0.5 + j + canvasScale * 0.03) | 0,
            (canvasScale * 0.9) | 0,
            (canvasScale * 0.3) | 0
          );
        }
        if (opt?.subGreen === true || (opt?.subGreen === undefined && g)) {
          this.ctx.fillStyle = `rgb(0, ${g}, 0)`;
          this.ctx.fillRect(
            (0.5 + i + canvasScale * 0.05) | 0,
            (0.5 + j + canvasScale * 0.35) | 0,
            (0.5 + canvasScale * 0.9) | 0,
            (0.5 + canvasScale * 0.3) | 0
          );
        }
        if (opt?.subBlue === true || (opt?.subBlue === undefined && b)) {
          this.ctx.fillStyle = `rgb(0, 0, ${b})`;
          this.ctx.fillRect(
            (0.5 + i + canvasScale * 0.05) | 0,
            (0.5 + j + canvasScale * 0.66) | 0,
            (0.5 + canvasScale * 0.9) | 0,
            (0.5 + canvasScale * 0.3) | 0
          );
        }
        // if (opt?.subRed === true || (opt?.subRed === undefined && r)) {
        //   this.ctx.fillStyle = `rgb(${r}, 0, 0)`;
        //   this.ctx.fillRect(
        //     (0.5 + i + canvasScale * 0.03) | 0,
        //     (0.5 + j + canvasScale * 0.05) | 0,
        //     (0.5 + canvasScale * 0.3) | 0,
        //     (0.5 + canvasScale * 0.9) | 0
        //   );
        // }
        // if (opt?.subGreen === true || (opt?.subGreen === undefined && g)) {
        //   this.ctx.fillStyle = `rgb(0, ${g}, 0)`;
        //   this.ctx.fillRect(
        //     (0.5 + i + canvasScale * 0.35) | 0,
        //     (0.5 + j + canvasScale * 0.05) | 0,
        //     (0.5 + canvasScale * 0.3) | 0,
        //     (0.5 + canvasScale * 0.9) | 0
        //   );
        // }
        // if (opt?.subBlue === true || (opt?.subBlue === undefined && b)) {
        //   this.ctx.fillStyle = `rgb(0, 0, ${b})`;
        //   this.ctx.fillRect(
        //     (0.5 + i + canvasScale * 0.66) | 0,
        //     (0.5 + j + canvasScale * 0.05) | 0,
        //     (0.5 + canvasScale * 0.3) | 0,
        //     (0.5 + canvasScale * 0.9) | 0
        //   );
        // }
      }
    }
    this.ctx.stroke();
  }

  renderPicture() {
    if (settings.image.start && this.scale < settings.image.start) return;
    if (settings.image.end && this.scale > settings.image.end) return;

    const imgWidth = this.img.width * this.scale;
    const imgHeight = this.img.height * this.scale;
    const imgX = (0.5 + this.canvas.clientWidth / 2 - imgWidth / 2) | 0;
    const imgY = (0.5 + this.canvas.clientHeight / 2 - imgHeight / 2) | 0;

    img.style.left = `${imgX}px`;
    img.style.top = `${imgY}px`;
    img.style.transform = `this.scale(${this.scale})`;

    if (this.scale > settings.image.alfaStart)
      img.style.opacity =
        1 -
        opacity(this.scale, settings.image.alfaStart, settings.image.alfaEnd);
  }

  renderValues(opt) {
    const canvasScale = this.scale / this.canvasRatio;

    const lineOffsetX = this.offsetX % canvasScale;
    const lineOffsetY = this.offsetY % canvasScale;

    const startX = Math.max(this.offsetX, lineOffsetX);
    const endX = Math.min(this.canvas.width, this.imgWidth + this.offsetX);

    const startY = Math.max(this.offsetY, lineOffsetY);
    const endY = Math.min(this.canvas.height, this.imgHeight + this.offsetY);

    this.ctx.globalAlpha = opt?.valuesOpacity || 1;

    this.ctx.textAlign = "right";
    this.ctx.font = canvasScale * 0.3 + "px monospace";

    for (let i = startX; i < endX; i += canvasScale) {
      const x = (i - this.offsetX) / canvasScale;
      for (let j = startY; j < endY; j += canvasScale) {
        const y = (j - this.offsetY) / canvasScale;

        const r = this.changedPixels.data[(y * this.img.width + x) * 4];
        const g = this.changedPixels.data[(y * this.img.width + x) * 4 + 1];
        const b = this.changedPixels.data[(y * this.img.width + x) * 4 + 2];

        if (r != null) {
          this.ctx.fillStyle = `rgb(${r}, 0, 0)`;
          if (opt?.subPixels) {
            var yiq = (r * 299 + 0 * 587 + 0 * 114) / 1000;
            if (yiq >= 128) {
              this.ctx.fillStyle = "black";
            } else {
              this.ctx.fillStyle = "white";
            }
          }
          this.ctx.fillText(r, i + canvasScale * 0.95, j + canvasScale * 0.25);
        }
        if (g != null) {
          this.ctx.fillStyle = `rgb(0, ${g}, 0)`;
          if (opt?.subPixels) {
            var yiq = (0 * 299 + g * 587 + 0 * 114) / 1000;
            if (yiq >= 128) {
              this.ctx.fillStyle = "black";
            } else {
              this.ctx.fillStyle = "white";
            }
          }
          this.ctx.fillText(g, i + canvasScale * 0.95, j + canvasScale * 0.6);
        }
        if (b != null) {
          this.ctx.fillStyle = `rgb(0, 0, ${b})`;
          if (opt?.subPixels) {
            var yiq = (0 * 299 + 0 * 587 + b * 114) / 1000;
            if (yiq >= 128) {
              this.ctx.fillStyle = "black";
            } else {
              this.ctx.fillStyle = "white";
            }
          }
          this.ctx.fillText(b, i + canvasScale * 0.95, j + canvasScale * 0.95);
        }
      }
    }
  }

  renderPictureCanvas(opt) {
    const canvasScale = this.scale / this.canvasRatio;

    const imgWidth = this.img.width * canvasScale;
    const imgHeight = this.img.height * canvasScale;

    const tmp = document.createElement("canvas");
    tmp.width = this.img.width;
    tmp.height = this.img.height;

    const imageDataCopy = new ImageData(
      new Uint8ClampedArray(this.changedPixels.data),
      this.changedPixels.width,
      this.changedPixels.height
    );

    // if (opt?.onlyBlue) {
    //   for (let i = 0; i < imageDataCopy.data.length; i += 4) {
    //     imageDataCopy.data[i] = 0;
    //     imageDataCopy.data[i + 1] = 0;
    //     // imageDataCopy.data[i + 2] = 0;
    //     imageDataCopy.data[i + 3] = 255 - imageDataCopy.data[i + 2];
    //   }
    // } else if (opt?.onlyRed) {
    //   for (let i = 0; i < imageDataCopy.data.length; i += 4) {
    //     // imageDataCopy.data[i] = 0;
    //     imageDataCopy.data[i + 1] = 0;
    //     imageDataCopy.data[i + 2] = 0;
    //     imageDataCopy.data[i + 3] = 255 - imageDataCopy.data[i];
    //   }
    // } else if (opt?.onlyGreen) {
    //   for (let i = 0; i < imageDataCopy.data.length; i += 4) {
    //     imageDataCopy.data[i] = 0;
    //     // imageDataCopy.data[i + 1] = 0;
    //     imageDataCopy.data[i + 2] = 0;
    //     imageDataCopy.data[i + 3] = 255 - imageDataCopy.data[i + 1];
    //   }
    // }

    const tmpCtx = tmp.getContext("2d");
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.globalAlpha = opt?.pictureOpacity || 1;
    tmpCtx.putImageData(imageDataCopy, 0, 0);

    this.ctx.globalAlpha = opt?.pictureOpacity || 1;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tmp, this.offsetX, this.offsetY, imgWidth, imgHeight);
  }

  render(opt) {
    if (opt?.clear) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (opt?.picture !== false) this.renderPictureCanvas(opt);
    if (opt?.subPixels) this.renderSubPixel(opt);
    if (opt?.lines) this.renderLines(opt);
    if (opt?.values) this.renderValues(opt);
    return this;
  }
}
