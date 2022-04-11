// Matrix text effect from here: https://betterprogramming.pub/how-to-create-the-matrix-text-effect-with-javascript-325c6bb7d96e
var tileSize = 20;
// a higher fade factor will make the characters fade quicker
var fadeFactor = 0.08;
var fadeColor = "0, 0, 0";
var textColor = "rgb(135,50,96)";

var canvas;
var ctx;

var enableMatrix = true;
var enableCodeSnippets = false;

var columns = [];
var maxStackHeight;
var codeSnippets = [
  `module.exports.grayscale = (pixels) => {
  let d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    let avg = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i + 1] = d[i + 2] = avg
  }
  return pixels;
};`,
  `// Adj is 0 (unchanged) to 1 (sepia)
module.exports.sepia = (pixels, adj) => {
  let d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = (r * (1 - (0.607 * adj))) + (g * .769 * adj) + (b * .189 * adj);
    d[i + 1] = (r * .349 * adj) + (g * (1 - (0.314 * adj))) + (b * .168 * adj);
		d[i + 2] = (r * .272 * adj) + (g * .534 * adj) + (b * (1 - (0.869 * adj)));
	}
	return pixels;
};`,
  `module.exports.invert = (pixels, adj) => {
 let d = pixels.data;
 for (let i = 0; i < d.length; i += 4) {
   d[i] = 255 - d[i];
   d[i + 1] = 255 - d[i + 1];
   d[i + 2] = 255 - d[i + 2];
 }
 return pixels;
};`,
  `/* adj should be -1 (darker) to 1 (lighter). 0 is unchanged. */
module.exports.brightness = (pixels, adj) => {
  let d = pixels.data;
  adj = (adj > 1) ? 1 : adj;
  adj = (adj < -1) ? -1 : adj;
  adj = ~~(255 * adj);
  for (let i = 0; i < d.length; i += 4) {
    d[i] += adj;
    d[i + 1] += adj;
    d[i + 2] += adj;
	}
	return pixels;
};`,
  `module.exports.hueSaturation = (pixels, adj) => {
  let d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    let hsv = util.RGBtoHSV(d[i], d[i+1], d[i+2]);
    hsv[1] *= adj;
    let rgb = util.HSVtoRGB(hsv[0], hsv[1], hsv[2])
    d[i] = rgb[0];
    d[i + 1] = rgb[1];
    d[i + 2] = rgb[2];
	}
	return pixels;
};`,
  `module.exports.saturation = (pixels, adj) => {
  let d = pixels.data;
  adj = (adj < -1) ? -1 : adj;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    let gray = 0.2989*r + 0.5870*g + 0.1140*b; //weights from CCIR 601 spec
    d[i] = -gray * adj + d[i] * (1 + adj);
    d[i + 1] = -gray * adj + d[i + 1] * (1 + adj);
    d[i + 2] = -gray * adj + d[i + 2] * (1 + adj);
  }
	return pixels;
};
`,
  `// Contrast - the adj value should be -1 to 1
module.exports.contrast = (pixels, adj) => {
  adj *= 255;
  let d = pixels.data;
  let factor = (259 * (adj + 255)) / (255 * (259 - adj));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = factor * (d[i] - 128) + 128;
    d[i + 1] = factor * (d[i + 1] - 128) + 128;
    d[i + 2] = factor * (d[i + 2] - 128) + 128;
  }
  return pixels;
};
`,
  `  importImage(image) {
    if (typeof window === 'object') { // browser
      this.canvas = document.createElement('canvas');
      this.w = this.canvas.width = image.naturalWidth * this.scale;
      this.h = this.canvas.height = image.naturalHeight * this.scale;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.drawImage(image, 0, 0, this.w, this.h);
    } else {
      let img = this.initImage();
      img.onload = () => {
        this.w = img.width * this.scale;
        this.h = img.height * this.scale;
        this.canvas = new Canvas(this.w, this.h);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.drawImage(img, 0, 0, this.w, this.h);
      };
      img.src = image;
    }
    return this;
  }`,
  `  applyFilter(effect, adjustment) {
    console.log(effect);
    let newPixels;
    let p = new Promise((resolve) => {
      this.pixels = this.ctx.getImageData(0, 0, this.w, this.h);
      newPixels = filters[effect].apply(this, [this.pixels, adjustment]);
      resolve(newPixels);
    });
    p.then(this.render(newPixels));
    return this;
  }`,
  `// Clarendon: adds light to lighter areas and dark to darker areas
module.exports.clarendon = (pixels) => {
  pixels = filters.brightness.apply(this, [pixels, 0.1]);
  pixels = filters.contrast.apply(this, [pixels, 0.1]);
  pixels = filters.saturation.apply(this, [pixels, 0.15]);
  return pixels;
};`,
  `// Gingham: Vintage-inspired, taking some color out
module.exports.gingham = (pixels) => {
  pixels = filters.sepia.apply(this, [pixels, 0.04]);
  pixels = filters.contrast.apply(this, [pixels, -0.15]);
  return pixels;
};`,
  `// Moon: B/W, increase brightness and decrease contrast
module.exports.moon = (pixels) => {
  pixels = filters.grayscale.apply(this, [pixels, 1]);
  pixels = filters.contrast.apply(this, [pixels, -0.04]);
  pixels = filters.brightness.apply(this, [pixels, 0.1]);
  return pixels;
};`,
  `// Toaster: Ages the image by "burning" the centre and adds a dramatic vignette
module.exports.toaster = (pixels) => {
  pixels = filters.sepia.apply(this, [pixels, 0.1]);
  pixels = filters.colorFilter.apply(this, [pixels, [255, 145, 0, 0.2]]);
  return pixels;
};`,
];

var codeToDraw = "";

function initBg() {
  canvas = document.querySelector("#bg");

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  resize();
  window.addEventListener("resize", resize);
  ctx = canvas.getContext("2d");

  initMatrix();

  // setTimeout(changePreset, 3000);
  // start the main loop
  tick();
}

function initMatrix() {
  maxStackHeight = Math.ceil(canvas.height / tileSize);

  // divide the canvas into columns
  for (let i = 0; i < canvas.width / tileSize; ++i) {
    var column = {};
    // save the x position of the column
    column.x = i * tileSize;
    // create a random stack height for the column
    column.stackHeight = 10 + Math.random() * maxStackHeight;
    // add a counter to count the stack height
    column.stackCounter = 0;
    // add the column to the list
    columns.push(column);
  }
}

function draw() {
  // draw a semi transparent black rectangle on top of the scene to slowly fade older characters
  ctx.fillStyle = "rgba( " + fadeColor + " , " + fadeFactor + " )";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // pick a font slightly smaller than the tile size
  ctx.font = tileSize - 2 + "px monospace";
  // ctx.fillStyle = " rgb(64,224,208)";
  ctx.fillStyle = textColor;
  if (enableMatrix) {
    for (let i = 0; i < columns.length; ++i) {
      // pick a random ascii character (change the 94 to a higher number to include more characters)
      var randomCharacter = String.fromCharCode(
        33 + Math.floor(Math.random() * 94)
      );
      ctx.fillText(
        randomCharacter,
        columns[i].x,
        columns[i].stackCounter * tileSize + tileSize
      );

      // if the stack is at its height limit, pick a new random height and reset the counter
      if (++columns[i].stackCounter >= columns[i].stackHeight) {
        columns[i].stackHeight = 10 + Math.random() * maxStackHeight;
        columns[i].stackCounter = 0;
      }
    }
  }

  if (enableCodeSnippets) {
    const codeLines = codeToDraw.split("\n");
    let x = Math.random() * window.innerWidth * 0.8;
    let y = Math.random() * window.innerHeight * 0.8;
    for (let i = 0; i < codeLines.length; i++) {
      ctx.fillText(codeLines[i], x, y + i * tileSize);
    }
    codeToDraw = "";
  }
}

// MAIN LOOP
function tick() {
  draw();
  if (Math.random() > 0.995) {
    if (Math.random() > 0.5) {
      textColor = "rgb(255,193,204)";
    } else {
      textColor = "rgb(64,224,208)";
    }
    // if (fadeColor == "255, 255, 255") {
    //   fadeColor = "0, 0, 0";
    //   if (Math.random() > 0.5) {
    //     textColor = "rgb(255,193,204)";
    //   } else {
    //     textColor = "rgb(64,224,208)";
    //   }
    // } else {
    //   fadeColor = "255, 255, 255";
    //   if (Math.random() > 0.5) {
    //     textColor = "rgb(54,117,136)";
    //   } else {
    //     textColor = " rgb(135,50,96)";
    //   }
    // }
  }
  if (Math.random() > 0.8) {
    codeToDraw = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
  }
  setTimeout(tick, 50);
}

function changePreset() {
  if (enableCodeSnippets && !enableMatrix) {
    enableCodeSnippets = false;
    enableMatrix = true;
  } else if (enableMatrix && !enableCodeSnippets) {
    enableCodeSnippets = true;
    enableMatrix = true;
  } else {
    enableMatrix = false;
    enableCodeSnippets = true;
  }
  setTimeout(changePreset, 10000);
}
