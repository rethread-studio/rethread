class LiveSign extends Scene {
    constructor(location, _font, drawSquare = false) {
        super();
        this.tick = 400;
        this.time = Date.now() + this.tick;
        this.showTick = true;
        this.font = _font;
        this.drawSquare = drawSquare;

        this.focuLocation = location;

        this.positions = {
            row: {
                r1: 38 * subsampling,
                r2: 86 * subsampling,
                r3: 170 * subsampling,
            },
            col: {
                c1: 35 * subsampling,
                c2: 115 * subsampling,
                c3: 199 * subsampling,
                c4: 283 * subsampling,
                c5: 314 * subsampling,
            },
            padding: {
                top: 9 * subsampling,
                right: 5 * subsampling,
                botton: 5 * subsampling,
                left: 5 * subsampling,
            }
        }

        this.fontSize = {
            tittle: 28 * subsampling,
            number: 10 * subsampling,
            countries: 12 * subsampling,
        }
        this.colorPallete = {
            black: {
                r: 0,
                g: 0,
                b: 0,
            },
            green: {
                r: 125,
                g: 250,
                b: 183,
            },
            red: {
                r: 201,
                g: 44,
                b: 43
            },
            orange: {
                r: 225,
                g: 170,
                b: 71
            },
            lightBlue: {
                r: 74,
                g: 157,
                b: 224
            },
            darkGreen: {
                r: 101,
                g: 167,
                b: 140
            },
            darkBlue: {
                r: 0,
                g: 31,
                b: 179
            },
            white: {
                r: 100,
                g: 100,
                b: 100
            }
        }

    }
    preload() {
        // This function is called from the p5 preload function. Use it 
        // to load assets such as fonts and shaders.

    }
    setup() {
        // This function is called from the p5 setup function. Use it to init
        // all the state that requires p5 to be loaded (such as instantiating
        // p5 types like p5.Vector or createGraphics).

    }
    draw(dt) {
        // Update state and draw. dt is the time since last frame in seconds.
        // background(255, 50, 150, 100);
        if (this.showTick) this.writeLocation();
        if (this.showTick && this.drawSquare) this.drawTick();
    }
    reset(sections) {
        // This is called to reset the state of the Scene before it is started
    }
    registerPacket(internalData, country, continent) {

    }
    fadeIn(duration) {
        // Called when the previous scene is starting to fade out
    }
    fadeOut(duration) {
        // Called from within the Scene when the "fade out" section starts
    }
    play() {
        // Called when this Scene becomes the current Scene (after teh crossfade)
    }
    zIndex() {
        // Return the z index of the scene when in a transition. The higher z index is drawn on top of the lower one.
        return 0;
    }

    //update the status of ShowTick 
    //updates if time is greater that this.time
    updateTickTime() {

        if (Date.now() > this.time) {
            this.showTick = !this.showTick;
            this.time = Date.now() + this.tick;
        }
    }

    //Write the size
    writeLocation() {
        noStroke();
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(RIGHT, TOP);
        textFont(this.font);
        text("LIVE", this.positions.row.r1 - 10 * subsampling, this.positions.col.c1 + 4 * subsampling);

        circle(this.positions.row.r1 - 31 * subsampling, this.positions.col.c1 + this.positions.padding.top + 2 * subsampling, 7 * subsampling);
        text(this.focuLocation, this.positions.row.r1 - 10 * subsampling, this.positions.col.c1 + this.positions.padding.top * 2 + 4 * subsampling);
    }

    //DRAW THE TICK
    //showstick then draw or not
    drawTick() {
        noStroke();

        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b, 100);
        rect(32 * subsampling, this.positions.col.c1 + 4 * subsampling, 4 * subsampling, 24 * subsampling);

    }

    //change the focus location
    changeLocation(newLoc) {
        this.focuLocation = newLoc;
    }
}