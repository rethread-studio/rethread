let myFont;
let sourceFile,
  data,
  m,
  n,
  sx,
  sy,
  margin = 20;

let indentSize;
let maxHeight, maxIndent, minWordLength, maxWordLength, minLineLength, maxLineLength;

let backgroundCol = 250;
let defaultTextCol = 255 - backgroundCol;

const allModes = ["DEFAULT_COLORS", "CHAR_RANDOM", "WORD_HASH", "LINE_RANDOM", "VERT_GRADIENT", "HEIGHT_GRADIENT", "LINE_GRADIENT", "HORIZ_GRADIENT", "WORD_LENGTH_GRADIENT", "INDENT_GRADIENT", "LINE_LENGTH_GRADIENT", "VERT_SEQ", "HEIGHT_SEQ", "LINE_SEQ", "HORIZ_SEQ", "WORD_LENGTH_SEQ", "INDENT_SEQ", "LINE_LENGTH_SEQ", "ALPHA", "SEPARATE", "BLOCKS"];
// WORD_SEQ, CHAR_GRADIENT

let colMode = 0;
let palette = ["#e516b8", "#8f16e5", "#165be5", "#168be5", "#16e5e5", "#16e5aa"];
let colors;
let colorScale = chroma.bezier(palette);

// IO
let IODiv; // div element that contains all the IO thingies
let colModeSelect, backgroundCheckbox, fallCheckbox;

function preload() {
  myFont = loadFont("MPLUS1Code-Regular.ttf");
  sourceFile = loadStrings("tree_extraction.txt");
}

function setup() {
  m = 0;
  n = sourceFile.length;
  maxHeight = 0, minPositiveIndent = n, maxIndent = 0, minWordLength = n, maxWordLength = 0, minLineLength = n, maxLineLength = 0;
  for (let i = 0; i < n; i++) {
    let myLine = sourceFile[i];
    let l = myLine.length;
    if (l > m) m = l;

    let indent = myLine.search(/\S|$/);
    if (indent < minPositiveIndent && indent > 0) minPositiveIndent = indent;
    if (indent > maxIndent) maxIndent = indent;

    if (l - indent < minLineLength) minLineLength = l - indent;
    if (l - indent > maxLineLength) maxLineLength = l - indent;

    for (let j = 0; j < l; j++) {
      let h = getHeight(i, j);
      if (h > maxHeight) maxHeight = h;

      let wl = getWord(i, j);
      if (wl != null) {
        if (wl.length > maxWordLength) maxWordLength = wl.length;
        if (wl.length < minWordLength) minWordLength = wl.length;
      }
    }
  }
  indentSize = minPositiveIndent;

  initArrays();

  textFont(myFont, 16);
  textAlign(LEFT, TOP);
  sx = textWidth("a");
  sy = sx * 2;

  let cnv = createCanvas(m * sx + margin, n * sy + margin);
  cnv.position((windowWidth - width) / 2, (windowHeight - height) / 2);
  cnv.style("border", "dashed 2px black");
  frameRate(10);
  //pixelDensity(4);
  noStroke();

  // IO

  IODiv = createDiv();
  IODiv.style("width", (windowWidth - width) / 2);

  let subdiv1 = createDiv();
  subdiv1.parent(IODiv);
  subdiv1.style("padding", 10);

  let fileInput = createFileInput(handleFile, false);
  //fileInput.style("color", random(palette));
  fileInput.parent(subdiv1);

  let subdiv2 = createDiv();
  subdiv2.parent(IODiv);
  subdiv2.style("padding", 10);

  colModeSelect = createSelect(false);
  //colModeSelect.position(width-210, 10);
  for (let i = 0; i < allModes.length; i++) {
    colModeSelect.option(allModes[i]);
  }
  colModeSelect.selected(allModes[0], 0);
  colModeSelect.changed(selectModeEvent);
  colModeSelect.parent(subdiv2);

  backgroundCheckbox = createCheckbox("Draw background", true);
  //backgroundCheckbox.style("color", random(palette));
  backgroundCheckbox.parent(subdiv2);

  let defaultCheckbox = createCheckbox("Black background, white text as default");
  //defaultCheckbox.style("color", random(palette));
  defaultCheckbox.changed(flipColors);
  defaultCheckbox.parent(subdiv2);

  let subdiv3 = createDiv();
  subdiv3.parent(IODiv);
  subdiv3.style("padding", 10);

  fallCheckbox = createCheckbox("Fall", false);
  //fallCheckbox.style("color", random(palette));
  //fallCheckbox.changed(() => (frameCount = 0));
  fallCheckbox.parent(subdiv3);

  let shakeButton = createButton("Shake");
  shakeButton.mousePressed(shake);
  shakeButton.parent(subdiv3);

  let shuffleLinesButton = createButton("Shuffle lines");
  shuffleLinesButton.mousePressed(shuffleLines);
  shuffleLinesButton.parent(subdiv3);

  let shuffleColumnsButton = createButton("Shuffle columns");
  shuffleColumnsButton.mousePressed(shuffleColumns);
  shuffleColumnsButton.parent(subdiv3);

  let subdiv4 = createDiv();
  subdiv4.parent(IODiv);
  subdiv4.style("padding", 10);

  let alignLeftButton = createButton("Align left");
  alignLeftButton.mousePressed(alignLeft);
  alignLeftButton.parent(subdiv4);

  let centerButton = createButton("Center");
  centerButton.mousePressed(centering);
  centerButton.parent(subdiv4);

  let alignRightButton = createButton("Align right");
  alignRightButton.mousePressed(alignRight);
  alignRightButton.parent(subdiv4);

  let justifyButton = createButton("Justify");
  justifyButton.mousePressed(justify);
  justifyButton.parent(subdiv4);

  let subdiv5 = createDiv();
  subdiv5.parent(IODiv);
  subdiv5.style("padding", 10);

  let resetButton = createButton("Reset");
  resetButton.mousePressed(() => (initArrays()));
  resetButton.parent(subdiv5);

  let saveButton = createButton("Save image");
  saveButton.mousePressed(() => (saveCanvas("decode")));
  saveButton.parent(subdiv5);
}

function draw() {
  if (backgroundCheckbox.checked()) background(backgroundCol);
  else clear();

  if (fallCheckbox.checked()) {
    // falling simulation
    let i0 = max(n - 2 - frameCount, -1);
    for (let i = n - 2; i > i0; i--) {
      for (let j = 0; j < m; j++) {
        let l = data[i][j];
        if (l.char != " ") {
          if (data[i + 1][j].char == " ") {
            [data[i][j], data[i + 1][j]] = [data[i + 1][j], data[i][j]];
          } else if (j > 0 && data[i + 1][j - 1].char == " ") {
            [data[i][j], data[i + 1][j - 1]] = [data[i + 1][j - 1], data[i][j]];
          } else if (j < m - 1 && data[i + 1][j + 1].char == " ") {
            [data[i][j], data[i + 1][j + 1]] = [data[i + 1][j + 1], data[i][j]];
          }
        }
      }
    }
  }

  // display
  let y = margin / 2 - sy / 5;
  for (let myLine of data) {
    let x = margin / 2;
    for (let letter of myLine) {
      if (letter.color) fill(letter.color);
      else fill(defaultTextCol);
      text(letter.char, x, y);
      x += sx;
    }
    y += sy;
  }
}

function initArrays() {
  if (colMode == "SEPARATE") shuffle(palette, true);

  data = [];
  colors = [];
  let prevRandomCol = null;
  for (let i = 0; i < n; i++) {
    let myLine = [];
    let lineCol = random(palette);
    while (lineCol == prevRandomCol) lineCol = random(palette);
    prevRandomCol = lineCol;
    let lineStart = sourceFile[i].search(/\S|$/);
    let lineLength = sourceFile[i].length - lineStart;
    for (let j = 0; j < m; j++) {
      let c = sourceFile[i][j];
      if (c == undefined) c = " ";

      let col;
      if (colMode == "CHAR_RANDOM") {
        col = random(palette);
        while (col == prevRandomCol) col = random(palette);
        prevRandomCol = col;
      }
      if (colMode == "WORD_HASH") {
        let word = getWord(i, j);
        if (word != null) col = palette[abs(hashCode(word)) % palette.length];
      }
      if (colMode == "LINE_RANDOM") {
        col = lineCol;
      }
      if (colMode == "VERT_GRADIENT") {
        col = colorScale(i / n).hex();
      }
      if (colMode == "LINE_GRADIENT") {
        col = colorScale((j - lineStart) / lineLength).hex();
      }
      if (colMode == "HORIZ_GRADIENT") {
        col = colorScale(j / m).hex();
      }
      if (colMode == "WORD_LENGTH_GRADIENT") {
        let word = getWord(i, j);
        if (word != null) col = colorScale(map(word.length, minWordLength, maxWordLength, 0, 1)).hex();
      }
      if (colMode == "INDENT_GRADIENT") {
        col = colorScale(lineStart / maxIndent).hex();
      }
      if (colMode == "HEIGHT_GRADIENT") {
        // have a different maxHeight per column?
        col = colorScale(getHeight(i, j) / maxHeight).hex();
      }
      if (colMode == "LINE_LENGTH_GRADIENT") {
        col = colorScale(map(lineLength, minLineLength, maxLineLength, 0, 1)).hex();
      }
      if (colMode == "VERT_SEQ") {
        col = palette[i % palette.length];
      }
      if (colMode == "LINE_SEQ") {
        col = palette[abs(j - lineStart) % palette.length];
      }
      if (colMode == "HORIZ_SEQ") {
        col = palette[j % palette.length];
      }
      if (colMode == "WORD_LENGTH_SEQ") {
        let word = getWord(i, j);
        if (word != null) col = palette[word.length % palette.length];
      }
      if (colMode == "INDENT_SEQ") {
        col = palette[(lineStart / indentSize) % palette.length];
      }
      if (colMode == "HEIGHT_SEQ") {
        col = palette[getHeight(i, j) % palette.length];
      }
      if (colMode == "LINE_LENGTH_SEQ") {
        col = palette[lineLength % palette.length];
      }
      if (colMode == "ALPHA") {
        if (isLetter(c)) {
          // it's a letter
          let t = map(c.toLowerCase().charCodeAt(0), "a".charCodeAt(0), "z".charCodeAt(0), 0, 1);
          col = colorScale(t).hex();
        } else if (isDigit(c)) {
          // it's a digit
          col = colorScale(int(c) / 9).hex();
        }
      }
      if (colMode == "SEPARATE") {
        if (isLetter(c)) col = palette[0];
        else if (isDigit(c)) col = palette[1];
        else col = palette[2];
      }
      if (colMode == "BLOCKS") {
        col = palette[(floor(i * palette.length / n) + floor(j * palette.length / m)) % palette.length];
      }

      myLine.push({
        char: c,
        color: col
      });
    }

    data.push(myLine);
  }
}

function isLetter(c) {
  return c.toLowerCase() != c.toUpperCase();
}

function isDigit(c) {
  return str(int(c)) == c;
}

function getWord(i, j) {
  // returns the word (a string) that contains the character at coordinate [i][j] in sourceFile, or null if it's not part of a word
  // a word is a continuous sequence of characters which are not a letter, a digit, or an underscore ("_")
  // for example, "function", "file1" and "max_depth" are one word each, while "import os" and "os.listdir" are two words each

  let validChar = (c) => (isLetter(c) || isDigit(c) || c == "_");

  if (j > sourceFile[i].length - 1 || !validChar(sourceFile[i][j])) {
    return null;
  }

  let k1 = j;
  let c = sourceFile[i][k1];
  while (validChar(c) && (k1 > 0)) {
    k1--;
    c = sourceFile[i][k1];
  }

  let k2 = j;
  c = sourceFile[i][k2];
  while (validChar(c) && (k2 < sourceFile[i].length - 1)) {
    k2++;
    c = sourceFile[i][k2];
  }

  let word = sourceFile[i].substring(k1, k2 + 1);
  if (!validChar(word[0])) word = word.substring(1, word.length);
  if (!validChar(word[word.length - 1])) word = word.substring(0, word.length - 1);
  //console.log("word: " + word + ", length = " + word.length);
  return word;
}

function hashCode(s) {
  // from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
  return s.split("").reduce(function (a, b) {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

function getHeight(i, j) {
  // returns "height" of character at coordinate [i][j] in sourceFile
  // "height" is defined as the number of non space characters between the character and the bottom of the array
  // a character on the last line will always have a "height" of 0, for example

  let height = 0;
  for (let k = i + 1; k < n; k++) {
    if (sourceFile[k].length > j && sourceFile[k][j] != " ") height++;
  }
  return height;
}


// IO

function handleFile(file) {
  if (file.type != "text") {
    alert("Please choose a text file.");
    return;
  }
  let str = file.data.split("\n");
  if (str.length * sy < windowHeight) {
    for (let i = 0; i < str.length; i++) {
      if (str[i].indexOf("\r") != -1) {
        str[i] = str[i].substring(0, str[i].length - 1);
      }

    }
    sourceFile = str;
    IODiv.remove();
    setup();
  } else {
    alert("This file is too long.");
  }
}

function selectModeEvent() {
  colMode = colModeSelect.value();
  initArrays();
}

function flipColors() {
  backgroundCol = 255 - backgroundCol;
  defaultTextCol = 255 - backgroundCol;
}

function shake() {
  let probFlip = 1 / 4;

  for (let i = 0; i < n; i++) {
    for (let j = 1; j < m; j++) {
      if (random() < probFlip) {
        [data[i][j], data[i][j - 1]] = [data[i][j - 1], data[i][j]];
      }
    }
  }

  for (let j = 0; j < m; j++) {
    for (let i = 1; i < n; i++) {
      if (random() < probFlip) {
        [data[i][j], data[i - 1][j]] = [data[i - 1][j], data[i][j]];
      }
    }
  }
}

function shuffleLines() {
  shuffle(data, true);
}

function shuffleColumns() {
  for (let i = 0; i < n; i++) {
    let indices = [];
    for (let j = 0; j < m; j++) {
      if (data[i][j].char != " ") indices.push(j);
    }
    let shuffledIndices = shuffle(indices);
    for (let j = 0; j < indices.length; j++) {
      [
        data[i][indices[j]],
        data[i][shuffledIndices[j]]
      ] = [
          data[i][shuffledIndices[j]],
          data[i][indices[j]]
        ];
    }
  }
}

function alignLeft() {
  for (let i = 0; i < n; i++) {
    let k1 = 0, k2 = m;
    while (data[i][k1].char == " " && k1 < m - 1) k1++;
    while (data[i][k2 - 1].char == " " && k2 > 1) k2--;
    if (k2 < k1) continue;
    let newLine = [];
    for (let j = 0; j < k2 - k1; j++) {
      newLine.push(data[i][j + k1]);
    }
    for (let j = 0; j < m - k2 + k1; j++) {
      newLine.push({
        char: " "
      });
    }
    data[i] = newLine;
  }
}

function centering() {
  for (let i = 0; i < n; i++) {
    let k1 = 0, k2 = m;
    while (data[i][k1].char == " " && k1 < m - 1) k1++;
    while (data[i][k2 - 1].char == " " && k2 > 1) k2--;
    if (k2 < k1) continue;
    let newLine = [];
    for (let j = 0; j < floor((m - k2 + k1) / 2); j++) {
      newLine.push({
        char: " "
      });
    }
    for (let j = 0; j < k2 - k1; j++) {
      newLine.push(data[i][j + k1]);
    }
    while (newLine.length != data[i].length) {
      newLine.push({
        char: " "
      });
    }
    data[i] = newLine;
  }
}

function alignRight() {
  for (let i = 0; i < n; i++) {
    let k1 = 0, k2 = m;
    while (data[i][k1].char == " " && k1 < m - 1) k1++;
    while (data[i][k2 - 1].char == " " && k2 > 1) k2--;
    if (k2 < k1) continue;
    let newLine = [];
    for (let j = 0; j < m - k2 + k1; j++) {
      newLine.push({
        char: " "
      });
    }
    for (let j = 0; j < k2 - k1; j++) {
      newLine.push(data[i][j + k1]);
    }
    data[i] = newLine;
  }
}

function justify() {
  for (let i = 0; i < n; i++) {
    let indices = [];
    for (let j = 0; j < m; j++) {
      if (data[i][j].char != " ") indices.push(j);
    }
    let nChars = indices.length;
    let newLine = [];
    if (nChars > 0) {
      newLine.push(data[i][indices[0]]);
      let k = 1;
      for (let j = 1; j < m - 1; j++) {
        if (j % floor(k * m / (nChars - 1)) == 0) {
          newLine.push(data[i][indices[k]]);
          k++;
        } else {
          newLine.push({
            char: " "
          });
        }
      }
      newLine.push(data[i][indices[nChars - 1]]);
    } else {
      for (let j = 0; j < m; j++) {
        newLine.push({
          char: " "
        });
      }
    }

    data[i] = newLine;
  }
}