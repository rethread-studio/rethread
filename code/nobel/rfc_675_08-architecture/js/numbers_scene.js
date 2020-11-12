class NumbersScene extends Scene {
    constructor() {
        super();
        this.textObjects = [];
        this.particles = [];
        this.particleIndex = 0;
        const MAX_NUM_PARTICLES = 1000;
        for (let i = 0; i < MAX_NUM_PARTICLES; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                vel: 0,
                size: 0,
                hue: 0,
                saturation: 0,
                lightness: 0,
            })
        }
        this.averageLen = 0;
        this.particleDirections = ['down', 'right', 'left', 'up'];
        this.particleDir = 3;
        this.backgroundAlphaChange = 0.6;
        this.backgroundAlpha = 0;
    }
    preload() {
        // This function is called from the p5 preload function. Use it 
        // to load assets such as fonts and shaders.
    }
    setup() {
        // This function is called from the p5 steup function. Use it to init
        // all the state that requires p5 to be loaded (such as instantiating
        // p5 types like p5.Vector or createGraphics).
        this.pg = createGraphics(canvasX, canvasY);
        this.pg.clear();
        this.textObjects.push(
            new TextObject(
                ["INTERNET PACKETS", "0", ["INTO", "STOCKHOLM"], "0", ["OUT FROM", "STOCKHOLM"], "0", "DATA SIZE", "0"],
                1,
                [4, 10, 4, 10, 4, 10, 4, 10],
                [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
            )
        );
    }
    draw(dt) {
        // Update state and draw. dt is the time since last frame in seconds.
        background("rgba(1.0,1.0,1.0,1.0)");

        // Draw particles to Graphics
        this.pg.noStroke();
        this.pg.colorMode(HSL, 100);
        // let backgroundHue = rollingNumPackets / 100.0 - 2.0;
        let backgroundHue = Math.min((metrics.rollingTotalLen / 1000000.0 - 2.0) * 3.0, 9.0);
        // console.log(backgroundHue);
        this.pg.fill(backgroundHue, 100, backgroundHue * 4.0, 50);
        this.pg.rect(0, 0, canvasX, canvasY);
        for (let p of this.particles) {
            this.pg.fill(p.hue, p.saturation, p.lightness);
            this.pg.ellipse(p.x, p.y, p.size, p.size);
            switch (this.particleDirections[this.particleDir]) {
                case 'right':
                    p.x += p.vel;
                    if (p.x >= canvasX) {
                        p.vel = 0;
                        p.size = 0;
                    }
                    break;
                case 'left':
                    p.x -= p.vel;
                    if (p.x < 0) {
                        p.vel = 0;
                        p.size = 0;
                    }
                    break;
                case 'up':
                    p.y -= p.vel;
                    if (p.y < 0) {
                        p.vel = 0;
                        p.size = 0;
                    }
                    break;
                case 'down':
                    p.y += p.vel;
                    if (p.y > canvasY) {
                        p.vel = 0;
                        p.size = 0;
                    }
                    break;
                default:

            }
        }

        drawingContext.globalAlpha = Math.pow(this.backgroundAlpha, 2);
        image(this.pg, 0, 0, canvasX, canvasY);
        drawingContext.globalAlpha = 1.0;

        this.backgroundAlpha += this.backgroundAlphaChange * dt;
        this.backgroundAlpha = Math.max(Math.min(this.backgroundAlpha, 1.0), 0.0);

        fill(75, 0, Math.pow(this.backgroundAlpha, 2) * 100, 100);
        // let totalLen = formatBytes(rollingTotalLen);
        this.textObjects[0].setVariant(1, metrics.numPackets.toString());
        this.textObjects[0].setVariant(3, metrics.numInPackets.toString());
        this.textObjects[0].setVariant(5, metrics.numOutPackets.toString());
        this.textObjects[0].setVariant(7, metrics.totalLen.toString());

        textSize(24);
        textAlign(CENTER, CENTER);
        textFont(antonFont);
        for (let to of this.textObjects) {
            to.draw();
            if (to.update(dt) == 1) {
                this.backgroundAlphaChange *= -1;
                // console.log("Change direction, this.backgroundAlphaChange: " + this.backgroundAlphaChange);
                if (this.backgroundAlphaChange > 0) {
                    this.particleDir = (this.particleDir + 1) % this.particleDirections.length;
                }
            }
        }
    }
    reset(sections) {
        // This is called to reset the state of the Scene
        this.sections = sections;
    }
    registerPacket(internalData) {
        this.addParticle(internalData.len);
    }
    addParticle(len) {
        this.averageLen = this.averageLen * 0.9 + len * 0.1;
        if (len > 1) {
            let lightness = (1.0 - Math.pow(1.0 - (this.averageLen / 20000.0), 3.0));
            let x, y;
            switch (this.particleDirections[this.particleDir]) {
                case 'right':
                    x = -10;
                    y = Math.random() * canvasY;
                    break;
                case 'left':
                    x = canvasX * subsampling + 10;
                    y = Math.random() * canvasY;
                    break;
                case 'up':
                    y = canvasY * subsampling + 10;
                    x = Math.random() * canvasX;
                    break;
                case 'down':
                    y = -10;
                    x = Math.random() * canvasX;
                    break;
            }
            let pa = this.particles[this.particleIndex];
            this.particleIndex += 1;
            if (this.particleIndex >= this.particles.length) {
                this.particleIndex = 0;
            }
            pa.x = x;
            pa.y = y;
            pa.vel = (Math.random() * 10 + 5) * subsampling;
            pa.size = (Math.min(Math.max(len / 10000, 1), 8.0) + 1.0) * subsampling;
            pa.hue = Math.pow(lightness, 2.0) * 15;
            pa.saturation = 100;
            pa.lightness = lightness * 70 + 10;
            // particles.push({
            //   x: x,
            //   y: y,
            //   vel: (Math.random() * 10 + 5) * subsampling,
            //   size: (Math.min(Math.max(len/10000, 1), 8.0) + 1.0) * subsampling,
            //   hue: Math.pow(lightness, 2.0) * 15, //Math.pow( 1.0 - (len / 20000.0), 5.0) * 100,
            //   saturation: 100,
            //   lightness: lightness * 70 + 10,
            // })
        }
    }
    fadeIn(duration) {
        // Called when the previous scene is starting to fade out
    }
    fadeOut(duration) {
        // Called from within the Scene when the "fade out" section starts
    }
    play() {
        // Called when this Scene becomes the current Scene (after the crossfade)
    }
}

class TextObject {
    constructor(texts, line, timeOn, timeOff) {
        if (texts.length != timeOn.length || texts.length != timeOff.length) {
            console.log("ERROR: arrays of different length supplied to TextObject");
        }
        this.height = height;
        this.width = width;
        this.texts = texts;
        this.line = line;
        this.timeOn = timeOn;
        this.timeOff = timeOff;
        this.blinking = false;
        this.currentTextIndex = 0;
        this.currentState = 1; // 1 = text, 0 = off
        this.countdown = this.timeOn[0];
        this.fullCountdownTime = this.timeOn[this.currentTextIndex];
        this.textSize = 16.0;
        this.textGrowth = 24.0 / 5.0;
        this.crossedHalfWay = false;
    }
    setVariant(index, text) {
        this.texts[index] = text;
    }
    draw() {
        if (this.currentState == 1) {
            const lines = [48 * subsampling, 130 * subsampling, 214 * subsampling, 297 * subsampling];
            const texts = this.texts[this.currentTextIndex];
            textSize(this.textSize * subsampling);
            if (typeof texts === 'string' || texts instanceof String) {
                let y = lines[this.line];
                text(texts, width / 2, y);
            } else if (Array.isArray(texts)) {
                for (let i = 0; i < texts.length; i++) {
                    let y = lines[this.line + i];
                    text(texts[i], width / 2, y);
                }
            }

        }
    }
    update(dt) {
        this.textSize += this.textGrowth * dt;
        this.countdown -= dt;
        if (this.countdown / this.fullCountdownTime <= 0.8 && this.currentState == 1 && this.crossedHalfWay == false) {
            this.crossedHalfWay = true;
            return 1;

        }
        if (this.countdown <= 0) {
            this.currentState = 1 - this.currentState;
            if (this.currentState == 0) {
                this.countdown = this.timeOff[this.currentTextIndex];
                this.fullCountdownTime = this.timeOff[this.currentTextIndex];
            } else if (this.currentState == 1) {
                this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
                this.countdown = this.timeOn[this.currentTextIndex];
                this.fullCountdownTime = this.timeOn[this.currentTextIndex];
                this.textSize = 16.0;
                this.textGrowth = 24.0 / 5.0;
                this.crossedHalfWay = false;
            }
        }
        return 0;
    }
}