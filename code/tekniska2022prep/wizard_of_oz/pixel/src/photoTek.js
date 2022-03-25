


function preload() {
    img = loadImage('./img/portrait100.jpg');
}

function setup() {

    canvas = createCanvas(windowWidth, windowHeight);
    canvas.mousePressed(handleClick);
    frameRate(state.frameRate);

    imagePixel = new ImagePixel(img, 100, 100, 600, 100);
    imagePixel.init();

}

function draw() {
    background(state.backgroundCol);

    imagePixel.update();
    imagePixel.render();
}

function handleClick() {
    const newTarget = createVector(mouseX, mouseY);
    imagePixel.setTarget(newTarget);
    imagePixel.setStatus(MOVE);
    imagePixel.setPixelsStatus(MOVE);
    imagePixel.resetCurrentPixel();
}

