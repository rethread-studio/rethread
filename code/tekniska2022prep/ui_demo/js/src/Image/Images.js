
class Images {
    images = [];
    filters = [];
    marginRight = 50;

    constructor(img, filters) {
        this.filters = filters;
        this.setImages(img);
    }

    getImages() {
        return this.images;
    }

    setImages(img) {
        const size = getImageSize(img.width, img.height, this.filters.length + 1);
        const pixelImage = this.createFilledImage(img, { x: this.marginRight, y: getPaddingTop() }, size, pixelSampleSize);
        this.images.push(pixelImage);
        let imgRef = pixelImage;

        this.filters.forEach(_filter => {
            const pos = imgRef.getPosition();
            const emptyImg = this.createEmptyImage({ x: pos.x + size.width + size.width / 2, y: pos.y }, size, pixelSampleSize, imgRef.getCompleteImage(), _filter);
            imgRef = emptyImg;
            this.images.push(emptyImg);
        });

        this.calculatePositions();
    }

    calculatePositions() {
        const lastPos = this.images[this.images.length - 1].getPosition();
        const lastImage = this.images[this.images.length - 1];
        const lastImageSize = lastImage.getImageSize()
        lastImage.setPosition(windowWidth - lastImageSize.width - this.marginRight, lastPos.y)

        const initPos = this.images[0]
            .getPosition()
            .copy();

        if (this.images.length == 2) return;
        const widthPos = Math.floor((lastImage.getPosition().x - initPos.x) / (this.images.length - 1));

        for (let i = 1; i < this.images.length - 1; i++) {
            this.images[i].setPosition(this.images[i - 1].getPosition().x + widthPos, lastPos.y)
        }

    }

    getFirstImage() {
        return this.images[0];
    }

    getLastImage() {
        return this.images[this.images.length - 1];
    }

    createEmptyImage(position, size, sampleSize, _sampleImage, filter) {
        const emptyImage = new ImageSample();
        emptyImage.setPosition(position.x, position.y);
        emptyImage.setImage(null, size.width, size.height);
        emptyImage.setIsSqueletonVisible(true);
        emptyImage.setSampleSize(sampleSize.width, sampleSize.height);
        emptyImage.setCompleteImage(_sampleImage, size.width, size.height);
        emptyImage.filterImage(filter);
        return emptyImage;
    }

    createFilledImage(_image, position, size, sampleSize) {
        const imageOut = new ImageSample();
        imageOut.setPosition(position.x, position.y);
        imageOut.setImage(_image, size.width, size.height);
        imageOut.setCompleteImage(_image, size.width, size.height);
        imageOut.setSampleSize(sampleSize.width, pixelSampleSize.height);
        imageOut.setLoadedPos(size.width, size.height);
        return imageOut;
    }

    renderFirstAndLastImage() {
        this.images[0].renderCompleteImage();
        this.images[this.images.length - 1].renderCompleteImage();
    }

    renderFirstImage() {
        this.images[0].renderCompleteImage();
    }
}