let canvas;
let nCurves = 200;
const Y_AXIS = 1;
const X_AXIS = 2;
let b1, b2, c1, c2;

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.mouseMoved(mouseListener);
    canvas.position(0, 0);
    // canvas.style("z-index", "-1");

    background(106, 113, 247);

    noStroke();

    mouseListener();
}


function draw() {

}

function mouseListener() {

    let from = color(106, 113, 247);
    let to = color(255, 0, 221);
    colorMode(RGB);
    let c = lerpColor(from, to, map(mouseX, 0, windowWidth, 0, 1));
    c.setBlue((map(mouseY, 0, windowHeight, 0, 255)));
    // background(c);
    let c1 = color(250, 208, 42);

    setGradient(0, 0, windowWidth, windowHeight, c, c1, X_AXIS);
}

function mouseMoved() {

}

function setGradient(x, y, w, h, c1, c2, axis) {
    noFill();

    if (axis === Y_AXIS) {
        // Top to bottom gradient
        for (let i = y; i <= y + h; i++) {
            let inter = map(i, y, y + h, 0, 1);
            let c = lerpColor(c1, c2, inter);
            stroke(c);
            line(x, i, x + w, i);
        }
    } else if (axis === X_AXIS) {
        // Left to right gradient
        for (let i = x; i <= x + w; i++) {
            let inter = map(i, x, x + w, 0, 1);
            let c = lerpColor(c1, c2, inter);
            stroke(c);
            line(i, y, i, y + h);
        }
    }
}