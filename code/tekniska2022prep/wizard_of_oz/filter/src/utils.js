

function render() {

    objectsToRender.forEach(obj => obj.render());
    renderParticles();
}

function update() {
    updateParticles();
}

function renderParticles() {
    particles.forEach(particle => particle.render());
}

function updateParticles() {
    particles.forEach(particle => particle.update());
    removeCompleteParticles();
}

function removeCompleteParticles() {
    particles = particles.filter(particle => particleStatus.MOVING == particle.getStatus());
}

function emptyParticles() {
    particles = [];
}

function emptyObjectsToRender() {
    objectsToRender = [];
}

function createParticle(position, destination, color) {
    const particle = new Particle();
    particle.setPosition(position.x, position.y);
    particle.setDestination(destination.x, destination.y);
    particle.setColor(color);
    particle.init();
    particles.push(particle);
}

function createFilter(_images) {
    const newFilter = new Filter();
    newFilter.setImages(_images);
    newFilter.setPixelSampleSize(state.sampleSize, state.sampleSize);
    newFilter.setPixelSampleOut();
    newFilter.init();
    newFilter.setCallBack(createParticle);

    return newFilter;
}

function createPixelParticles(imgRefI, imgRefO) {
    const imgI = imgRefI.getCompleteImage();
    const imgO = imgRefO.getCompleteImage();
    imgI.loadPixels();
    imgO.loadPixels();
    const pixelI = imgI.pixels;
    const pixelO = imgO.pixels;
    const imgPixelSize = imgI.width * 4 * imgI.height;

    let x = 0, y = 0;
    for (let i = 0; i < imgPixelSize; i += 4) {
        let r = pixelI[i], g = pixelI[i + 1], b = pixelI[i + 2];
        let rO = pixelO[i], gO = pixelO[i + 1], bO = pixelO[i + 2];
        x = (i / 4) % imgI.width;
        y = (i / 4) % imgI.height == 0 && i != 0 ? y + 1 : y;
        const colorI = color(r, g, b);
        const colorO = color(rO, gO, bO);
        const velocity = createVector(random(20, 30), random(-5, 5));
        const particle = new PixelParticle(
            createVector(x, y).add(imgRefI.getPosition()),
            createVector(x, y).add(imgRefO.getPosition()),
            colorI,
            colorO,
            velocity);
        particles.push(particle);
    }
}



function createInterval() {
    intervalId = setInterval(updateFilter, state.intervalTime);
}

function removeInterval() {
    if (intervalId == null) return;
    clearInterval(intervalId);
    intervalId = null;
}

function updateFilter() {
    filter.update();
}
