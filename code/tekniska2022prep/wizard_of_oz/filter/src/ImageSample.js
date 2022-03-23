
const imageStatus = {
    "COMPLETE": "complete",
    "FILTERING": "filtering",
    "IDDLE": "iddle"
}

class ImageSample {
    status = imageStatus.FILTERING;
    samplePos = null;
    sampleSize = { width: 1, height: 1 };
    sampleImage = null;
    completeImage = null;
    position;
    isSqueletonVisible = false;
    loadedPos = null;

    constructor() {
        this.samplePos = createVector(0, 0);
        this.position = createVector(0, 0);
        this.loadedPos = createVector(0, 0);
    }

    setLoadedPos(x, y) {
        this.loadedPos = createVector(x, y);
    }

    setPosition(x, y) {
        this.position = createVector(x, y);
    }

    setSampleSize(width, height) {
        this.sampleSize = { width, height };
    }

    setIsSqueletonVisible(isVisible = false) {
        this.isSqueletonVisible = isVisible;
    }

    setImage(_img = null, width = 100, height = 100) {
        if (_img == null) {
            this.sampleImage = createImage(width, height);
        } else {
            this.sampleImage = _img;
        }
    }

    setCompleteImage(_img, width = 100, height = 100) {
        this.completeImage = createImage(width, height);
        this.completeImage.copy(_img, 0, 0, width, height, 0, 0, width, height);
    }

    reset() {
        this.resetsamplePos();
        //reset image
        this.setImage(null, this.completeImage.width, this.completeImage.height);
        //reset status

        //

    }

    resetsamplePos() {
        this.samplePos = createVector(0, 0);
    }

    step() {
        if (this.samplePos.x + this.sampleSize.width > this.sampleImage.width - this.sampleSize.width) {
            this.samplePos.set(0, this.samplePos.y + this.sampleSize.height);
        } else {
            this.samplePos.add(this.sampleSize.width, 0)
        }

        if (this.samplePos.y + this.sampleSize.height > this.sampleImage.height) {
            this.samplePos.set(0, 0);
            this.setStatus(imageStatus.COMPLETE);
        }
    }

    setStatus(status = imageStatus.FILTERING) {
        this.status = status;
    }

    getPosition() {
        return this.position;
    }

    getSize() {
        return { width: this.sampleImage.width, height: this.sampleImage.height }
    }

    getStatus() {
        return this.status;
    }

    getSampleImagePixels() {
        this.sampleImage.loadPixels();
        return this.sampleImage.pixels;
    }
    getImageSampleSize() {
        return { width: this.sampleImage.width, height: this.sampleImage.height };
    }
    getSamplePosition(position = "LEFT") {
        switch (position) {
            case "LEFT":
                return this.samplePos.copy().add(0, this.sampleSize.height).add(this.position);
            case "RIGHT":
                return this.samplePos.copy().add(this.sampleSize.width, this.sampleSize.height).add(this.position);
            default:
                break;
        }
    }

    getCompleteImage() {
        return this.completeImage;
    }

    getImageSample() {
        return this.sampleImage.get(this.samplePos.x, this.samplePos.y, this.sampleSize.width, this.sampleSize.height);
    }

    getImageCompleteSample() {
        return this.completeImage.get(this.samplePos.x, this.samplePos.y, this.sampleSize.width, this.sampleSize.height);
    }

    copySample() {
        this.sampleImage.copy(this.completeImage, this.samplePos.x, this.samplePos.y, this.sampleSize.width, this.sampleSize.height, this.samplePos.x, this.samplePos.y, this.sampleSize.width, this.sampleSize.height);
    }

    render() {
        this.renderSqueleton();
        image(this.sampleImage, this.position.x, this.position.y);
        this.renderSampleSqueleton();
    }

    filterImage({ filter, val }) {
        this.completeImage.filter(filter, val);
    }

    renderCompleteImage() {
        if (this.isCompleteImageNull()) return;
        image(this.completeImage, this.position.x, this.position.y);
    }

    renderSampleSqueleton() {
        if (this.isComplete() || this.isSamplePosNull()) return;
        strokeWeight(1);
        stroke(255);
        noFill();
        rect(this.samplePos.x + this.position.x, this.samplePos.y + this.position.y, this.sampleSize.width, this.sampleSize.height);

    }

    renderSqueleton() {
        if (this.isComplete()) return;
        if (this.isSqueletonVisible) {
            strokeWeight(1);
            stroke(255);
            fill(51);
            rect(this.position.x, this.position.y, this.sampleImage.width, this.sampleImage.height);
        }
    }

    isCompleteImageNull() {
        return this.completeImage == null;
    }

    isSamplePosNull() {
        return this.samplePos == null;
    }

    isComplete() {
        return this.status == imageStatus.COMPLETE;
    }

    mouseClicked() {
        //this.update();
        // this.render();

    }

}