let data;
let trace_len; // length of trace
let max_name_length;

let dep_colors, sup_colors;
let all_deps, all_sups;
let myFont;

let scale;
const WINDOW_WIDTH = 57;
const WINDOW_HEIGHT = 112;
const SMOL_WINDOW_HEIGHT = 47;
let mWindows = 3; // how many windows in width
let nWindows = 1; // how many windows in height
let showWindowFrame = false;
let max_section_length = 256;
let h; // height of 1 bloc (DNA helix, ngram unit...)

const N_FRAMES = 500; // how many frames before changing
let where = "right"; // whether it's the left or right windows

let cnv; // global canvas

let window_composition;
let left_zone, text_zone, right_zone;
let glitch_amount = 0;

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
  h = 20/931*height;
  centerCanvas();

  console.log("Press space to show/hide window frames");

  let params = getURLParams();
  where = params.where;
  generate_window_composition(true);
}

function draw() {
  background(0);

  let t = frameCount/2;
  let left_img = left_zone.cnv, right_img = right_zone.cnv;
  if (glitch_amount > 0) {
    left_img = glitch_it(left_img, glitch_amount);
    right_img = glitch_it(right_img, glitch_amount);
  }
  image(left_img, left_zone.x0, left_zone.y0);
  image(text_zone.cnv, text_zone.x0, text_zone.y0);
  image(right_img, right_zone.x0, right_zone.y0);
  if (glitch_amount > 0) {
    left_img.remove();
    right_img.remove();
  }
  left_zone.update(t);
  text_zone.update(t);
  right_zone.update(t);


  let f = (frameCount/N_FRAMES) % 2;
  let glitch_duration = 0.03;
  if (f == 1) {
    left_zone.cnv.remove();
    right_zone.cnv.remove();
    generate_window_composition(false);
  } else if (f > 1-glitch_duration && f < 1) {
    glitch_amount++;
  } else if (f > 1 && f < 1+glitch_duration) {
    glitch_amount--;
  }

  if (showWindowFrame) drawWindowsOutline();
}

function generate_window_composition(update_text_zone) {
  window_composition = [];

  if (where == "left") {
    let choice = random(["helix_bars", "helix_balls"]);
    let ortho = random() < 1/2;
    if (left_zone) {
      let prev_choice = left_zone.choice;
      let prev_ortho = left_zone.ortho;
      while (choice == prev_choice && ortho == prev_ortho) {
        choice = random(["helix_bars", "helix_balls"]);
        ortho = random() < 1/2;
      }
    }
    left_zone = (choice == "helix_bars") ? helix_bars(0, 0, 1, 1, choice, ortho) : helix_balls(0, 0, 1, 1, choice, ortho);

    if (update_text_zone) text_zone = text_loop(1, 0, 1, 1);

    let section_idx = ~~random(data.depth_envelope.sections.length);
    let section_length = data.depth_envelope.sections[section_idx].end_index - data.depth_envelope.sections[section_idx].start_index;
    while (section_length > max_section_length) {
      section_idx = ~~random(data.depth_envelope.sections.length);
      section_length = data.depth_envelope.sections[section_idx].end_index - data.depth_envelope.sections[section_idx].start_index;
    }
    if (right_zone) {
      let prev_section_idx = right_zone.section_idx;
      while (section_idx == prev_section_idx) {
        section_idx = ~~random(data.depth_envelope.sections.length);
        let section_length = data.depth_envelope.sections[section_idx].end_index - data.depth_envelope.sections[section_idx].start_index;
        while (section_length > max_section_length) {
          section_idx = ~~random(data.depth_envelope.sections.length);
          section_length = data.depth_envelope.sections[section_idx].end_index - data.depth_envelope.sections[section_idx].start_index;
        }
      }
    }
    //console.log(data.depth_envelope.sections[section_idx].end_index - data.depth_envelope.sections[section_idx].start_index);
    right_zone = section_profile(2, 0, 1, 1, section_idx);
  } else { // where == "right"
    let group_by = ~~random(2, 10);
    if (left_zone) {
      let prev_group_by = left_zone.group_by;
      while (group_by == prev_group_by) {
        group_by = ~~random(2, 10);
      }
    }
    left_zone = ngrams(0, 0, 1, 1, group_by);

    text_zone = text_info(1, 0, 1, 1);

    let mode = random(["sup", "dep", "name"]);
    let dna = random() < 1/2;
    if (right_zone) {
      let prev_mode = right_zone.mode;
      let prev_dna = right_zone.dna;
      while (mode == prev_mode && dna == prev_dna) {
        mode = random(["sup", "dep", "name"]);
        dna = random() < 1/2;
      }
    }
    right_zone = trace_print(2, 0, 1, 1, mode, dna);
  }
}

function glitch_it(img, amount) {
  let grph = createGraphics(img.width, img.height);
  let bh = img.height/random([8, 16, 32]);
  for (let y = 0; y < img.height; y += bh) {
    let xOffset = random(-amount, amount)*img.width/100;
    grph.image(img, xOffset, y, img.width, bh, 0, y, img.width, bh);
    //grph.image(img, xOffset-img.width, y, img.width, bh, 0, y, img.width, bh);
    //grph.image(img, xOffset+img.width, y, img.width, bh, 0, y, img.width, bh);
  }
  if (random() < 1/10) grph.filter(random([GRAY, INVERT]));
  return grph;
}


function text_loop(i, j, m, n) {
  // adapted from Maria's code
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale);
  cnv.noStroke();
  cnv.textSize(cnv.width/10);
  cnv.textFont(myFont);
  cnv.textAlign(TOP, CENTER);
  //cnv.textStyle(BOLD);

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
        cnv.fill(200);
        cnv.textSize(cnv.width/10);

        cnv.fill(0);
        cnv.rect(0, cnv.height/3 + cnv.width/5 - cnv.height/20, width, cnv.height/5);
        cnv.rect(0, 2*cnv.height/3 + cnv.width/5 - cnv.height/20, width, cnv.height/5);
      } else if (ti > 4 && ti < 5) {
        let r = this.keyword_idx - 1;
        let currentStrings = this.keywords[r].substring(0, this.currentCharacter);
        cnv.fill(200);
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
        cnv.fill(200);
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

function text_info(i, j, m, n) {
  // adapted from Maria's code
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale);
  cnv.noStroke();
  cnv.textFont(myFont);
  cnv.textAlign(LEFT, CENTER);
  //cnv.textStyle(BOLD);

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    cnv: cnv,
    update: function(t) {
      let wMargin = cnv.width*40/570; // pageMargin in Maria's code
      let d = cnv.width*100/570;

      let sissor = `\n()                                            ()\nOO                                            OO\n`;
      let helixstring0 = `                    <><><><>                  `;
      let helixstring00 = `<><><><><><><><><><>        <><><><><><><><><><>`;
      let CRISPR = `                    <CRISPR>                    `;

      let helixstring = `><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><`;

      let helixstring1 = `                           <><><><>                                               `;
      let helixstring2 = `                                              <><><><>                            `;
      let helixstring3 = `               <><><><>                                 `;

      let string0 = `><><nobelprice2020.chemistry<>CRISPR<>genome.editing<>describe.as:text.editing><><`;

      let string1 = `> run ./search_&_replace\n><>0.1 ms<`;

      let string2 = `>${data.draw_trace.length}<><><>events<\n>${all_deps.length}<>dependencies<\n>${all_sups.length}<><><><suppliers<`;

      let string3 = `>25_events_per_ms<>2h10min40.25s<`;

      //let timer1 = `><>current.time<><><><><><><1.2h>`;

      //let progressbar = `[<><><><><><>.............] 40%`;

      let col1 = dep_colors.get(0, 1);
      let col2 = sup_colors.get(floor(all_sups.length/2), 1);
      if ((t+N_FRAMES/2) % (N_FRAMES*2) > N_FRAMES) [col1, col2] = [col2, col1];


      cnv.background(0);
      cnv.fill(250);
      cnv.textSize(cnv.width*12/570);
      cnv.text(
        helixstring,
        wMargin,
        wMargin - 10*cnv.height/1120 + d
      );
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 10*cnv.height/1120 + d
      );
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 220*cnv.height/1120 + d
      );
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 450*cnv.height/1120 + d
      );
      cnv.text(
        string0,
        wMargin,
        wMargin + 460*cnv.height/1120 + d
      );
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 470*cnv.height/1120 + d
      );
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 800*cnv.height/1120 + d
      );
      cnv.text(
        string0,
        wMargin,
        wMargin + 810*cnv.height/1120 + d
      );
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 820*cnv.height/1120 + d
      );
      cnv.textSize(cnv.width*12/570);
      cnv.text(
        string0,
        wMargin,
        wMargin + d
      );
      /*
      cnv.text(
        helixstring,
        wMargin,
        wMargin + 650*cnv.height/1120 + d
      );
      */
      cnv.textSize(cnv.width*40/570);
      cnv.text(
        string1,
        wMargin,
        wMargin + 24*cnv.height/1120 + d,
        width,
        wMargin + 24*cnv.height/1120 + d
      );

      cnv.textSize(cnv.width*30/570);
      cnv.text(
        string2,
        wMargin,
        wMargin + 180*cnv.height/1120 + d,
        wMargin,
        wMargin + 180*cnv.height/1120 + d
      );
      cnv.textSize(cnv.width*30/570);
      cnv.text(
        string3,
        wMargin,
        wMargin + 558*cnv.height/1120 + d
      );
      /*
      cnv.textSize(cnv.width*30/570);
      cnv.text(
        timer1,
        wMargin,
        wMargin + 720*cnv.height/1120 + d
      );
      */

      cnv.textSize(cnv.width*30/570);
      cnv.text(
        "// un|fold by re|thread",
        wMargin,
        wMargin + 1000*cnv.height/1120
      );
      cnv.fill(col1);
      cnv.text(
        "<><><><>",
        wMargin + cnv.width*0.65,
        wMargin + 1000*cnv.height/1120
      );

      cnv.push();
      {
        cnv.fill(col1);
        cnv.textSize(cnv.width*12/570);
        cnv.text(
          helixstring1,
          wMargin,
          wMargin + 10*cnv.height/1120 + d
        );

        cnv.text(
          helixstring2,
          wMargin,
          wMargin + 470*cnv.height/1120 + d
        );
        cnv.textSize(cnv.width*20/570);
        cnv.text(
          helixstring0,
          wMargin,
          wMargin
        );
        cnv.text(
          sissor,
          wMargin,
          wMargin,
          width,
          wMargin*2
        );

        cnv.translate(0, 0.68*cnv.height);
        cnv.fill(col2);
        /*
        cnv.textSize(cnv.width*12/570);
        cnv.text(
          helixstring1,
          wMargin,
          wMargin + 10*cnv.height/1120 + d
        );
        */
        cnv.text(
          helixstring2,
          wMargin,
          wMargin + 470*cnv.height/1120 + d
        );
        cnv.text(
          helixstring3,
          wMargin,
          wMargin + 650*cnv.height/1120 + d
        );
        cnv.textSize(cnv.width*20/570);
        cnv.text(
          helixstring0,
          wMargin,
          wMargin
        );
        cnv.text(
          sissor,
          wMargin,
          wMargin,
          width,
          wMargin*2
        );

        cnv.textSize(cnv.width*20/570);
        cnv.fill(250);
        cnv.text(
          helixstring00,
          wMargin,
          wMargin
        );
        cnv.fill(col1);
        cnv.text(
          helixstring0,
          wMargin,
          wMargin + 40*cnv.height/1120
        );
      }
      cnv.pop();
      cnv.push();
      {
        cnv.textSize(cnv.width*20/570);
        cnv.fill(250);
        cnv.text(
          helixstring00,
          wMargin,
          wMargin
        );
        cnv.fill(col2);
        cnv.text(
          helixstring0,
          wMargin,
          wMargin + 40*cnv.height/1120
        );
      }
      cnv.pop();
    }
  };
}

function helix_bars(i, j, m, n, choice, ortho) {
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale, WEBGL);
  cnv.noStroke();
  cnv.translate(-cnv.width/2, -cnv.height/2);
  if (ortho) cnv.ortho();
  let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
  let w = cnv.width-wMargin*2; // width of each function call rectangle
  let hGap = h/8; // gap between rectangles vertically

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    choice: choice,
    ortho: ortho,
    cnv: cnv,
    wMargin: wMargin,
    w: w,
    h: h,
    hGap: hGap,
    update: function(t) {
      cnv.clear();

      let x = this.wMargin, y = -t%h-height/3, i = floor(t/h);

      while (y < cnv.height*1.1) {
        let d = data.draw_trace[(i++)%trace_len];
        let [sup, dep] = [d.supplier, d.dependency];

        cnv.push();

        cnv.translate(x+this.w/2, y+h/2, 0);
        cnv.rotateY(y/60);
        cnv.fill(get_sup_color(sup));
        cnv.beginShape();
        cnv.vertex(-this.w/2+this.wMargin, -h/2+this.hGap/2, 0);
        cnv.vertex(-this.w/2+this.wMargin, h/2-this.hGap/2, 0);
        cnv.fill(get_dep_color(dep));
        cnv.vertex(this.w/2-this.wMargin, h/2-this.hGap/2, 0);
        cnv.vertex(this.w/2-this.wMargin, -h/2+this.hGap/2, 0);
        cnv.endShape();

        cnv.pop();

        y += h;
      }
    }
  };
}

function helix_balls(i, j, m, n, choice, ortho) {
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale, WEBGL);
  cnv.noStroke();
  cnv.translate(-cnv.width/2, -cnv.height/2);
  if (ortho) cnv.ortho();
  let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
  let w = cnv.width-wMargin*2; // width of each function call rectangle
  let hGap = h/8; // gap between rectangles vertically

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    choice: choice,
    ortho: ortho,
    cnv: cnv,
    wMargin: wMargin,
    w: w,
    h: h,
    hGap: hGap,
    update: function(t) {
      cnv.clear();

      let x = this.wMargin, y = -t%h-height/3, i = floor(t/h);

      while (y < cnv.height*1.1) {
        let d = data.draw_trace[(i++)%trace_len];
        let [sup, dep] = [d.supplier, d.dependency];

        cnv.push();

        cnv.translate(x+this.w/2, y+h/2, 0);
        cnv.rotateY(y/60-PI/2);

        cnv.fill(240);
        cnv.rotateX(3*PI/2);
        cnv.cylinder(h/5, this.w-2*this.wMargin);
        cnv.rotate(PI/2);

        cnv.push();
        cnv.fill(get_sup_color(sup));
        cnv.translate(-this.w/2+this.wMargin, 0);
        cnv.sphere(h/2);
        cnv.fill(get_dep_color(dep));
        cnv.translate(this.w-2*this.wMargin, 0);
        cnv.sphere(h/2);
        cnv.pop();

        cnv.pop();

        y += h;
      }
    }
  };
}

function ngrams(i, j, m, n, group_by) {
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

      let w = WINDOW_WIDTH*scale, hGap = h/4;
      let eps = cnv.height/1000;

      let x = 0, j = 0, y = -cnv.height/3, k = floor(t/h);
      let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
      let wUnit = (w-wMargin)/(4*max_name_length);
      let xOffset = 0;

      while (y < cnv.height*1.1) {
        let d = data.draw_trace[k%trace_len];

        let idx = j % this.group_by;
        if (idx == 1) {
          let mean_name_length = 0;
          //let mean_noise = 0;
          for (let ii = 0; ii < this.group_by; ii++) {
            mean_name_length += getActualName(data.draw_trace[(k+ii)%trace_len].name).length;
            //mean_noise += noise(k+ii);
          }
          mean_name_length /= this.group_by;
          //mean_noise /= this.group_by;
          wMargin = WINDOW_WIDTH*scale/10 + wUnit*(max_name_length-mean_name_length);
          //xOffset = (mean_noise-0.5)*wMargin;
        }

        let [sup, dep] = [d.supplier, d.dependency];

        let grd = this.ctx.createLinearGradient(x+wMargin+xOffset, 0, x+w-wMargin+xOffset, 0);
        grd.addColorStop(0, color(get_sup_color(sup)));
        grd.addColorStop(1, color(get_dep_color(dep)));
        this.ctx.fillStyle = grd;

        if (idx == 0) {
          // bottom
          cnv.rect(x+wMargin+xOffset, y, w-2*wMargin, h-hGap+eps, 0, 0, h, h);
        } else if (idx == 1) {
          // top
          cnv.rect(x+wMargin+xOffset, y+hGap, w-2*wMargin, h-hGap+eps, h, h, 0, 0);
        } else {
          // middle
          cnv.rect(x+wMargin+xOffset, y, w-2*wMargin, h+eps);
        }

        y += h;
        j++;
        k++;
      }
    }
  };
}

function trace_print(i, j, m, n, mode, dna) {
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale);
  cnv.noStroke();
  cnv.textAlign(LEFT, TOP);
  cnv.textFont(myFont);

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    mode: mode,
    dna: dna,
    cnv: cnv,
    ctx: cnv.drawingContext,
    update: function(t) {
      cnv.clear();

      let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
      cnv.textSize(h);
      let k = floor(t/h);
      let y0 = -height/3;

      for (let y = y0; y < cnv.height; y += h) {
        let d = data.draw_trace[k%trace_len];
        let [sup, dep] = [d.supplier, d.dependency];
        let str;
        if (this.mode == "sup") {
          cnv.fill(get_sup_color(sup));
          str = sup;
        } else if (this.mode == "dep") {
          cnv.fill(get_dep_color(dep));
          str = dep;
        } else {
          let name = getActualName(d.name);
          let w = textWidth(name);
          let grd = this.ctx.createLinearGradient(wMargin, 0, w+wMargin, 0);
          grd.addColorStop(0, color(get_sup_color(sup)));
          grd.addColorStop(1, color(get_dep_color(dep)));
          this.ctx.fillStyle = grd;
          str = name;
        }
        if (this.dna) str = turn_into_dna(str);
        cnv.text(str, wMargin, y);

        k++;
      }

      cnv.erase();
      cnv.rect(0, 0, cnv.width, h*1.7);
      cnv.noErase();
      let str = "> print ";
      if (this.mode == "sup") {
        str += "suppliers"
      } else if (this.mode == "dep") {
        str += "dependencies"
      } else {
        str += "function_names"
      }
      if (this.dna) str += ".dna";
      else str += ".txt";
      cnv.fill(250);
      cnv.text(str, wMargin, h*0.3);
    }
  };
}

function turn_into_dna(str) {
  let new_str = "";
  for (let i = 0; i < str.length; i++) {
    new_str += ["A", "T", "G", "C"][str.charCodeAt(i)%4];
  }
  return new_str;
}

function section_profile(i, j, m, n, section_idx) {
  let cnv = createGraphics(m*WINDOW_WIDTH*scale, n*WINDOW_HEIGHT*scale);
  cnv.noStroke();
  cnv.rectMode(CENTER);
  let ctx = cnv.drawingContext;
  let section = data.depth_envelope.sections[section_idx];
  //console.log(section);

  let min_depth = section.min_depth;
  let max_depth = section.max_depth+1;
  let max_offset = section.shannon_wiener_diversity_index*50;

  let wMargin = WINDOW_WIDTH*scale/10; // margin on the sides
  let hMargin = wMargin;
  let section_size = section.end_index - section.start_index;
  let w = cnv.width-2*wMargin;
  let h = (cnv.height-2*hMargin)/section_size;

  for (let i = section.start_index; i < section.end_index; i++) {
    let y = hMargin + (i-section.start_index+1/2)*h;
    let d = data.draw_trace[i];
    let [sup, dep] = [d.supplier, d.dependency];

    let col1 = color(get_sup_color(sup));
    let col2 = color(get_dep_color(dep));
    let thickness = map(d.depth, min_depth, max_depth, 1/6, 2/3)*h;

    for (let x = wMargin; x < cnv.width-wMargin; x++) {
      let alpha = 255;
      if (x < cnv.width/3) alpha = map(x, wMargin, cnv.width/3, 0, 1);
      else if (x > 2*cnv.width/3) alpha = map(x, 2*cnv.width/3, cnv.width-wMargin, 1, 0);
      let col = lerpColor(col1, col2, x/cnv.width);
      cnv.fill(red(col), green(col), blue(col), alpha*255);

      let y_offset = (noise(x/500, y/1000)-1/2)*max_offset;
      let factor = 1;
      if (x < cnv.width/2) factor = pow(map(x, wMargin, cnv.width/2, 0, 1), 1/8);
      else factor = pow(map(x, cnv.width/2, cnv.width-wMargin, 1, 0), 1/8);
      cnv.circle(x, y+y_offset, thickness*factor);
    }
  }

  return {
    x0: i*WINDOW_WIDTH*scale,
    y0: j*WINDOW_HEIGHT*scale,
    m: m,
    n: n,
    cnv: cnv,
    update: function(t) {
      // nothing lol
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

/*
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
*/

function getActualName(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[actual function name]"
  // return: the actual name of the function
  return s.slice(s.lastIndexOf(".")+1, s.length);
}

function keyPressed() {
  if (key == " ") {
    showWindowFrame = !showWindowFrame;
  }
}

/*
function windowResized() {
  determineScale();
  resizeCanvas(WINDOW_WIDTH*mWindows*scale, WINDOW_HEIGHT*nWindows*scale);
  centerCanvas();
}
*/
