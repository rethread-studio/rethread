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
        len: 0,
        activated: false,
      });
    }
    this.particleSpeed = 1.0;
    this.particleStartSpeed = 1.0;
    this.particleEndSpeed = 1.0;
    this.particleNextStartSpeed = 1.0;
    this.particleNextEndSpeed = 1.0;

    this.averageLen = 0;
    this.currentParticleDir = "down";
    this.nextParticleDir = "down";
    this.backgroundAlphaChangeSpeed = 0.9;
    this.backgroundAlphaChange = this.backgroundAlphaChangeSpeed;
    this.backgroundAlpha = 0;

    this.particleAsTextLimit = 100;
    this.particleAsTextStartLimit = 100;
    this.nextParticleAsTextStartLimit = 100;
    this.particleAsTextEndLimit = 100;
    this.nextParticleAsTextEndLimit = 100;

    this.regionRestriction = "none";
    this.sections = [];
    this.playhead = {
      sectionIndex: 0,
      countdown: 0,
      dropsTimeCountdown: 0,
      state: "before start", // "playing", "fade in", "end of movement"
    };
    this.fadeOutDirectionTime = 1.0;
    this.liveSign;
  }
  preload() {
    // This function is called from the p5 preload function. Use it
    // to load assets such as fonts and shaders.
  }
  setup() {
    // This function is called from the p5 steup function. Use it to init
    // all the state that requires p5 to be loaded (such as instantiating
    // p5 types like p5.Vector or createGraphics).
    this.liveSign = new LiveSign("", antonFont, false);
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
      this.playhead.dropsTimeCountdown -= dt;
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
          if(this.textDuration < 4.0) {
            this.textDuration = 4.0;
          }
          this.dropsDuration = this.directionDuration - this.textDuration;

          resetMetrics(); // We want fresh numbers per region for example

          if ("region" in this.sections[this.playhead.sectionIndex]) {
            this.regionRestriction = this.sections[
              this.playhead.sectionIndex
            ].region;
          } else {
            this.regionRestriction = "none";
          }

          if ("textLimit" in this.sections[this.playhead.sectionIndex]) {
            this.nextParticleAsTextStartLimit = this.sections[
              this.playhead.sectionIndex
            ].textLimit;
            this.nextParticleAsTextEndLimit = this.nextParticleAsTextStartLimit;
          } else {
            this.nextParticleAsTextStartLimit = 100;
            this.nextParticleAsTextEndLimit = this.nextParticleAsTextStartLimit;
          }

          if ("startTextLimit" in this.sections[this.playhead.sectionIndex]) {
            this.nextParticleAsTextStartLimit = this.sections[
              this.playhead.sectionIndex
            ].startTextLimit;
          }
          if ("endTextLimit" in this.sections[this.playhead.sectionIndex]) {
            this.nextParticleAsTextEndLimit = this.sections[
              this.playhead.sectionIndex
            ].endTextLimit;
          }

          if ("speed" in this.sections[this.playhead.sectionIndex]) {
            this.particleNextStartSpeed = this.sections[
              this.playhead.sectionIndex
            ].speed;
            this.particleNextEndSpeed = this.particleNextStartSpeed;
          } else {
            this.particleNextStartSpeed = 1.0;
            this.particleNextEndSpeed = this.particleNextStartSpeed;
          }

          if ("startSpeed" in this.sections[this.playhead.sectionIndex]) {
            this.particleNextStartSpeed = this.sections[
              this.playhead.sectionIndex
            ].startSpeed;
          }
          if ("endSpeed" in this.sections[this.playhead.sectionIndex]) {
            this.particleNextEndSpeed = this.sections[
              this.playhead.sectionIndex
            ].endSpeed;
          }

          if (
            this.sections[this.playhead.sectionIndex].name == "fade out" ||
            this.sections[this.playhead.sectionIndex].name == "pre fade out"
          ) {
            this.fadeOut();
          } else if (this.sections[this.playhead.sectionIndex].name == "all") {
            this.textObject.setNewIteration(
              ["PACKETS OF", "INTERNET", "ACTIVITY"],
              this.regionRestriction,
              this.textDuration,
              this.dropsDuration
            );
            this.nextParticleDir = "down";
          } else if (this.sections[this.playhead.sectionIndex].name == "in") {
            this.textObject.setNewIteration(
              ["INTO", "STOCKHOLM", "FROM"],
              this.regionRestriction,
              this.textDuration,
              this.dropsDuration
            );
            this.nextParticleDir = "right";
          } else if (this.sections[this.playhead.sectionIndex].name == "out") {
            this.textObject.setNewIteration(
              ["OUT OF", "STOCKHOLM", "TO"],
              this.regionRestriction,
              this.textDuration,
              this.dropsDuration
            );
            this.nextParticleDir = "left";
          } else if (this.sections[this.playhead.sectionIndex].name == "size") {
            this.textObject.setNewIteration(
              ["COUNTING", "BITS AND", "PIECES"],
              this.regionRestriction,
              this.textDuration,
              this.dropsDuration
            );
            this.nextParticleDir = "up";
          } else if (
            this.sections[this.playhead.sectionIndex].name == "multinumbers"
          ) {
            this.textObject.setNewIteration(
              ["COMMUNICATION", "IN", "NUMBERS"],
              this.regionRestriction,
              this.textDuration,
              this.dropsDuration
            );
            this.nextParticleDir = "up";
          }

          // if (this.regionRestriction != "none") {
          //   this.textObject.label.push(this.regionRestriction.toUpperCase());
          // }
        }
      }

      background("rgba(1.0,1.0,1.0,1.0)");

      let dropProgress =
        1.0 -
        Math.max(this.playhead.dropsTimeCountdown / this.dropsDuration, 0.0);
      this.particleAsTextLimit =
        this.particleAsTextStartLimit +
        dropProgress *
          (this.particleAsTextEndLimit - this.particleAsTextStartLimit);

      this.particleSpeed =
        this.particleStartSpeed +
        dropProgress * (this.particleEndSpeed - this.particleStartSpeed);
      // console.log(this.particleAsTextLimit);

      // Draw particles to Graphics
      this.pg.noStroke();
      this.pg.colorMode(HSL, 100);
      // let backgroundHue = rollingNumPackets / 100.0 - 2.0;
      let backgroundHue =
        Math.min((metrics.rollingTotalLen / 1000000.0 - 2.0) * 2.0, 7.0) - 2.0;
      // console.log(backgroundHue);
      // this.pg.fill(
      //   backgroundHue,
      //   100 - backgroundHue * 3,
      //   7 + backgroundHue * 3.0,
      //   50
      // );
      // this.pg.rect(0, 0, canvasX, canvasY);
      this.pg.background(0, 0, 0, 50);
      for (let p of this.particles) {
        if (p.activated) {
          this.pg.fill(p.hue, p.saturation, p.lightness + 10, 100);
          if (p.size > subsampling * this.particleAsTextLimit) {
            this.pg.textSize(p.size * 2);
            this.pg.text(p.len, p.x, p.y);
          } else {
            this.pg.ellipse(p.x, p.y, p.size, p.size);
          }

          switch (this.currentParticleDir) {
            case "right":
              p.x += p.vel * this.particleSpeed;
              if (p.x > canvasX * 1.1) p.activated = false;
              break;
            case "left":
              p.x -= p.vel * this.particleSpeed;
              if (p.x < canvasX * -0.1) p.activated = false;
              break;
            case "up":
              p.y -= p.vel * this.particleSpeed;
              if (p.y < canvasY * -0.1) p.activated = false;
              break;
            case "down":
              p.y += p.vel * this.particleSpeed;
              if (p.y > canvasY * 1.1) p.activated = false;
              break;
            default:
          }
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
      if (
        this.regionRestriction == "none" ||
        this.regionRestriction == "The World"
      ) {
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
      } else if (
        this.sections[this.playhead.sectionIndex].name == "multinumbers"
      ) {
        this.textObject.setNumber([
          inPackets.toString(),
          outPackets.toString(),
          numPackets.toString(),
          totalLen.toString(),
        ]);
      }

      let textBrightness = Math.pow(this.backgroundAlpha, 2.0);
      this.textObject.draw(textBrightness);
      let updateResult = this.textObject.update(dt);
      if (updateResult == 1 || updateResult == -1) {
        this.backgroundAlphaChange =
          this.backgroundAlphaChangeSpeed * updateResult;
        if (this.backgroundAlphaChange > 0) {
          this.currentParticleDir = this.nextParticleDir;
          this.particleSpeed = this.nextParticleSpeed;
          this.particleAsTextStartLimit = this.nextParticleAsTextStartLimit;
          this.particleAsTextEndLimit = this.nextParticleAsTextEndLimit;
          this.particleAsTextLimit = this.particleAsTextStartLimit;
          this.particleStartSpeed = this.particleNextStartSpeed;
          this.particleEndSpeed = this.particleNextEndSpeed;
          this.particleSpeed = this.particleStartSpeed;
          this.playhead.dropsTimeCountdown = this.playhead.countdown;
          this.dropsDuration = this.playhead.countdown;
        }
      }
    } else if (this.playhead.state == "fade out") {
      this.playhead.dropsTimeCountdown -= dt;
      this.playhead.countdown -= dt;

      let dropProgress =
        1.0 -
        Math.max(this.playhead.dropsTimeCountdown / this.dropsDuration, 0.0);
      this.particleAsTextLimit =
        this.particleAsTextStartLimit +
        dropProgress *
          (this.particleAsTextEndLimit - this.particleAsTextStartLimit);

      this.particleSpeed =
        this.particleStartSpeed +
        dropProgress * (this.particleEndSpeed - this.particleStartSpeed);

      this.pg.colorMode(HSL, 100);
      this.pg.background(0, 0, 0, 50);
      for (let p of this.particles) {
        if (
          p.x > -10 &&
          p.x < canvasX + 10 &&
          p.y > -10 &&
          p.y < canvasY + 10
        ) {
          this.pg.fill(p.hue, p.saturation, p.lightness);
          if (p.size > subsampling * this.particleAsTextLimit) {
            this.pg.textSize(p.size * 2);
            this.pg.text(p.len, p.x, p.y);
          } else {
            this.pg.ellipse(p.x, p.y, p.size, p.size);
          }
        }

        switch (this.currentParticleDir) {
          case "right":
            p.x += p.vel * this.particleSpeed;

            break;
          case "left":
            p.x -= p.vel * this.particleSpeed;

            break;
          case "up":
            p.y -= p.vel * this.particleSpeed;

            break;
          case "down":
            p.y += p.vel * this.particleSpeed;

            break;
          default:
        }
      }

      this.fadeOutDirectionCountdown -= dt;
      if (this.fadeOutDirectionCountdown <= 0.0) {
        this.fadeOutDirectionCountdown = this.fadeOutDirectionTime;
        this.fadeOutDirectionTime = Math.random() * 0.7 + 0.2;
        this.currentParticleDir = this.nextParticleDir;
        const dirs = ["down", "right", "up", "left"];
        this.nextParticleDir = dirs[Math.floor(Math.random() * dirs.length)];
      }

      drawingContext.globalAlpha = Math.pow(this.backgroundAlpha, 2);
      image(this.pg, 0, 0, canvasX, canvasY);
      drawingContext.globalAlpha = 1.0;
    }
    this.liveSign.updateTickTime();
    this.liveSign.draw();
  }
  reset(sections) {
    // This is called to reset the state of the Scene
    this.sections = sections;
    this.averageLen = 0;
    this.currentParticleDir = "down";
    this.nextParticleDir = "down";
    this.backgroundAlphaChange = 0;
    this.backgroundAlpha = 0;
    this.regionRestriction = "none";
    this.particleIndex = 0;
    this.particleAsTextStartLimit = 100;
    this.nextParticleAsTextStartLimit = 100;
    this.particleAsTextEndLimit = 100;
    this.nextParticleAsTextEndLimit = 100;
    this.particleSpeed = 1.0;
  }
  registerPacket(internalData, country, continent) {
    if (this.playhead.state == "playing" || this.playhead.state == "fade out") {
      if (
        this.regionRestriction == "none" ||
        this.regionRestriction == "The World"
      ) {
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
      switch (this.currentParticleDir) {
        case "right":
          x = -10;
          y = Math.random() * canvasY;
          break;
        case "left":
          x = canvasX + 10;
          y = Math.random() * canvasY;
          break;
        case "up":
          y = canvasY + 10;
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
      pa.vel = (Math.random() * 10 + 5) * subsampling * 1.0;
      pa.size = (Math.min(Math.max(len / 10000, 1), 8.0) + 1.0) * subsampling;
      pa.len = len;
      pa.hue = Math.pow(lightness, 2.0) * 15;
      pa.saturation = 100;
      pa.lightness = lightness * 70 + 10;
      pa.activated = true;
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
    this.currentParticleDir = "down";
    this.nextParticleDir = "right";
    this.fadeOutDirectionCountdown = this.fadeOutDirectionTime;
    this.particleSpeed = this.nextParticleSpeed;
    this.particleAsTextStartLimit = this.nextParticleAsTextStartLimit;
    this.particleAsTextEndLimit = this.nextParticleAsTextEndLimit;
    this.particleAsTextLimit = this.particleAsTextStartLimit;
    this.particleStartSpeed = this.particleNextStartSpeed;
    this.particleEndSpeed = this.particleNextEndSpeed;
    this.particleSpeed = this.particleStartSpeed;
    this.playhead.dropsTimeCountdown = this.playhead.countdown;
    this.dropsDuration = this.playhead.countdown;
    console.log("Fade out numbers");
  }
  play() {
    // Called when this Scene becomes the current Scene (after the crossfade)
    this.playhead.sectionIndex = -1;
    this.playhead.state = "playing";
    this.playhead.countdown = 0;
    textAlign(CENTER, CENTER);
    textFont(antonFont);
    resetMetrics();
    console.log("Play numbers");
  }
}

class TextObject {
  constructor(label, line, timeLabel, timeNumber) {
    this.height = height;
    this.width = width;
    this.label = label;
    this.region = "REGION";
    this.number = "";
    this.line = 2;
    this.timeLabel = timeLabel;
    this.timeNumber = timeNumber;
    this.blinking = false;
    this.currentTextIndex = 0;
    this.textTimeGap = 0.1;
    this.drawLabel = true;
    this.currentState = 1; // 1 = text, 0 = off
    this.countdown = timeLabel;
    this.fullCountdownTime = timeLabel;
    this.textSize = 16.0;
    this.textGrowth = 24.0;
    this.crossedHalfWay = false;
  }
  setNewIteration(label, region, timeLabel, timeNumber) {
    this.label = label;
    this.region = region.toUpperCase();
    this.timeLabel = (timeLabel/2) - this.textTimeGap;
    this.timeRegion = (timeLabel/2) - this.textTimeGap;
    if(this.region = "NONE") {
      this.timeLabel = timeLabel - this.textTimeGap;
      this.timeRegion = 0;
    }
    this.timeNumber = timeNumber - this.textTimeGap;
    this.drawLabel = true;
    this.drawRegion = false;
    this.currentState = 1;
    this.textSize = 16.0;
    this.countdown = this.timeLabel;
    this.fullCountdownTime = this.timeLabel;
    this.crossedHalfWay = false;
  }
  setNumber(text) {
    this.number = text;
  }
  draw(textBrightness) {
    if (this.currentState == 1) {
      colorMode(HSL, 100);
      // Make this textobject based
      let textPhase = this.countdown / this.fullCountdownTime;
      let textAlpha =
        1.0 -
        Math.min(
          Math.pow(Math.cos(textPhase * Math.PI * 2.0) * 0.5 + 0.5, 12.0),
          1.0
        );
      fill(0, 0, textBrightness * 100, textAlpha * 100);
      noStroke();
      const lines = [
        48 * subsampling,
        130 * subsampling,
        214 * subsampling,
        297 * subsampling,
      ];
      let texts;
      if (this.drawLabel) {
        texts = this.label;
      } else if(this.drawRegion) {
        texts = this.region;
      } else {
        texts = this.number;
      }
      textSize(this.textSize * subsampling);
      textAlign(CENTER, CENTER);
      if (typeof texts === "string" || texts instanceof String) {
        let y = lines[this.line];
        text(texts, width / 2, y);
      } else if (Array.isArray(texts)) {
        let startLine = 1;
        if (texts.length < 4) {
          startLine = 1;
        } else {
          startLine = 0;
        }
        for (let i = 0; i < texts.length; i++) {
          let y = lines[startLine + i];
          text(texts[i], width / 2, y);
        }
      }
    }
  }

  update(dt) {
    this.textSize +=
      Math.min(this.textGrowth / this.fullCountdownTime, 24.0 / 5.0) * dt;
    this.countdown -= dt;
    if (
      this.countdown / this.fullCountdownTime <= 0.9 &&
      this.currentState == 1 &&
      this.crossedHalfWay == false
    ) {
      this.crossedHalfWay = true;
      if (this.drawLabel == true) return -1;
      else return 1;
    }
    if (this.countdown <= 0) {
      this.currentState = 1 - this.currentState;
      if (this.currentState == 0) {
        this.countdown = this.textTimeGap;
        this.fullCountdownTime = this.textTimeGap;
      } else if (this.currentState == 1 && this.drawLabel) {
        this.drawLabel = false;
        this.drawRegion = true;
        this.fullCountdownTime = this.timeRegion;
        this.countdown = this.timeRegion;
        this.textSize = 16.0;
        this.textGrowth = 24.0;
      } else if (this.currentState == 1 && this.drawRegion) {
        this.drawRegion = false;
        this.countdown = this.timeNumber;
        this.fullCountdownTime = this.timeNumber;
        this.textSize = 16.0;
        this.textGrowth = 24.0;
        this.crossedHalfWay = false;
      }
    }
    return 0;
  }
}
