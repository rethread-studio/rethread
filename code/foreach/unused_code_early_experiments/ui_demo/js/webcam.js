class Webcam {
  width;
  height;
  streaming = false;

  constructor(width, height, video) {
    this.height = height;
    this.width = width;
    this.video = video || document.createElement("video");
  }

  init(cb) {
    return new Promise((resolve) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          this.video.srcObject = stream;
          this.video.play();
        })
        .catch(function (err) {
          console.log("An error occurred: " + err);
        });

      this.video.addEventListener(
        "playing",
        (ev) => {
          if (!this.streaming) {
            this.height =
              this.video.videoHeight / (this.video.videoWidth / this.width);

            // Firefox currently has a bug where the height can't be read from
            // the video, so we will make assumptions if this happens.

            if (isNaN(this.height)) {
              this.height = this.width / (4 / 3);
            }

            this.video.setAttribute("width", this.width);
            this.video.setAttribute("height", this.height);
            this.streaming = true;

            setTimeout(() => {
              if (cb) cb(this.video);
              resolve(this.video);
            }, 100);
          }
        },
        false
      );
    });
  }

  stop() {
    this.video.pause();
    this.streaming = false;
  }

  snap() {
    if (!this.streaming) {
      throw new Error("Webcam is not initialized");
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = false;

    if (this.width && this.height) {
      canvas.width = this.width;
      canvas.height = this.height;
      context.drawImage(this.video, 0, 0, this.width, this.height);

      return canvas.toDataURL("image/jpeg");
    }
  }
}
