var options = {fonts: {extendedJsFonts: true}, excludes: {userAgent: true}}
$(document).ready(async () => {
    if (window.requestIdleCallback) {
        requestIdleCallback(function () {
            Fingerprint2.get(options, fpCallback)  
        })
    } else {
        setTimeout(function () {
            Fingerprint2.get(options, fpCallback)  
        }, 500)
    }
});

function fpCallback(components) {
    console.log(components)
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let font of components[28].value) {
        ctx.font = "100px " + font;
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.strokeStyle = ctx.fillStyle
        ctx.textAlign = "center";
        ctx.strokeText("Re|Threat", canvas.width/2, canvas.height/2);
        // ctx.fillText("Re|Threat", canvas.width/2, canvas.height/2);
    }
} 