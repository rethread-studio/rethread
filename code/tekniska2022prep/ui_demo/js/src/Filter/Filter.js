const filterStatus = {
    "PAUSE": "pause",
    "FILTER": "filter",
    "COMPLETE": "complete"
}

class Filter {
    filterPos = 0;
    position = createVector(0, 0);
    size = { width: 300, height: 300 };
    status = filterStatus.FILTER;
    pixelSampleSize = null;
    images = [];
    padding = {
        top: 50,
        right: 20,
        left: 20,
        buttom: 50
    }

    margin = {
        top: 100,
    }

    filterCode;
    filterText;

    parameter;

    pixelSampleIn;
    pixelSampleOut;

    imageIn;
    imageOut;

    samplePos = createVector(0, 0);

    callBack = null;

    constructor() {

    }

    init() {
        //update pixel samples
        this.setImageIO(this.filterPos);
        this.updatePixelSamples();
        this.setPosition();
    }

    updatePixelSamples() {
        this.pixelSampleIn = this.imageIn.getImageSample();
        this.pixelSampleOut = this.imageOut.getImageCompleteSample();
        this.imageOut.copySample();
    }

    setCallBack(call) {
        this.callBack = call;
    }

    setImageIO(pos) {
        this.imageIn = this.images[pos];
        this.imageIn.setStatus(imageStatus.FILTERING);
        this.imageOut = this.images[pos + 1];
        this.imageOut.setStatus(imageStatus.FILTERING);
    }

    setPosition() {
        const posY = this.imageIn.getLowerPositionY() + this.margin.top;
        const posX = this.getMidPoint();
        this.position = createVector(posX, posY);
    }

    getMidPoint() {
        const size = this.imageIn.getSize()
        const posX1 = this.imageIn.getPosition().x + size.width;
        const posX2 = this.imageOut.getPosition().x;
        return posX2 - (posX2 - posX1) / 2;
    }

    setImages(images) {
        this.images = images;
    }


    setPixelSampleOut() {
        this.pixelSampleOut = createImage(this.pixelSampleSize.width, this.pixelSampleSize.height);
    }

    setPixelSampleSize(width, height) {
        this.pixelSampleSize = { width, height }
    }

    update() {
        //Check images status
        const imgStatus = this.imageOut.getStatus();
        this.updateFilterStep(imgStatus);
        this.updateImageStep(imgStatus);
        this.addParticles(this.imageIn);
        this.addParticles(this.imageOut);
        this.updateStatus();
    }

    addParticles(image) {
        // const col = color(255, 255, 255)
        const pixels = image.getSampleImagePixels();
        const { width, height } = image.getImageSampleSize();
        const { x: posLX, y: posLY } = image.getSamplePosition("LEFT");
        for (let i = 0; i < 4 * 5; i += 4) {
            const alpha = pixels[i + 2];
            this.callBack({ x: posLX, y: posLY }, { x: posLX, y: posLX }, color(255, 255, 255, alpha));
        }
    }

    updateStatus() {
        //TODO REFACTOR
        if (this.status != filterStatus.COMPLETE) return;
        //reset all images
        this.filterPos = 0;
        this.status = filterStatus.FILTER;
        this.resetImages();
        // this.updateFilterStep(this.status);
        this.setImageIO(this.filterPos);
        this.setPosition();
        this.updatePixelSamples();
    }

    resetImages() {
        this.images.forEach((image, i) => { if (i != 0) image.reset() });
    }

    updateFilterStep(status) {
        if (status != imageStatus.COMPLETE) return;
        this.setImagePosStep();
        this.setImageIO(this.filterPos);
        this.setPosition();
        this.updatePixelSamples();
    }

    setImagePosStep() {
        if (this.isFilterComplete()) return;
        this.filterPos = this.filterPos + 1;
    }

    isFilterComplete() {
        const isComplete = this.filterPos + 1 >= this.images.length - 1;
        if (isComplete) this.status = filterStatus.COMPLETE;
        return isComplete;
    }

    updateImageStep(status) {
        if (status != imageStatus.FILTERING) return;
        //STEP IMAGES
        this.imageIn.step();
        this.imageOut.step();
        //update pixel samples
        this.updatePixelSamples();
    }

    render() {
        this.renderImages();
        this.renderSqueleton();
        this.renderPixelSampleI();
        this.renderIConnection();
        this.renderPixelSampleO();
        this.renderOConnection();

    }

    renderImages() {
        this.images.forEach(sImage => sImage.render());
    }


    renderIConnection() {
        if (this.imageIn.isComplete()) return;
        strokeWeight(1);
        stroke(255);
        noFill();
        //left
        let { x: posLX, y: posLY } = this.imageIn.getSamplePosition("LEFT");
        line(posLX, posLY, this.position.x - this.pixelSampleIn.width - this.padding.left, this.position.y + this.padding.top);
        //right
        let { x: posX, y: posY } = this.imageIn.getSamplePosition("RIGHT");
        line(posX, posY, this.position.x - this.padding.left, this.position.y + this.padding.top);
    }

    renderOConnection() {
        if (this.imageOut.isComplete()) return;
        strokeWeight(1);
        stroke(255);
        noFill();
        //left
        let { x: posLX, y: posLY } = this.imageOut.getSamplePosition("LEFT");
        line(posLX, posLY, this.position.x + this.padding.left, this.position.y + this.padding.top);
        //right
        let { x: posX, y: posY } = this.imageOut.getSamplePosition("RIGHT");
        line(posX, posY, this.position.x + this.padding.left + this.pixelSampleOut.width, this.position.y + this.padding.top);
    }

    renderPixelSampleI() {
        if (this.pixelSampleIn == null) return
        this.pixelSampleIn.resize(100, 100);
        image(this.pixelSampleIn, this.position.x - this.pixelSampleIn.width - this.padding.left, this.position.y + this.padding.top);

    }

    renderPixelSampleO() {
        if (this.pixelSampleOut == null) return;
        this.pixelSampleOut.resize(100, 100);
        image(this.pixelSampleOut, this.position.x + this.padding.right, this.position.y + this.padding.top);

    }

    renderSqueleton() {
        strokeWeight(1);
        stroke(255);
        fill(51);
        rect(this.position.x - this.size.width / 2, this.position.y, this.size.width, this.size.width);
    }

    mouseClicked() {
        this.update();
    }

}