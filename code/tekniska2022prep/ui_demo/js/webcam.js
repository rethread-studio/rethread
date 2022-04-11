class Webcam {
  width;
  height;
  streaming = false;

  constructor(width, height) {
    this.height = height;
    this.width = width;
    this.video = document.querySelector("#webcam");
  }

  init(cb) {
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
      "canplay",
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
        }
        if (cb) cb();
      },
      false
    );
  }

  snap() {
    const canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    if (this.width && this.height) {
      canvas.width = this.width;
      canvas.height = this.height;
      context.drawImage(this.video, 0, 0, this.width, this.height);

      return canvas.toDataURL("image/png");
    }
  }
}
