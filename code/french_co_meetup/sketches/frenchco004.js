
var w, h 
var cnv
var x, y
var xoff, yoff
var step, stepx, stepy

function setup() {
    w = windowHeight
    h = windowHeight
    cnv = createCanvas(w, h);
    centerCanvas();
    colorMode(HSB, 360, 100, 100, 250);
    noFill();
    background(0, 0, 100)
    stroke(0, 0, 100);
    x = 0
    y = 0
    xoff = random() * 100
    yoff = random() * 100
    step = w / 11
    stepx = w / step
    stepy = h / step
    for (let i = 0; i < 1111; i++) {
        drawrandom()
    }
    frameRate(2)
}

function centerCanvas() {
    var x = (windowWidth - w) / 2;
    var y = (windowHeight - h) / 2;
    cnv.position(x, y);
}

function draw() {
    drawrandom()
}

var noisestep = 0.05
function drawrandom() {
    let x = Math.floor(noise(xoff) * stepx) * step
    xoff += noisestep
    let y = Math.floor(noise(yoff) * stepy) * step
    yoff += noisestep
    stroke(0, 0, 0); noFill()
    if (random() < 0.05) { noStroke(); fill(0, 100, 100) }
    block(x, y, step, step)
}

function block(x, y, step, step) {
    let size = random() * step
    let m = step - size
    x += m / 2
    y += m / 2
    rect(x, y, size, size)
}
