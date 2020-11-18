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
    this.sections = [];
    this.regionRestriction = "none";
    this.playhead = {
      sectionIndex: 0,
      countdown: 0,
      state: "before start", // "playing", "fade in", "end of movement"
    };
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
  }
  draw(dt) {
    // Update state and draw. dt is the time since last frame in seconds.

    if (this.playhead.state == "before start") {
      return;
    } else if (this.playhead.state == "fade in") {
      this.playhead.countdown -= dt;
      // Will pass from the "fade in" state by play() being called externally
    } else if (this.playhead.state == "playing") {
      this.playhead.countdown -= dt;
      if (this.playhead.countdown <= 0) {
        this.playhead.sectionIndex += 1;
        if (this.playhead.sectionIndex < this.sections.length) {
          this.directionDuration = this.sections[
            this.playhead.sectionIndex
          ].duration;
          this.playhead.countdown = this.sections[
            this.playhead.sectionIndex
          ].duration;
          if ("region" in this.sections[this.playhead.sectionIndex]) {
            this.regionRestriction = this.sections[
              this.playhead.sectionIndex
            ].region;
          } else {
            this.regionRestriction = "none";
          }
          this.textDuration = this.directionDuration * 0.2;

          if (this.sections[this.playhead.sectionIndex].name == "fade out") {
            this.fadeOut();
          } else {
            this.switchPacketDirection(
              this.sections[this.playhead.sectionIndex].name
            );
          }
        }
      }
    }

    if (this.playhead.state == "playing" || this.playhead.state == "fade in") {
      if (this.increaseBackgroundPhase) {
        let duration = this.directionDuration - this.textDuration;
        this.backgroundPhase += ((Math.PI * 2) / duration) * dt;
      }

      if (this.clearScreen) {
        this.pg.background("rgba(1.0,1.0,1.0,1.0)");
        this.clearScreen = false;
      }

      // background("rgba(1.0,1.0,1.0,0.00)");
      let curve = Math.pow(Math.cos(this.backgroundPhase) * 0.5 + 0.5, 6.0);
      this.backgroundAlpha = curve * 20.0;
      let backgroundHue = Math.min(
        (metrics.rollingTotalLen / 1000000.0 - 2.0) * 3.0,
        9.0
      );
      let backgroundTransitionLightness = 0;
      if (this.playhead.state == "fade in") {
        backgroundTransitionLightness =
          Math.pow(
            1.0 - this.playhead.countdown / this.directionDuration,
            3.0
          ) * 100.0;
      } else if (this.backgroundPhase > Math.PI) {
        backgroundTransitionLightness = Math.pow(curve, 3.0) * 100.0;
      } else {
        backgroundTransitionLightness =
          Math.pow(this.playhead.countdown / this.directionDuration, 10.0) *
          100.0;
      }
      this.pg.background(
        backgroundHue,
        100,
        backgroundHue * 4 + 10 + backgroundTransitionLightness,
        this.backgroundAlpha
      );

      this.pg.colorMode(HSL, 100);
      this.pg.strokeWeight(subsampling);
      this.pg.noFill();
      for (let drop of this.droplets) {
        let dropSize = drop.size;
        let alpha;
        if (drop.out == false) {
          dropSize = drop.maxSize - dropSize;
          alpha = (drop.size / drop.maxSize) * 100;
        } else {
          alpha = (drop.size / drop.maxSize) * 100;
        }
        let l =
          drop.lightness * 0.5 +
          drop.lightness * (drop.size / drop.maxSize) * 0.5;

        if (drop.size > drop.maxSize) {
          // Drop will only be drawn one frame, use the lightness of the drop
          l = drop.lightness;
        }
        this.pg.stroke(drop.hue, drop.saturation, 25 + l, alpha);

        this.pg.circle(drop.x, drop.y, dropSize);
        drop.size += subsampling;
        // drop.lightness -= (10 - drop.hue) * 0.1;
      }

      this.droplets = this.droplets.filter((d) => d.size < d.maxSize);

      // clear();
      image(this.pg, 0, 0);

      // Draw text
      colorMode(HSL, 100);
      fill(75, 100, 100, 100);
      textFont(antonFont);
      textAlign(CENTER, CENTER);
      textSize(this.displayTextSize * subsampling);
      this.displayTextSize += this.displayTextSizeGrowth * dt;
      text(this.displayText, width / 2, 130 * subsampling);
      let regionText = "The World";
      if (this.regionRestriction != "none") {
        regionText = this.regionRestriction;
      }
      if (this.displayText == "") {
        regionText = "";
      }
      text(regionText, width / 2, 297 * subsampling);

      // if(this.regionRestriction == "Sweden") {
      //     console.log("Sweden ratio: " + metrics.countries.get("Sweden")/metrics.numPackets);
      // } else if(this.regionRestriction == "Europe") {
      //     console.log("Europe ratio: " + metrics.continents.get("Europe")/metrics.numPackets);
      // }
    }
  }
  reset(sections) {
    // This is called to reset the state of the Scene
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
    this.regionRestriction = "none";
    this.sections = sections;
    this.playhead = {
      sectionIndex: 0,
      countdown: sections[0].duration,
    };
  }
  registerPacket(internalData, country, continent) {
    if (internalData.len > 0 && internalData.out == this.doOutPackets) {
      if (this.regionRestriction == "none") {
        this.addDroplet(internalData.len, this.baseHueColor, internalData.out);
      } else if (
        (this.regionRestriction == "Sweden" && country == "Sweden") ||
        (this.regionRestriction == "Europe" && continent == "Europe")
      ) {
        this.addDroplet(internalData.len, this.baseHueColor, internalData.out);
      }
    }
  }

  addDroplet(len, baseHue, out) {
    let hue = baseHue + ((len / 30000) % 10);
    if (len > 400000) {
      hue = (hue + 48.0) % 100;
    }
    let maxSize = Math.min(len / 2000, 200.0) * subsampling;
    let lightness = Math.min(
      Math.min(len / 50000.0, 25) + Math.random() * 50 - hue,
      75
    );
    if (maxSize < 3 * subsampling) {
      lightness = 10;
    }
    this.droplets.push({
      x: Math.random() * canvasX,
      y: Math.random() * canvasY,
      size: 2 * subsampling,
      maxSize: maxSize,
      saturation: Math.random() * 50 + 50,
      lightness: lightness,
      hue: hue,
      out: out,
    });
  }
  switchPacketDirection(direction) {
    console.log("Switching direction: " + direction);
    this.increaseBackgroundPhase = false;
    this.backgroundPhase = 0.0;
    this.clearScreen = true;
    this.displayTextSize = 24;
    this.droplets = [];
    if (direction == "in") {
      this.doOutPackets = false;
      this.displayText = "INCOMING";
      this.baseHueColor = 0;
    } else if (direction == "out") {
      this.doOutPackets = true;
      this.displayText = "OUTGOING";
      this.baseHueColor = 0;
    }
    // TODO: Make sure these timeouts are removed when disabling the scene
    setTimeout(this.hideText.bind(this), this.textDuration * 1000);
    // setTimeout(this.switchPacketDirection.bind(this), this.directionDuration);
  }
  hideText() {
    this.displayText = "";
    this.increaseBackgroundPhase = true;
  }
  fadeIn(duration) {
    // Called when the previous scene is starting to fade out
    this.playhead.state = "fade in";
    this.playhead.countdown = duration;
    // Trick the background into fading to white
    this.directionDuration = duration;
    this.backgroundPhase = 0;
    this.clearScreen = true;
    console.log("Fade in drops");
  }
  fadeOut(duration) {
    // Called from within the Scene when the "fade out" section starts
    this.playhead.state = "fade out";
    console.log("Fade out drops");
  }
  play() {
    // Called when this Scene becomes the current Scene (after teh crossfade)
    this.playhead.sectionIndex = -1;
    this.playhead.state = "playing";
    this.playhead.countdown = 0;
    console.log("Play drops");
  }
}
