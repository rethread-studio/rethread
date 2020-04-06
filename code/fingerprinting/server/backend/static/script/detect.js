$(document).ready(() => {
  getFingerPrint((fingerprint) => {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let font of fingerprint.original['font-js'].split(',')) {
      ctx.font = "100px " + font;
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.strokeStyle = ctx.fillStyle;
      ctx.textAlign = "center";
      ctx.strokeText("Re|Threat", canvas.width / 2, canvas.height / 2);
      // ctx.fillText("Re|Threat", canvas.width/2, canvas.height/2);
    }
  });
});
