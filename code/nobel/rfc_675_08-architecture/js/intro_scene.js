class IntroScene extends Scene {
  constructor() {
    super();

    //GENERAL

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
        b: 43,
      },
      orange: {
        r: 225,
        g: 170,
        b: 71,
      },
      lightBlue: {
        r: 74,
        g: 157,
        b: 224,
      },
      darkGreen: {
        r: 101,
        g: 167,
        b: 140,
      },
      darkBlue: {
        r: 0,
        g: 31,
        b: 179,
      },
      white: {
        r: 100,
        g: 100,
        b: 100,
      },
    };

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
      },
    };

    this.fontSize = {
      tittle: 28 * subsampling,
      number: 8 * subsampling,
      countries: 12 * subsampling,
      rfc: 16 * subsampling,
    };

    this.focusLocation = {
      europe: "EU",
      america: "AME",
      asia: "AS",
      africa: "AF",
      oceanica: "OC",
    };

    this.canvasSize = {
      width: 208 * subsampling,
      height: 360 * subsampling,
    };

    this.standardBlobSize = canvasX / 3;
    this.blobSize = this.standardBlobSize;
    this.shaderAlpha = 1.0;
    this.sceneAlpha = 1.0;
    this.backgroundAlpha = 1.0;
    this.playhead = {
      sectionIndex: 0,
      countdown: 0,
      state: "before start", // "playing", "fade in", "end of movement"
    };
    this.sections = [];

    this.myFont;

    this.fontURL = "./assets/fonts/Anton-Regular.ttf";

    //LOGOS
    this.visualIntro;
    this.logoKTH;
    this.logoNobel;
    this.logoRethart;

    ////////////////////////////////////////////////////////////////////////////////////
    // SHADER
    /////////////////////////////////////////////////////////////////////////////////////////////

    this.vertexShader = `
  
  // Get the position attribute of the geometry
  attribute vec3 aPosition;
  
  // Get the texture coordinate attribute from the geometry
  attribute vec2 aTexCoord;
  
  // Get the vertex normal attribute from the geometry
  attribute vec3 aNormal;
  
  // When we use 3d geometry, we need to also use some builtin variables that p5 provides
  // Most 3d engines will provide these variables for you. They are 4x4 matrices that define
  // the camera position / rotation, and the geometry position / rotation / scale
  // There are actually 3 matrices, but two of them have already been combined into a single one
  // This pre combination is an optimization trick so that the vertex shader doesn't have to do as much work
  
  // uProjectionMatrix is used to convert the 3d world coordinates into screen coordinates 
  uniform mat4 uProjectionMatrix;
  
  // uModelViewMatrix is a combination of the model matrix and the view matrix
  // The model matrix defines the object position / rotation / scale
  // Multiplying uModelMatrix * vec4(aPosition, 1.0) would move the object into it's world position
  
  // The view matrix defines attributes about the camera, such as focal length and camera position
  // Multiplying uModelViewMatrix * vec4(aPosition, 1.0) would move the object into its world position in front of the camera
  uniform mat4 uModelViewMatrix;
  
  // Get the framecount uniform
  uniform float uFrameCount;
  
  // Get the noise texture
  uniform sampler2D uNoiseTexture;
  
  varying vec2 vTexCoord;
  varying vec3 vNoise;
  
  
  void main() {
  
    // Sample the noise texture
    // We will shift the texture coordinates over time to make the noise move
    float tile = 2.0;
    float speed = 0.002;
    vec4 noise = texture2D(uNoiseTexture, fract(aTexCoord * tile + uFrameCount * speed));
  
    // Send the noise color to the fragment shader
    vNoise = noise.rgb;
  
    // copy the position data into a vec4, using 1.0 as the w component
    vec4 positionVec4 = vec4(aPosition, 1.0);
  
    // Amplitude will determine the amount of the displacement
    float amplitude = 1.0;
  
    // add the noise to the position, and multiply by the normal to move along it. 
    positionVec4.xyz += (noise.rgb - 0.5 ) * aNormal * amplitude;
  
    // Move our vertex positions into screen space
    // The order of multiplication is always projection * view * model * position
    // In this case model and view have been combined so we just do projection * modelView * position
    gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
  
    // Send the texture coordinates to the fragment shader
    vTexCoord = aTexCoord;
  }
  `;

    this.backgroundFragShader = `  
  precision mediump float;
  
  varying vec2 vTexCoord;
  
  // Get the normal from the vertex shader
  varying vec3 vNoise;
  
  void main() {
  
  vec3 color = vNoise;
  
  // Lets just draw the texcoords to the screen
  gl_FragColor = vec4(color ,1.0);
  }
  `;

    this.backgroundShader;
    this.shaderGraphics;
    this.noise;
  }
  preload() {
    // This function is called from the p5 preload function. Use it
    // to load assets such as fonts and shaders.
    this.myFont = loadFont(this.fontURL);
    this.logoKTH = loadImage("./assets/img/kth_logo.png");
    this.logoNobel = loadImage("./assets/img/nobel_logo.png");
    this.logoRethart = loadImage("./assets/img/rethread_logo.png");
    this.noise = loadImage("./assets/img/noise.png");
  }
  setup() {
    // This function is called from the p5 setup function. Use it to init
    // all the state that requires p5 to be loaded (such as instantiating
    // p5 types like p5.Vector or createGraphics).
    //PIXEL DENSITY TO REMOVE
    // pixelDensity(15.0);

    this.visualIntro = new VisualIntro(
      this.myFont,
      this.positions,
      this.fontSize,
      this.colorPallete,
      this.logoKTH,
      this.logoNobel,
      this.logoRethart
    );
    textFont("sans");
    textSize(28 * subsampling);
    textAlign(CENTER, CENTER);
    textFont(this.myFont);

    //SHADER CONFIG
    this.shaderGraphics = createGraphics(canvasX, canvasY, WEBGL);
    this.shaderGraphics.noStroke();
    this.backgroundShader = this.shaderGraphics.createShader(
      this.vertexShader,
      this.backgroundFragShader
    );
  }
  draw(dt) {
    // Update state and draw. dt is the time since last frame in seconds.

    if (this.playhead.state == "before start") {
      return;
    } else if (this.playhead.state == "fade in") {
      this.playhead.countdown -= dt;
      let progression = this.playhead.countdown / this.playhead.totalDuration;
      progression = Math.cos(progression * Math.PI) * 0.5 + 0.5; // Smoother motion

      // lerp between current progression and previous one
      this.blobSize =
        this.standardBlobSize * (1.0 - progression) +
        canvasX * 1.3 * progression;

      this.sceneAlpha = Math.max(1.0 - Math.pow(progression, 0.5) * 3.0, 0.0);
      this.backgroundAlpha = 1.0;
      this.shaderAlpha = 1.0;

      if (progression > 0.8) {
        // When the blob covers the screen we want it to start fading out with the new scene in the background
        this.backgroundAlpha = 0.0;
        this.shaderAlpha = 1.0 - Math.pow((progression - 0.8) / 0.2, 4.0);
      }
      // Will pass from the "fade in" state by play() being called externally
    } else if (
      this.playhead.state == "playing" ||
      this.playhead.state == "fade out"
    ) {
      this.playhead.countdown -= dt;
      if (this.playhead.countdown <= 0) {
        this.playhead.sectionIndex += 1;
        if (this.playhead.sectionIndex < this.sections.length) {
          this.playhead.countdown = this.sections[
            this.playhead.sectionIndex
          ].duration;
          if (this.sections[this.playhead.sectionIndex].name == "fade out") {
            this.fadeOut(this.sections[this.playhead.sectionIndex].duration);
          } else {
            this.blobSize = this.standardBlobSize;
            this.shaderAlpha = 1.0;
            this.sceneAlpha = 1.0;
            this.backgroundAlpha = 1.0;
          }
        }
      }
    }
    if (this.playhead.state == "fade out") {
      let progression =
        1.0 - this.playhead.countdown / this.playhead.totalDuration;
      progression = 1.0 - (Math.cos(progression * Math.PI) * 0.5 + 0.5); // Smoother motion
      // lerp between current progression and previous one
      this.blobSize =
        this.standardBlobSize * (1.0 - progression) +
        canvasX * 1.3 * progression;

      this.sceneAlpha = Math.max(1.0 - Math.pow(progression, 0.5) * 3.0, 0.0);
      this.backgroundAlpha = 1.0;
      this.shaderAlpha = 1.0;
      if (progression > 0.8) {
        // When the blob covers the screen we want it to start fading out with the new scene in the background
        this.backgroundAlpha = 0.0;
        this.shaderAlpha = 1.0 - Math.pow((progression - 0.8) / 0.2, 4.0);
      }
    }
    if (
      this.playhead.state == "playing" ||
      this.playhead.state == "fade out" ||
      this.playhead.state == "fade in"
    ) {
      background(0, 0, 0, this.backgroundAlpha * 100);
      // clear();
      //DRAW SHADER
      // shaderGraphics.background(0);
      this.shaderGraphics.clear();
      // shader() sets the active shader with our shader
      this.shaderGraphics.shader(this.backgroundShader);

      // Send the frameCount to the shader
      this.backgroundShader.setUniform("uFrameCount", frameCount);
      this.backgroundShader.setUniform("uNoiseTexture", this.noise);

      this.shaderGraphics.translate(0, 0);
      // Rotate our geometry on the X and Y axes
      this.shaderGraphics.rotateX(0.01);
      this.shaderGraphics.rotateY(0.005);

      // Draw some geometry to the screen
      // We're going to tessellate the sphere a bit so we have some more geometry to work with
      this.shaderGraphics.sphere(this.blobSize, 200, 100);

      // Draw the shader to main canvas
      drawingContext.globalAlpha = this.shaderAlpha;
      image(this.shaderGraphics, 0, 0, canvasX, canvasY);

      // Draw text
      colorMode(RGB, 100);

      drawingContext.globalAlpha = this.sceneAlpha;
      this.visualIntro.updateData();
      this.visualIntro.display();
      drawingContext.globalAlpha = 1.0;
    }
  }
  reset(sections) {
    // This is called to reset the state of the Scene before it is started
    this.sections = sections;
    this.playhead = {
      sectionIndex: 0,
      countdown: 0,
      state: "before start", // "playing", "fade in", "end of movement"
    };

    console.log("Reset intro");
  }
  registerPacket(internalData, country, continent) {}
  fadeIn(duration) {
    // Called when the previous scene is starting to fade out
    this.playhead.state = "fade in";
    this.countdown = duration;
    this.playhead.totalDuration = duration;
  }
  fadeOut(duration) {
    // Called from within the Scene when the "fade out" section starts
    this.playhead.state = "fade out";
    this.playhead.countdown = duration;
    this.playhead.totalDuration = duration;
  }
  play() {
    // Called when this Scene becomes the current Scene (after teh crossfade)
    this.playhead.sectionIndex = -1;
    this.playhead.state = "playing";
    this.playhead.countdown = 0;
    console.log("Play intro");
  }

  zIndex() {
    // Return the z index of the scene when in a transition. The higher z index is drawn on top of the lower one.
    return 10;
  }
}

class VisualIntro {
  constructor(
    font,
    positions,
    fontSize,
    colorPallete,
    logoKTH,
    logoNobel,
    logoRethart
  ) {
    this.font = font;
    this.positions = positions;
    this.fontSize = fontSize;
    this.colorPallete = colorPallete;

    this.tick = 500;
    this.time = Date.now() + this.tick;
    this.showTick = true;
    this.tickCounter = 0;
    this.tickLimiter = 3;
    this.logoKTH = logoKTH;
    this.logoNobel = logoNobel;
    this.logoRethart = logoRethart;

    this.message = [
      {
        top: "TO",
        bottom: "EU",
      },
      {
        top: "TO",
        bottom: "AMERICA",
      },
      {
        top: "TO",
        bottom: "ASIA",
      },
      {
        top: "TO",
        bottom: "AFRICA",
      },
      {
        top: "TO",
        bottom: "OCEANIA",
      },
    ];

    this.crossPoints = [
      this.positions.row.r1 + 25 * subsampling,

      this.positions.row.r3 - 25 * subsampling,
    ];
    this.messagePos = 0;
    this.liveSign = new LiveSign("", antonFont, true);
  }

  //UPDATE ALL THE DATA
  updateData() {
    // this.updateTickTime();
    this.liveSign.updateTickTime();
  }

  //RENDER ALL THE ELEMENTS
  display() {
    this.writeText();
    this.drawDecorations();
    this.drawImages();
    this.liveSign.draw();
    // this.drawTick();
  }

  writeText() {
    const { r, g, b } = this.colorPallete.white;
    fill(r, g, b);
    noStroke();
    textFont("sans");
    textSize(this.fontSize.tittle);
    textAlign(LEFT, TOP);
    textFont(antonFont);
    text(
      "STOCKHOLM'S",
      this.positions.row.r1,
      this.positions.col.c1 - 4 * subsampling
    );
    text(
      "INTERNET IN",
      this.positions.row.r1,
      this.positions.col.c2 - 2 * subsampling
    );
    text(
      "REAL TIME",
      this.positions.row.r1,
      this.positions.col.c3 - 2 * subsampling
    );
    textAlign(LEFT, TOP);
    textSize(this.fontSize.rfc);
    text(
      "RFC 675:08",
      this.positions.row.r1,
      this.positions.col.c4 + 4 * subsampling
    );
  }

  //RENDER ALL THE ELEMENTS
  display() {
    this.writeText();
    this.drawTick();
    this.drawDecorations();
    this.drawImages();
  }

  drawDecorations() {
    for (let i = 0; i < 7; i++) {
      const { r, g, b } = this.showTick
        ? this.colorPallete.white
        : this.colorPallete.orange;
      stroke(r, g, b);
      strokeWeight(1 * subsampling);
      const x = this.crossPoints[0];
      const y = (i * 80 + 20) * subsampling;
      const padding = 3 * subsampling;
      line(x, y - padding, x, y + padding);
      line(x + padding, y, x - padding, y);

      const x2 = this.crossPoints[1];
      line(x2, y - padding, x2, y + padding);
      line(x2 + padding, y, x2 - padding, y);
    }
  }

  //DRAW THE TICK
  //showstick then draw or not
  drawTick() {
    if (this.showTick) {
      const posX = 10 * subsampling;
      const { top, bottom } = this.message[this.messagePos];

      noStroke();
      let { r, g, b } = this.colorPallete.white;
      fill(r, g, b, 100);
      rect(
        this.positions.row.r1 - 7 * subsampling,
        this.positions.col.c1 + 4 * subsampling,
        4 * subsampling,
        24 * subsampling
      );

      textFont("sans");
      textSize(this.fontSize.number);
      textAlign(RIGHT, TOP);
      textFont(antonFont);

      fill(
        this.colorPallete.red.r,
        this.colorPallete.red.g,
        this.colorPallete.red.b,
        100
      );
      text(
        bottom,
        this.positions.row.r1 - posX,
        this.positions.col.c1 + 18 * subsampling
      );
      text("LIVE", this.positions.row.r1 - posX, this.positions.col.c1 + 3);
      circle(
        this.positions.row.r1 - 28 * subsampling,
        this.positions.col.c1 + 8 * subsampling,
        7 * subsampling
      );
      // text(top, this.positions.row.r1 - posX, this.positions.col.c1 + 3);
    }
  }

  drawDecorations() {
    for (let i = 0; i < 7; i++) {
      const { r, g, b } = this.showTick
        ? this.colorPallete.white
        : this.colorPallete.orange;
      stroke(r, g, b);
      strokeWeight(1 * subsampling);
      const x = this.crossPoints[0];
      const y = (i * 80 + 20) * subsampling;
      const padding = 3 * subsampling;
      line(x, y - padding, x, y + padding);
      line(x + padding, y, x - padding, y);

      const x2 = this.crossPoints[1];
      line(x2, y - padding, x2, y + padding);
      line(x2 + padding, y, x2 - padding, y);
    }
  }

  drawImages() {
    const imgSize = {
      x: 40,
      y: 40,
    };
    image(
      this.logoNobel,
      this.positions.row.r1 + 4 * subsampling,
      this.positions.col.c5 + 3,
      imgSize.x * subsampling,
      imgSize.y * subsampling
    );
    image(
      this.logoKTH,
      this.positions.row.r3 - 44 * subsampling,
      this.positions.col.c5 + 3 * subsampling,
      imgSize.x * subsampling,
      imgSize.y * subsampling
    );
    image(
      this.logoRethart,
      this.positions.row.r3 - 47 * subsampling,
      this.positions.col.c4 + 11 * subsampling,
      46.25 * subsampling,
      8.96 * subsampling
    );
  }
}
