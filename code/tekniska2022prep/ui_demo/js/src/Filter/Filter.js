const filterStatus = {
    "PAUSE": "pause",
    "FILTER": "filter",
    "COMPLETE": "complete"
}

class Filter {
    filterPos = 0;
    position = createVector(0, 0);
    size = { width: 200, height: 200 };
    status = filterStatus.FILTER;
    pixelSampleSize = null;
    images = [];
    padding = {
        top: 10,
        right: 10,
        left: 10,
        buttom: 50
    }


    margin = {
        top: 0,
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

    updateRemovePixelSample() {
        this.imageOut.removeSample();
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
        this.stepNext();
    }

    stepNext() {
        //Check images status
        const imgStatus = this.imageOut.getStatus();
        this.checkStatus(imgStatus);
        this.checkIfComplete(imgStatus);
        this.updateImageStep(imgStatus, "next");
        this.updatePixelSamples();
        this.addParticles(this.imageIn);
        this.addParticles(this.imageOut);
        this.updateStatus();
    }

    stepPrevious() {
        const imgStatus = this.imageOut.getStatus();
        this.updateRemovePixelSample();
        this.updateImageStep(imgStatus, "previous");
        this.addParticles(this.imageIn);
        this.addParticles(this.imageOut);
        this.updatePreviousStatus();
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
        if (this.status != filterStatus.COMPLETE) return;
        this.filterPos = 0;
        this.status = filterStatus.FILTER;
        this.resetImages();
        this.setImageIO(this.filterPos);
        this.setPosition();
        this.updatePixelSamples();
    }

    updatePreviousStatus() {

        if (this.isFirstStep()) {
            this.completeAllImage();
            this.filterPos = this.images.length - 2;
            this.setImageIO(this.filterPos);
            this.imageOut.setLastPosition();
            this.imageIn.setLastPosition();

        } else if (this.imageOut.getStatus() == imageStatus.IDDLE) {
            this.filterPos = this.filterPos - 1;
            this.setImageIO(this.filterPos);
            this.imageOut.setLastPosition();
            this.imageIn.setLastPosition();
        }
        this.setPosition();
        this.updatePixelSamples();
    }

    isFirstStep() {
        return this.filterPos == 0 && this.imageOut.getStatus() == imageStatus.IDDLE;
    }

    completeAllImage() {
        this.images.forEach((image) => image.complete());
    }
    resetImages() {
        this.images.forEach((image, i) => { if (i != 0) image.reset() });
    }

    checkStatus(imgStatus) {
        if (imgStatus == imageStatus.IDDLE) this.imageOut.setStatus(imageStatus.FILTERING);
    }

    checkIfComplete(status) {
        if (status != imageStatus.COMPLETE) return;
        this.setImagePosStep();
        this.setImageIO(this.filterPos);
        this.setPosition();
        this.updatePixelSamples();
        if (socket) socket.emit("stage", "DONE");
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

    updateImageStep(status, state = "next") {
        if (status != imageStatus.FILTERING) return;
        if (state == "next") {
            this.imageIn.step();
            this.imageOut.step();
        } else if (state == "previous") {
            this.imageIn.stepPrevious();
            this.imageOut.stepPrevious();
        }
    }

    render() {
        this.renderImages();
        // this.renderSqueleton();
        this.renderPixelSampleI();
        this.renderIConnection();
        this.renderPixelSampleO();
        this.renderOConnection();

        const topPosY = this.position.y + this.padding.top;
        this.renderSampleGrid(this.position.x + this.padding.right, topPosY);
        this.renderSampleGrid(this.position.x - this.pixelSampleIn.width - this.padding.left, topPosY);

        const gridPosX = this.padding.right + this.pixelSampleIn.width
        this.renderPixelDetailGrid(this.imageIn.getImageSample(), this.position.x - (gridPosX * 2), topPosY);
        this.renderPixelDetailGrid(this.imageOut.getImageCompleteSample(), this.position.x + gridPosX + this.padding.left, topPosY);
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
        const { width, height } = state.filterSampleSize;
        this.pixelSampleIn.resize(width, height);
        image(this.pixelSampleIn, this.position.x - this.pixelSampleIn.width - this.padding.left, this.position.y + this.padding.top);

    }

    renderPixelSampleO() {
        if (this.pixelSampleOut == null) return;
        const { width, height } = state.filterSampleSize;
        this.pixelSampleOut.resize(width, height);
        image(this.pixelSampleOut, this.position.x + this.padding.right, this.position.y + this.padding.top);
    }

    renderSampleGrid(posX, posY) {
        stroke(255);
        noFill();
        strokeWeight(1);
        const { width, height } = state.filterSampleSize;
        rect(posX, posY, width, height);
        //draw lines
        const nWidth = width / state.sampleSize;
        const nHeight = height / state.sampleSize;
        for (let i = nWidth; i < width; i += nWidth) {
            line(posX + i, posY, posX + i, posY + height);
        }
        for (let j = nHeight; j < height; j += nHeight) {
            line(posX, posY + j, posX + width, posY + j);
        }
    }

    renderPixelDetailGrid(sample, posX, posY) {
        stroke(255);
        noFill();
        strokeWeight(1);
        textSize(10);
        const { width, height } = state.filterSampleSize;
        rect(posX, posY, width, height);
        const textPad = 9;
        const pixelWidth = width / state.sampleSize;
        const pixelHeight = height / state.sampleSize;

        for (let i = 0; i < sample.width; i++) {
            for (let j = 0; j < sample.height; j++) {
                let color = sample.get(i, j);
                noFill();
                rect(posX + (i * pixelWidth), posY + (j * pixelHeight), pixelWidth, pixelHeight);
                const initPosY = pixelHeight / 3;
                noStroke();
                fill(255, 0, 0);
                text(color[0], posX + (i * pixelWidth) + state.sampleSize / 2, posY + (j * pixelHeight) + initPosY)
                fill(0, 255, 0);
                text(color[1], posX + (i * pixelWidth) + state.sampleSize / 2, posY + (j * pixelHeight) + initPosY + (textPad * 1))
                fill(0, 0, 255);
                text(color[2], posX + (i * pixelWidth) + state.sampleSize / 2, posY + (j * pixelHeight) + initPosY + (textPad * 2))
                stroke(255);
            }
        }

    }

    renderSqueleton() {
        strokeWeight(1);
        stroke(255);
        fill(51);
        const { width, height } = state.filterSampleSize;
        rect(this.position.x - width - this.padding.left - this.padding.right, this.position.y, width * 2 + this.padding.left + this.padding.right, this.size.width);
    }

    mouseClicked() {
        this.update();
    }

}