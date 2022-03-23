

class ImagePixel {
    image = null;
    size = { width: 0, height: 0 };
    position = createVector(0, 0);
    target = createVector(0, 0);
    status = IDDLE;
    pixels = [];
    typeMovement = null;
    currentPixel = null;

    constructor(image, posX, posY, destX, destY) {
        this.image = image;
        this.size = { width: image.width, height: image.height };
        this.position = createVector(posX, posY);
        this.target = createVector(destX, destY);
        this.typeMovement = movement.PERPIXEL;
    }

    init() {
        this.image.loadPixels();
        this.pixels = this.createPixels(this.image);
        this.currentPixel = this.pixels[0];
        this.status = MOVE;
    }

    getPosition() {
        return this.position;
    }

    setStatus(newStatus = IDDLE) {
        this.status = newStatus;
    }

    setTypeMovement(type = movement.ALLPIXELS) {
        this.typeMovement = type;
    }
    setTarget(newTarget) {
        this.target = newTarget;
        this.setPixelsTarget();
    }

    setPixelsTarget() {
        let x = 0, y = 0
        for (let i = 0; i < this.pixels.length; i++) {
            x = i % img.width;
            y = i % img.height == 0 && i != 0 ? y + 1 : y;
            this.pixels[i].setTarget(createVector(this.target.x + x, this.target.y + y));
        }
    }

    createPixels(img) {
        let pixels = [];
        let x = 0, y = 0;
        const pixelSize = img.width * 4 * img.height;
        let id = 0;
        for (let i = 0; i < pixelSize; i += 4) {
            let r = img.pixels[i], g = img.pixels[i + 1], b = img.pixels[i + 2], a = img.pixels[i + 3];
            const pixelColor = color(r, g, b, a);
            x = (i / 4) % img.width;
            y = (i / 4) % img.height == 0 && i != 0 ? y + 1 : y;
            const pixel = new Pixel(this.position.x + x, this.position.y + y, this.target.x + x, this.target.y + y, random(8, 12), random(-10, 10), pixelColor, id);
            pixels.push(pixel);
            id++;
        }
        return pixels;
    }

    setPixelsStatus(newStatus = IDDLE) {
        this.pixels.forEach(pixel => pixel.setStatus(newStatus));
    }

    resetCurrentPixel() {
        this.currentPixel = this.pixels[0];
    }

    update() {
        if (this.status == IDDLE) return;

        if (this.typeMovement == movement.ALLPIXELS) {
            this.updatePixels();
            this.updateMoveState();
        } else {
            this.updatePixel();
            this.checkPixelState();
        }

    }

    render() {
        this.renderImage();
        // this.renderTargetSkeleton();
        if (this.status == MOVE) {
            this.renderPixels();
        } else {
            this.renderTargetImage();
        }
    }

    renderTargetImage() {
        image(this.image, this.target.x, this.target.y);
    }

    updateMoveState() {
        const isComplete = this.pixels.every(pixel => pixel.isMoving() == false);
        this.status = !isComplete ? MOVE : IDDLE;
    }

    updatePixels() {
        this.pixels.forEach(pixel => pixel.update());
    }
    updatePixel() {
        if (this.currentPixel == null) return;
        // this.currentPixel.update();
        this.currentPixel.moveStep();
    }
    checkPixelState() {
        if (!this.currentPixel.isMoving()) this.stepNextPixel();
    }

    stepNextPixel() {
        if (this.currentPixel.id + 1 >= this.pixels.length) this.status = IDDLE;
        this.currentPixel = this.currentPixel.id + 1 >= this.pixels.length ? this.currentPixel[this.pixels.length - 1] : this.pixels[this.currentPixel.id + 1];
    }

    renderImage() {
        image(this.image, this.position.x, this.position.y);
    }

    renderTargetSkeleton() {
        noFill();
        stroke("white");
        strokeWeight(2);
        rect(this.target.x, this.target.y, this.size.width, this.size.height);
    }

    renderPixels() {
        this.pixels.forEach(pixel => pixel.render());
    }
}