

function render() {
    //render filters
    //render images
    filter.render();
    renderParticles();
}

function renderParticles() {
    particles.forEach(particle => particle.render());
}

function updateParticles() {
    particles.forEach(particle => particle.update());
}

function removeCompleteParticles() {
    particles = particles.filter(particle => particleStatus.MOVING == particle.getStatus());
}

function createParticle(position, destination, color) {
    const particle = new Particle();
    particle.setPosition(position.x, position.y);
    particle.setDestination(destination.x, destination.y);
    particle.setColor(color);
    particle.init();
    particles.push(particle);
}



function createEmptyImage(position, size, sampleSize, _sampleImage, filter) {
    const emptyImage = new ImageSample();
    emptyImage.setPosition(position.x, position.y);
    emptyImage.setImage(null, size.width, size.height);
    emptyImage.setIsSqueletonVisible(true);
    emptyImage.setSampleSize(sampleSize.width, sampleSize.height);
    emptyImage.setCompleteImage(_sampleImage);
    emptyImage.filterImage(filter);
    return emptyImage;
}

function createFilledImage(_image, position, size, sampleSize) {
    const imageOut = new ImageSample();
    imageOut.setPosition(position.x, position.y);
    imageOut.setImage(_image, size.width, size.height);
    imageOut.setCompleteImage(_image, size.width, size.height);
    imageOut.setSampleSize(sampleSize.width, pixelSampleSize.height);
    imageOut.setLoadedPos(size.width, size.height);
    return imageOut;
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
