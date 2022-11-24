let data;
let trace_len; // length of trace
let max_name_length;

let keywords = ["copy", "paste", "search", "replace", "find", "write"];
let dep_colors, sup_colors;
let all_deps, all_sups;
let myFont;

let scale;
const WINDOW_WIDTH = 57;
const WINDOW_HEIGHT = 112;
const SMOL_WINDOW_HEIGHT = 47;
let mWindows = 3; // how many windows in width
let nWindows = 1; // how many windows in height
let showWindowFrame = true;

let cnv; // canvas

let window_composition;
let zones, textLoop_zone;

function preload() {
  //data = loadJSON("../../LED_web_demo/data-imagej-copy-paste_parsed.json");
  //data = loadJSON("../../LED_web_demo/data-varna-startup-shutdown_parsed.json");
  data = loadJSON("../../LED_web_demo/data-jedit-with-marker.json");
  myFont = loadFont("../MPLUS1Code-VariableFont_wght.ttf");
  sup_colors = loadTable("../../color_tables/data-jedit-with-marker_supplier_colors.csv", "csv", "header");
  dep_colors = loadTable("../../color_tables/data-jedit-with-marker_dependency_colors.csv", "csv", "header");
}

function setup() {
  determineScale();
  cnv = createCanvas(WINDOW_WIDTH*mWindows*scale, WINDOW_HEIGHT*nWindows*scale);

  //console.log(data)
  trace_len = data.draw_trace.length;
  max_name_length = get_max_name_length();
  all_deps = dep_colors.getColumn(0);
  all_sups = sup_colors.getColumn(0);
  centerCanvas();

  console.log("Instructions:\n- arrow keys to change window dimensions\n- space to show/hide window frames");

  /*
  zones.push(helixBars(0, 0, 1, 1, false));
  zones.push(helixBalls(1, 0, 1, 1, true));
  zones.push(ngrams(2, 0, 1, 1, 4));
  */

  textLoop_zone = textLoop(1, 0, 1, 1);
  generate_window_composition();
  make_window_composition();
}

function draw() {
  background(0);

  let t = frameCount/2;
  for (let z of zones) {
    image(z.cnv, z.x0, z.y0);
    z.update(t);
  }

  if (frameCount % 500 == 0) {
    generate_window_composition();
    make_window_composition();
  }

  if (showWindowFrame) drawWindowsOutline();
}

function generate_window_composition() {
  let choice_possibilities = shuffle(["helixBars", "helixBalls", "ngrams", "ngrams"]);
  //choice_possibilities[choice_possibilities.length - random([0, 1, 2])] = "textLoop";
  let group_by_possibilities = [2, 4, 8];
  window_composition = [];

  let is = [0, 2];
  for (let i of is) {
    let choice = choice_possibilities.pop();
    let arr = {
      choice: choice,
      i: i,
      j: 0,
      m: 1,
      n: 1
    };

    if (choice == "helixBars" || choice == "helixBalls") {
      arr.ortho = random([true, false]);
    } else if (choice == "ngrams") {
      shuffle(group_by_possibilities, true);
      arr.group_by = group_by_possibilities.pop();
    }

    window_composition.push(arr);
  }
  //console.log(window_composition)
}

function make_window_composition() {
  zones = [textLoop_zone];
  for (let arr of window_composition) {
    switch (arr.choice) {
      case "helixBars":
        zones.push(helixBars(arr.i, arr.j, arr.m, arr.n, arr.ortho));
        break;
      case "helixBalls":
        zones.push(helixBalls(arr.i, arr.j, arr.m, arr.n, arr.ortho));
        break;
      case "ngrams":
        zones.push(ngrams(arr.i, arr.j, arr.m, arr.n, arr.group_by));
        break;
    }
  }
}

function textLoop(i, j, m, n) {
  // adapted from Maria's code
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale);
  cnv.noStroke();
  cnv.textSize(cnv.width/10);
  cnv.textFont(myFont);
  cnv.textAlign(TOP, CENTER);
  //cnv.textStyle(BOLD);
  //cnv.text("SEARCH", wMargin, cnv.height/3);
  //cnv.text("REPLACE", wMargin, 2*cnv.height/3);

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    cnv: cnv,
    keywords: ["CRISPR", "genome editing", "text editing", "copy & paste", "search & replace", "1 millisecond", "200 000 system\n\ncalls", "2000\n\ndependencies", "20 suppliers", "complex software\n\nsystem", "complex\n\ninformation", "DNA"], // textable in Maria's code
    timeUnit: 50, // x in Maria's code
    keyword_idx: 0, // z in Maria's code
    currentCharacter: 0, // same name in Maria's code
    baseFinished: false, // whether the base is finished ("search" and "replace" are written)
    update: function(t) {
      let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
      let string1 = "search";
      let string2 = "replace";
      let ti = (t/this.timeUnit) % 6; // i in Maria's code
      if (this.baseFinished) ti = ti%6 + 4;

      if (ti < 1) {
        this.keyword_idx = 1;
        cnv.background(0);
        cnv.textSize(cnv.width/8);
      } else if (ti >= 1 && ti < 2) {
        let currentString1 = string1.substring(0, this.currentCharacter);
        cnv.fill(250);
        cnv.text(
          currentString1,
          wMargin,
          cnv.height/3
        );
        this.currentCharacter += 0.5;
      } else if (ti == 2) {
        this.currentCharacter = 0;
        //fill(10);
        //rect(247.5, 200.4, 47, 10);
      } else if (ti > 2 && ti < 3) {
        let currentString2 = string2.substring(0, this.currentCharacter);
        cnv.fill(250);
        cnv.text(
          currentString2,
          wMargin,
          2*cnv.height/3,
        );
        this.currentCharacter += 0.5;
      } else if (ti == 4) {
        this.currentCharacter = 0;
        this.keyword_idx++;
        this.baseFinished = true;
        cnv.fill(150);
        cnv.textSize(cnv.width/10);

        cnv.fill(0);
        cnv.rect(0, cnv.height/3 + cnv.width/5 - cnv.height/20, width, cnv.height/5);
        cnv.rect(0, 2*cnv.height/3 + cnv.width/5 - cnv.height/20, width, cnv.height/5);
      } else if (ti > 4 && ti < 5) {
        let r = this.keyword_idx - 1;
        let currentStrings = this.keywords[r].substring(0, this.currentCharacter);
        cnv.fill(150);
        cnv.text(
          currentStrings,
          wMargin,
          cnv.height/3 + cnv.width/5
        );
        this.currentCharacter++;
      } else if (ti == 5) {
        this.currentCharacter = 0;
      } else if (ti > 5 && ti < 6) {
        let r = this.keyword_idx;
        currentStrings = this.keywords[r].substring(0, this.currentCharacter);
        cnv.fill(150);
        cnv.text(
          currentStrings,
          wMargin,
          2*cnv.height/3 + cnv.width/5
        );
        this.currentCharacter++;
      } else if (ti > 6) {
        this.currentCharacter = 0;
      }

      if (this.keyword_idx > this.keywords.length - 1) {
        this.baseFinished = false;
      }

      // blinking cursor in front of "search" and "replace"
      if (ti > 1.5) {
        if (t % 30 <= 15) {
          cnv.fill(0);
        } else {
          cnv.fill(250);
        }
        cnv.rect(cnv.width*0.49, cnv.height/3 + cnv.width/15, cnv.width*0.06, cnv.height*0.003);
      }
      if (ti > 2.5) {
        if (t % 30 <= 15) {
          cnv.fill(0);
        } else {
          cnv.fill(250);
        }

        cnv.rect(cnv.width*0.55, 2*cnv.height/3 + cnv.width/15, cnv.width*0.06, cnv.height*0.003);
      }
    }
  };
}

function helixBars(i, j, m, n, ortho) {
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale, WEBGL);
  cnv.noStroke();
  cnv.translate(-cnv.width/2, -cnv.height/2);
  if (ortho) cnv.ortho();
  let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
  let w = cnv.width-wMargin*2; // width of each function call rectangle
  let h = 20; // height of each function call rectangle
  let hGap = h/8; // gap between rectangles vertically
  cnv.textSize(h*3/4);
  cnv.textFont(myFont);
  cnv.textAlign(CENTER, CENTER);

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    cnv: cnv,
    wMargin: wMargin,
    w: w,
    h: h,
    hGap: hGap,
    update: function(t) {
      cnv.clear();

      let x = this.wMargin, y = -t%this.h-height/3, i = floor(t/this.h);

      while (y < cnv.height*1.1) {
        let d = data.draw_trace[(i++)%trace_len];
        let [sup, dep] = getSupAndDep(d.name);

        cnv.push();

        cnv.translate(x+this.w/2, y+this.h/2, 0);
        cnv.rotateY(y/60);
        cnv.fill(get_sup_color(sup));
        cnv.beginShape();
        cnv.vertex(-this.w/2+this.wMargin, -this.h/2+this.hGap/2, 0);
        cnv.vertex(-this.w/2+this.wMargin, this.h/2-this.hGap/2, 0);
        cnv.fill(get_dep_color(dep));
        cnv.vertex(this.w/2-this.wMargin, this.h/2-this.hGap/2, 0);
        cnv.vertex(this.w/2-this.wMargin, -this.h/2+this.hGap/2, 0);
        cnv.endShape();

        let funcName = getActualName(d.name);
        for (let wo of keywords) {
          let idx = funcName.toLowerCase().indexOf(wo);
          if (idx >= 0) {
            cnv.fill(240);
            //text(wo, w/2-wMargin/2, -hGap/2);
            cnv.translate(0, -this.hGap, 1);
            cnv.text(wo, 0, 0);
            cnv.translate(0, 0, -2);
            cnv.text(wo, 0, 0);
            break;
          }
        }

        cnv.pop();

        y += this.h;
      }
    }
  };
}

function helixBalls(i, j, m, n, ortho) {
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale, WEBGL);
  cnv.noStroke();
  cnv.translate(-cnv.width/2, -cnv.height/2);
  if (ortho) cnv.ortho();
  let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
  let w = cnv.width-wMargin*2; // width of each function call rectangle
  let h = 20; // height of each function call rectangle
  let hGap = h/8; // gap between rectangles vertically
  cnv.textSize(h);
  cnv.textFont(myFont);
  cnv.textAlign(LEFT, CENTER);

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    cnv: cnv,
    wMargin: wMargin,
    w: w,
    h: h,
    hGap: hGap,
    update: function(t) {
      cnv.clear();

      let x = this.wMargin, y = -t%this.h-height/3, i = floor(t/this.h);

      while (y < cnv.height*1.1) {
        let d = data.draw_trace[(i++)%trace_len];
        let [sup, dep] = getSupAndDep(d.name);

        cnv.push();

        cnv.translate(x+this.w/2, y+this.h/2, 0);
        cnv.rotateY(y/60-PI/2);

        cnv.fill(240);
        cnv.rotateX(3*PI/2);
        cnv.cylinder(this.h/5, this.w-2*this.wMargin);
        cnv.rotate(PI/2);

        cnv.push();
        cnv.fill(get_sup_color(sup));
        cnv.translate(-this.w/2+this.wMargin, 0);
        cnv.sphere(this.h/2);
        cnv.fill(get_dep_color(dep));
        cnv.translate(this.w-2*this.wMargin, 0);
        cnv.sphere(this.h/2);
        cnv.pop();

        let funcName = getActualName(d.name);
        cnv.rotateX(PI/2);
        for (let wo of keywords) {
          let idx = funcName.toLowerCase().indexOf(wo);
          if (idx >= 0) {
            cnv.fill(240);
            cnv.text(wo, this.w/2-this.wMargin/2+this.h/4, -this.hGap*2);
            break;
          }
        }

        cnv.pop();

        y += this.h;
      }
    }
  };
}

function ngrams(i, j, m, n, group_by) {
  // width of rectangle changes with depth, mean of group
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale);
  cnv.noStroke();

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    group_by: group_by,
    cnv: cnv,
    ctx: cnv.drawingContext,
    update: function(t) {
      cnv.clear();

      let w = WINDOW_WIDTH*scale, h = 20, hGap = h/4;
      let eps = 1;

      let x = 0, j = 0, y = -cnv.height/3, k = floor(t/h);
      let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
      let wUnit = (w-wMargin)/(4*max_name_length);
      let xOffset = 0;

      while (y < cnv.height*1.1) {
        let d = data.draw_trace[k%trace_len];

        let idx = j % this.group_by;
        if (idx == 1) {
          let mean_name_length = 0;
          let mean_noise = 0;
          for (let ii = 0; ii < this.group_by; ii++) {
            mean_name_length += getActualName(data.draw_trace[(k+ii)%trace_len].name).length;
            mean_noise += noise(k+ii);
          }
          mean_name_length /= this.group_by;
          mean_noise /= this.group_by;
          wMargin = WINDOW_WIDTH*scale/10 + wUnit*(max_name_length-mean_name_length);
          xOffset = (mean_noise-0.5)*wMargin;
        }

        let [sup, dep] = getSupAndDep(d.name);

        let grd = this.ctx.createLinearGradient(x+wMargin+xOffset, 0, x+w-wMargin+xOffset, 0);
        grd.addColorStop(0, color(get_sup_color(sup)));
        grd.addColorStop(1, color(get_dep_color(dep)));
        this.ctx.fillStyle = grd;

        if (idx == 0) {
          // bottom
          cnv.rect(x+wMargin+xOffset, y-eps, w-2*wMargin, h-hGap+2*eps, 0, 0, h, h);
        } else if (idx == 1) {
          // top
          cnv.rect(x+wMargin+xOffset, y+hGap, w-2*wMargin, h-hGap+eps, h, h, 0, 0);
        } else {
          // middle
          cnv.rect(x+wMargin+xOffset, y-eps, w-2*wMargin, h+2*eps);
        }

        y += h;
        j++;
        k++;
      }
    }
  };
}

function determineScale() {
  scale = 0.99*windowHeight/(WINDOW_HEIGHT*nWindows);
}

function centerCanvas() {
  // centering canvas
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  cnv.position(x, y);
}

function drawWindowsOutline() {
  stroke(255);
  strokeWeight(2);
  for (let x = WINDOW_WIDTH*scale; x < width; x += WINDOW_WIDTH*scale) {
    line(x, 0, x, height);
  }
  for (let y = WINDOW_HEIGHT*scale; y < height; y += WINDOW_HEIGHT*scale) {
    line(0, y, width, y);
  }
  noFill();
  rect(1, 1, width-2, height-2);
  noStroke();
}

function get_max_name_length() {
  let max_l = 0;
  for (let i = 0; i < trace_len; i++) {
    let l = getActualName(data.draw_trace[i].name).length;
    if (l > max_l) max_l = l;
  }
  return max_l;
}

function get_dep_color(dep) {
  return dep_colors.get(all_deps.indexOf(dep), 1);
}

function get_sup_color(sup) {
  return sup_colors.get(all_sups.indexOf(sup), 1);
}

function getSupAndDep(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[actual function name]"
  // return: an array, the first value is the supplier, the second is the dependency
  let func = (s.indexOf("/") == -1) ? s : s.split("/")[1]; // remove the eventual prefix, find the interesting part
  let idx1 = func.indexOf(".", func.indexOf(".")+1); // find the second occurence of "."
  let idx2 = func.indexOf(".", idx1+1); // find the first occurence of "." after idx1
  let idx3 = func.indexOf("$", idx1+1); // find the first occurence of "$" after idx1
  if (idx3 == -1) idx3 = idx2; // ignore idx3 if there is no "$" found
  let supplier = func.slice(0, idx1); // find the supplier
  let dependency = func.slice(idx1+1, min(idx2, idx3)); // find the dependency
  return [supplier, dependency];
}

function getActualName(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[actual function name]"
  // return: the actual name of the function
  return s.slice(s.lastIndexOf(".")+1, s.length);
}

function keyPressed() {
  if (key == " ") {
    showWindowFrame = !showWindowFrame;
    return;
  }
  if (keyCode == LEFT_ARROW && mWindows > 1) mWindows--;
  if (keyCode == RIGHT_ARROW && mWindows < 4) mWindows++;
  if (keyCode == DOWN_ARROW && nWindows > 1) nWindows--;
  if (keyCode == UP_ARROW && nWindows < 3) nWindows++;
  windowResized();
}

function windowResized() {
  determineScale();
  resizeCanvas(WINDOW_WIDTH*mWindows*scale, WINDOW_HEIGHT*nWindows*scale);
  make_window_composition();
  centerCanvas();
}
