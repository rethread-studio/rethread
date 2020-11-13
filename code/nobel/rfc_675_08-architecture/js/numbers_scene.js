class NumbersScene extends Scene {
  constructor() {
    super();
    this.textObject = undefined;
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
      });
    }
    this.averageLen = 0;
    this.particleDirections = ["down", "right", "left", "up"];
    this.particleDir = 3;
    this.backgroundAlphaChange = 0.6;
    this.backgroundAlpha = 0;
    this.regionRestriction = "none";
    this.sections = [];
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
    this.pg.clear();
    this.textObject = new TextObject(
      [
        "INTERNET PACKETS",
        "0",
        ["INTO", "STOCKHOLM"],
        "0",
        ["OUT FROM", "STOCKHOLM"],
        "0",
        "DATA SIZE",
        "0",
      ],
      1,
      [4, 10, 4, 10, 4, 10, 4, 10],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    );
  }
  draw(dt) {
    // Update state and draw. dt is the time since last frame in seconds.

    if (this.playhead.state == "before start") {
      return;
    } else if (this.playhead.state == "fade in") {
      this.playhead.countdown -= dt;
      colorMode(HSL, 100);
      background(
        0,
        100,
        100,
        Math.max(
          7 - (this.playhead.countdown * 7) / this.playhead.fadeInDuration,
          0
        )
      );
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
          this.textDuration = this.directionDuration * 0.2;

          resetMetrics(); // We want fresh numbers per region for example

          if (this.sections[this.playhead.sectionIndex].name == "fade out") {
            this.fadeOut();
          } else if (this.sections[this.playhead.sectionIndex].name == "all") {
            let dur = this.sections[this.playhead.sectionIndex].duration;
            this.textObject.setNewIteration(
              ["INTERNET PACKETS"],
              dur * 0.3,
              dur * 0.7
            );
          } else if (this.sections[this.playhead.sectionIndex].name == "in") {
            let dur = this.sections[this.playhead.sectionIndex].duration;
            this.textObject.setNewIteration(
              ["INTO", "STOCKHOLM"],
              dur * 0.3,
              dur * 0.7
            );
          } else if (this.sections[this.playhead.sectionIndex].name == "out") {
            let dur = this.sections[this.playhead.sectionIndex].duration;
            this.textObject.setNewIteration(
              ["OUT OF", "STOCKHOLM"],
              dur * 0.3,
              dur * 0.7
            );
          } else if (this.sections[this.playhead.sectionIndex].name == "size") {
            let dur = this.sections[this.playhead.sectionIndex].duration;
            this.textObject.setNewIteration(
              ["DATA SIZE"],
              dur * 0.3,
              dur * 0.7
            );
          }

          if ("region" in this.sections[this.playhead.sectionIndex]) {
            this.regionRestriction = this.sections[
              this.playhead.sectionIndex
            ].region;
          } else {
            this.regionRestriction = "none";
          }
          if (this.regionRestriction == "none") {
            this.textObject.label.push("The World");
          } else {
            this.textObject.label.push(this.regionRestriction);
          }
        }
      }

      background("rgba(1.0,1.0,1.0,1.0)");

      // Draw particles to Graphics
      this.pg.noStroke();
      this.pg.colorMode(HSL, 100);
      // let backgroundHue = rollingNumPackets / 100.0 - 2.0;
      let backgroundHue = Math.min(
        (metrics.rollingTotalLen / 1000000.0 - 2.0) * 3.0,
        9.0
      );
      // console.log(backgroundHue);
      this.pg.fill(backgroundHue, 100, backgroundHue * 4.0, 50);
      this.pg.rect(0, 0, canvasX, canvasY);
      for (let p of this.particles) {
        this.pg.fill(p.hue, p.saturation, p.lightness);
        this.pg.ellipse(p.x, p.y, p.size, p.size);
        switch (this.particleDirections[this.particleDir]) {
          case "right":
            p.x += p.vel;
            if (p.x >= canvasX) {
              p.vel = 0;
              p.size = 0;
            }
            break;
          case "left":
            p.x -= p.vel;
            if (p.x < 0) {
              p.vel = 0;
              p.size = 0;
            }
            break;
          case "up":
            p.y -= p.vel;
            if (p.y < 0) {
              p.vel = 0;
              p.size = 0;
            }
            break;
          case "down":
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

      let numPackets = 0,
        inPackets = 0,
        outPackets = 0,
        totalLen = 0;
      if (this.regionRestriction == "none") {
        numPackets = metrics.numPackets;
        inPackets = metrics.numInPackets;
        outPackets = metrics.numOutPackets;
        totalLen = metrics.totalLen;
      } else if (this.regionRestriction == "Sweden") {
        if (metrics.countries.has("Sweden")) {
          let c = metrics.countries.get("Sweden");
          numPackets = c.numPackets;
          inPackets = c.in;
          outPackets = c.out;
          totalLen = c.totalLen;
        }
      } else if (this.regionRestriction == "Europe") {
        if (metrics.continents.has("Europe")) {
          let c = metrics.continents.get("Europe");
          numPackets = c.numPackets;
          inPackets = c.in;
          outPackets = c.out;
          totalLen = c.totalLen;
        }
      }

      if (this.sections[this.playhead.sectionIndex].name == "all") {
        this.textObject.setNumber(numPackets.toString());
      } else if (this.sections[this.playhead.sectionIndex].name == "in") {
        this.textObject.setNumber(inPackets.toString());
      } else if (this.sections[this.playhead.sectionIndex].name == "out") {
        this.textObject.setNumber(outPackets.toString());
      } else if (this.sections[this.playhead.sectionIndex].name == "size") {
        this.textObject.setNumber(totalLen.toString());
      }

      textSize(24);
      textAlign(CENTER, CENTER);
      textFont(antonFont);
      fill(75, 0, Math.pow(this.backgroundAlpha, 2) * 100, 100);
      this.textObject.draw();
      if (this.textObject.update(dt) == 1) {
        this.backgroundAlphaChange *= -1;
        // console.log("Change direction, this.backgroundAlphaChange: " + this.backgroundAlphaChange);
        if (this.backgroundAlphaChange > 0) {
          this.particleDir =
            (this.particleDir + 1) % this.particleDirections.length;
        }
      }
    } else if (this.playhead.state == "fade out") {
      this.pg.noStroke();
      this.pg.colorMode(HSL, 100);
      // let backgroundHue = rollingNumPackets / 100.0 - 2.0;
      let backgroundHue = Math.min(
        (metrics.rollingTotalLen / 1000000.0 - 2.0) * 3.0,
        9.0
      );
      // console.log(backgroundHue);
      this.pg.fill(backgroundHue, 100, backgroundHue * 4.0, 50);
      this.pg.rect(0, 0, canvasX, canvasY);
      for (let p of this.particles) {
        this.pg.fill(p.hue, p.saturation, p.lightness);
        this.pg.ellipse(p.x, p.y, p.size, p.size);
        switch (this.particleDirections[this.particleDir]) {
          case "right":
            p.x += p.vel;
            if (p.x >= canvasX) {
              p.vel = 0;
              p.size = 0;
            }
            break;
          case "left":
            p.x -= p.vel;
            if (p.x < 0) {
              p.vel = 0;
              p.size = 0;
            }
            break;
          case "up":
            p.y -= p.vel;
            if (p.y < 0) {
              p.vel = 0;
              p.size = 0;
            }
            break;
          case "down":
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
    }
  }
  reset(sections) {
    // This is called to reset the state of the Scene
    this.sections = sections;
  }
  registerPacket(internalData, country, continent) {
    if (this.playhead.state != "fade out") {
      if (this.regionRestriction == "none") {
        this.addParticle(internalData.len);
      } else if (
        (this.regionRestriction == "Sweden" && country == "Sweden") ||
        (this.regionRestriction == "Europe" && continent == "Europe")
      ) {
        this.addParticle(internalData.len);
      }
    }
  }
  addParticle(len) {
    this.averageLen = this.averageLen * 0.9 + len * 0.1;
    if (len > 1) {
      let lightness = 1.0 - Math.pow(1.0 - this.averageLen / 20000.0, 3.0);
      let x, y;
      switch (this.particleDirections[this.particleDir]) {
        case "right":
          x = -10;
          y = Math.random() * canvasY;
          break;
        case "left":
          x = canvasX * subsampling + 10;
          y = Math.random() * canvasY;
          break;
        case "up":
          y = canvasY * subsampling + 10;
          x = Math.random() * canvasX;
          break;
        case "down":
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
    this.playhead.state = "fade in";
    this.playhead.countdown = duration;
    this.playhead.fadeInDuration = duration;
    console.log("Fade in numbers");
  }
  fadeOut(duration) {
    // Called from within the Scene when the "fade out" section starts
    this.playhead.state = "fade out";
    console.log("Fade out numbers");
  }
  play() {
    // Called when this Scene becomes the current Scene (after the crossfade)
    this.playhead.sectionIndex = -1;
    this.playhead.state = "playing";
    this.playhead.countdown = 0;
    resetMetrics();
    console.log("Play numbers");
  }
}

class TextObject {
  constructor(label, line, timeLabel, timeNumber) {
    this.height = height;
    this.width = width;
    this.label = label;
    this.number = "";
    this.line = line;
    this.timeLabel = timeLabel;
    this.timeNumber = timeNumber;
    this.blinking = false;
    this.currentTextIndex = 0;
    this.textTimeGap = 0.7;
    this.drawLabel = true;
    this.currentState = 1; // 1 = text, 0 = off
    this.countdown = timeLabel;
    this.fullCountdownTime = timeLabel;
    this.textSize = 16.0;
    this.textGrowth = 24.0 / 5.0;
    this.crossedHalfWay = false;
  }
  setNewIteration(label, timeLabel, timeNumber) {
    this.label = label;
    this.timeLabel = timeLabel - this.textTimeGap;
    this.timeNumber = timeNumber - this.textTimeGap;
    this.drawLabel = true;
    this.currentState = 1;
    this.textSize = 16.0;
    this.countdown = this.timeLabel;
    this.fullCountdownTime = this.timeLabel;
    this.crossedHalfWay = false;
  }
  setNumber(text) {
    this.number = text;
  }
  draw() {
    if (this.currentState == 1) {
      const lines = [
        48 * subsampling,
        130 * subsampling,
        214 * subsampling,
        297 * subsampling,
      ];
      let texts;
      if (this.drawLabel) {
        texts = this.label;
      } else {
        texts = this.number;
      }
      textSize(this.textSize * subsampling);
      if (typeof texts === "string" || texts instanceof String) {
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
    if (
      this.countdown / this.fullCountdownTime <= 0.8 &&
      this.currentState == 1 &&
      this.crossedHalfWay == false
    ) {
      this.crossedHalfWay = true;
      return 1;
    }
    if (this.countdown <= 0) {
      this.currentState = 1 - this.currentState;
      if (this.currentState == 0) {
        this.countdown = this.textTimeGap;
        this.fullCountdownTime = this.textTimeGap;
      } else if (this.currentState == 1 && this.drawLabel) {
        this.drawLabel = false;
        this.countdown = this.timeNumber;
        this.fullCountdownTime = this.timeNumber;
        this.textSize = 16.0;
        this.textGrowth = 24.0 / 5.0;
        this.crossedHalfWay = false;
      }
    }
    return 0;
  }
}
