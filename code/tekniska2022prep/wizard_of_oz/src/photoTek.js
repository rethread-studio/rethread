


function preload() {
    img = loadImage('../img/portrait100.jpg');

}

function setup() {

    createCanvas(windowWidth, windowHeight);
    frameRate(state.frameRate);
    img.loadPixels();
    imagePixel = new ImagePixel(img, 100, 100, 600, 100);
    imagePixel.init();



}

function draw() {
    background(state.backgroundCol);
    const { x, y } = imagePixel.getPosition();
    image(img, x, y);
    imagePixel.render();

}

