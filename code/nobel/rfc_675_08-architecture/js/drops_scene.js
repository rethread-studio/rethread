class DropsScene extends Scene {
    constructor() {
        super();
        this.droplets = [];
        this.doOutPackets = true;
        this.backgroundAlpha = 5;
        this.textDuration = 2000;
        this.directionDuration = 15000;
        this.backgroundPhase = 0.0;
        this.increaseBackgroundPhase = false;
        this.displayText = "";
        this.displayTextSize = 24;
        this.displayTextSizeGrowth = 8;
    }
    preload() {
        // This function is called from the p5 preload function. Use it 
        // to load assets such as fonts and shaders.
    }
    setup() {
        // This function is called from the p5 steup function. Use it to init
        // all the state that requires p5 to be loaded (such as instantiating
        // p5 types like p5.Vector or createGraphics).
        this.switchPacketDirection();
    }
    draw(dt) {
        // Update state and draw. dt is the time since last frame in seconds.

        if (this.increaseBackgroundPhase) {
            let duration = this.directionDuration - this.textDuration;
            this.backgroundPhase += (Math.PI * 2) / duration * (dt * 1000);
        }

        if (this.clearScreen) {
            background("rgba(1.0,1.0,1.0,1.0)");
            this.clearScreen = false;
        }

        // background("rgba(1.0,1.0,1.0,0.00)");
        this.backgroundAlpha = Math.pow(Math.cos(this.backgroundPhase) * 0.5 + 0.5, 6.0) * 20.0;
        let backgroundHue = Math.min((metrics.rollingTotalLen / 1000000.0 - 2.0) * 3.0, 9.0);
        background(backgroundHue, 100, backgroundHue * 4, this.backgroundAlpha);

        colorMode(HSL, 100);
        strokeWeight(subsampling);
        noFill();
        for (let drop of this.droplets) {
            stroke(drop.hue, drop.saturation, 25 + drop.lightness, (1.0 - drop.size / drop.maxSize) * 100);
            let dropSize = drop.size;
            if (drop.out == false) {
                dropSize = drop.maxSize - dropSize;
            }
            circle(drop.x, drop.y, dropSize);
            drop.size += subsampling;
            drop.lightness -= (10 - drop.hue) * 0.1;
        }

        this.droplets = this.droplets.filter((d) => d.size < d.maxSize);

        // Draw text
        colorMode(HSL, 100);
        fill(75, 100, 100, 100);
        textFont(antonFont);
        textAlign(CENTER, CENTER);
        textSize(this.displayTextSize * subsampling);
        this.displayTextSize += this.displayTextSizeGrowth * dt;
        text(this.displayText, width / 2, 130 * subsampling);
    }
    reset(sections) {
        // This is called to reset the state of the Scene
        this.sections = sections;
    }
    registerPacket(internalData) {
        if (internalData.len > 0 && internalData.out == this.doOutPackets) {
            this.addDroplet(internalData.len, this.baseHueColor, internalData.out);
        }
    }

    addDroplet(len, baseHue, out) {
        let hue = baseHue + Math.min(len / 50000, 10);
        this.droplets.push({
            x: Math.random() * canvasX,
            y: Math.random() * canvasY,
            size: 2 * subsampling,
            maxSize: Math.min(len / 2000, 200.0) * subsampling,
            saturation: Math.random() * 50 + 40 + hue,
            lightness: 50 + (hue * 2),
            hue: hue,
            out: out
        })
        // if(len < 50000) {
        //   droplets[droplets.length-1].hue = 5;
        // }
    }
    switchPacketDirection() {
        console.log("Switching direction");
        this.increaseBackgroundPhase = false;
        this.backgroundPhase = 0.0;
        this.clearScreen = true;
        this.displayTextSize = 24;
        this.droplets = [];
        if (this.doOutPackets) {
            this.doOutPackets = false;
            this.displayText = "INCOMING";
            this.baseHueColor = 0;
        } else {
            this.doOutPackets = true;
            this.displayText = "OUTGOING";
            this.baseHueColor = 0;
        }
        // TODO: Make sure these timeouts are removed when disabling the scene
        setTimeout(this.hideText.bind(this), this.textDuration);
        setTimeout(this.switchPacketDirection.bind(this), this.directionDuration);
    }
    hideText() {
        this.displayText = "";
        this.increaseBackgroundPhase = true;
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
}