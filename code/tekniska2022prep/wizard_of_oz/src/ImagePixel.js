

class ImagePixel {
    pixels = [];
    size = { width: 0, height: 0 };
    position = createVector(0, 0);
    target = createVector(0, 0);
    image = null;

    constructor(image, posX, posY, destX, destY) {
        this.size = { width: image.width, height: image.height };
        this.position = createVector(posX, posY);
        this.target = createVector(destX, destY);
        this.image = image;
    }

    init() {
        this.pixels = this.createPixels(this.image);
    }

    getPosition() {
        return this.position;
    }

    createPixels(img) {
        let pixels = [];
        let x = 0, y = 0;
        const pixelSize = img.width * 4 * img.height;
        for (let i = 0; i < pixelSize; i += 4) {
            let r = img.pixels[i], g = img.pixels[i + 1], b = img.pixels[i + 2], a = img.pixels[i + 3];
            const pixelColor = color(r, g, b, a);
            x = (i / 4) % img.width;
            y = (i / 4) % img.height == 0 && i != 0 ? y + 1 : y;
            const pixel = new Pixel(this.position.x + x, this.position.y + y, this.target.x + x, this.target.y + y, random(8, 12), random(-5, 5), pixelColor);
            pixels.push(pixel);
        }
        return pixels;
    }

    render() {
        this.renderTargetSkeleton();
        this.renderPixels();
    }

    renderTargetSkeleton() {
        noFill();
        stroke("white");
        strokeWeight(2);
        rect(this.target.x, this.target.y, this.size.width, this.size.height);
    }

    renderPixels() {
        this.pixels.forEach(pixel => {
            pixel.update();
            pixel.render();
        })
    }
}