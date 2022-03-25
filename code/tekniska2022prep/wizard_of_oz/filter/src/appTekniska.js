


function preload() {
    photograph = loadImage('./img/portrait100.jpg');
}

function setup() {

    canvas = createCanvas(windowWidth, windowHeight);
    // canvas.mousePressed(handleClick);
    frameRate(state.frameRate);

    filters.push(
        { filter: ERODE, val: [1] },
        { filter: GRAY, val: [1] },
        { filter: BLUR, val: [0.9] },
    );

    images = new Images(photograph, filters);
    filter = createFilter(images.getImages());

    objectsToRender = [];
    objectsToRender.push(filter);

    speed1 = {}
    speed1.render = () => {
        images.renderFirstAndLastImage();
    }

    speed2 = {}
    speed2.render = () => {
        images.renderFirstImage();
    }

}

function draw() {
    background(state.backgroundCol);
    update();
    render();
}

function handleClick() {
    if (intervalId == null) {
        createInterval();
    } else {
        removeInterval();
    }
}

function keyPressed() {
    emptyObjectsToRender();
    emptyParticles();
    removeInterval();
    switch (key) {
        case '1':
            objectsToRender.push(speed1);
            break;
        case '2':
            createPixelParticles(images.getFirstImage(), images.getLastImage())
            objectsToRender.push(speed2);
            break;
        case '3':
            objectsToRender.push(filter);
            createInterval();
            break;

        case '0':
            //show take photo
            //start count down
            break;

        default:
            //speed 1
            break;
    }
}

function keyReleased() {

    switch (key) {

        case '0':
            //accept photo update main photo in all
            //go to speed 1
            break;

        default:
            //speed 1
            break;
    }
}


