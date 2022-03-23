


function preload() {
    img = loadImage('./img/portrait100.jpg');
}

function setup() {

    canvas = createCanvas(windowWidth, windowHeight);
    canvas.mousePressed(handleClick);
    frameRate(state.frameRate);

    let size = { width: 100, height: 100 };
    //create images
    pixelImage = createFilledImage(img, { x: 100, y: 100 }, size, pixelSampleSize);
    empyImg1 = createEmptyImage({ x: 400, y: 100 }, size, pixelSampleSize, img, { filter: ERODE, val: [1] });
    empyImg2 = createEmptyImage({ x: 700, y: 100 }, size, pixelSampleSize, empyImg1.getCompleteImage(), { filter: GRAY, val: [1] });
    empyImg3 = createEmptyImage({ x: 1000, y: 100 }, size, pixelSampleSize, empyImg2.getCompleteImage(), { filter: BLUR, val: [0.9] });

    //create filters
    filter = new Filter(pixelImage, empyImg1, false, "hello", pixelSampleSize);
    filter.setImages([pixelImage, empyImg1, empyImg2, empyImg3]);
    filter.setPixelSampleSize(pixelSampleSize.width, pixelSampleSize.height);
    filter.setPixelSampleOut();
    filter.init();
    filter.setPosition(300, 300);
    filter.setCallBack(createParticle);

}

function draw() {
    background(state.backgroundCol);
    update();
    render();
    // filter.update();

}

function update() {
    updateParticles();
    removeCompleteParticles();
}

function handleClick() {
    if (intervalId == null) {
        createInterval();
    } else {
        removeInterval();
    }
}


