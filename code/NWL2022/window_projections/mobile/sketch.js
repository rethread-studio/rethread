let data;
let trace_len; // length of trace
let max_name_length;

let dep_colors, sup_colors;
let all_deps, all_sups;
let myFont;

let my_scale;
const WINDOW_WIDTH = 57;
const WINDOW_HEIGHT = 112;

let wMargin; // margin on the sides
let w; // width of each function call rectangle
let h; // height of 1 bloc (DNA helix bar...)
let hGap; // gap between rectangles vertically

let N_FRAMES = 500; // how many frames before changing

let cnv; // global canvas

let anim;
let glitch_amount = 0;

let viz = 1;

function preload() {
  let dataset = "data-varna-copy-paste-isolated_parsed";
  data = loadJSON(`../../LED_web_demo/${dataset}.json`);
  myFont = loadFont("../MPLUS1Code-VariableFont_wght.ttf");
  sup_colors = loadTable(`../../color_tables/${dataset}_supplier_colors.csv`, "csv", "header");
  dep_colors = loadTable(`../../color_tables/${dataset}_dependency_colors.csv`, "csv", "header");
}

function setup() {
  determineScale();
  cnv = createCanvas(WINDOW_WIDTH*my_scale, WINDOW_HEIGHT*my_scale, WEBGL);
  //pixelDensity(1);

  //console.log(data)
  trace_len = data.draw_trace.length;
  max_name_length = get_max_name_length();
  all_deps = dep_colors.getColumn(0);
  all_sups = sup_colors.getColumn(0);
  
  wMargin = WINDOW_WIDTH*my_scale/10;
  w = width-wMargin*2;
  h = 30/931*height;
  hGap = h/8;

  centerCanvas();

  generate_window_composition();
  noStroke();
  textAlign(LEFT, TOP);
  textFont(myFont);
  textSize(h*0.9);
}

function draw() {
  background(0);

  translate(-width/2, -height/2);
  anim.update(frameCount);

  if (frameCount % N_FRAMES == 0) {
    generate_window_composition();
  }
}

function generate_window_composition() {
  viz++;
  if (viz%2 == 0) {
    // helix
    let choice = random(["helix_bars", "helix_balls"]);
    if (random() < 1/2) ortho();
    else perspective();
    anim = (choice == "helix_bars") ? helix_bars(choice) : helix_balls(choice);
  } else {
    // trace print
    let mode = random(["sup", "dep", "name"]);
    let dna = random() < 1/4;
    anim = trace_print(mode, dna);
  }

  anim.update(~~random(trace_len));
}

function helix_bars(choice) {
  return {
    choice: choice,
    update: function(t) {
      let x = wMargin, y = -t%h-height/10, i = floor(t/h);

      while (y < height*1.1) {
        let d = data.draw_trace[(i++)%trace_len];
        let [sup, dep] = [d.supplier, d.dependency];

        push();

        translate(x+w/2, y+h/2, 0);
        rotateY(y/180);
        fill(get_sup_color(sup));
        beginShape();
        vertex(-w/2+wMargin, -h/2+hGap/2, 0);
        vertex(-w/2+wMargin, h/2-hGap/2, 0);
        fill(get_dep_color(dep));
        vertex(w/2-wMargin, h/2-hGap/2, 0);
        vertex(w/2-wMargin, -h/2+hGap/2, 0);
        endShape();

        pop();

        y += h;
      }
    }
  };
}

function helix_balls(choice) {
  return {
    choice: choice,
    update: function(t) {
      let x = wMargin, y = -t%h-height/10, i = floor(t/h);

      while (y < height*1.1) {
        let d = data.draw_trace[(i++)%trace_len];
        let [sup, dep] = [d.supplier, d.dependency];

        push();

        translate(x+w/2, y+h/2, 0);
        rotateY(y/180-PI/2);

        fill(240);
        rotateX(3*PI/2);
        cylinder(h/5, w-2*wMargin, 6, 1);
        rotate(PI/2);

        push();
        fill(get_sup_color(sup));
        translate(-w/2+wMargin, 0);
        sphere(h/2, 12, 8);
        fill(get_dep_color(dep));
        translate(w-2*wMargin, 0);
        sphere(h/2, 12, 8);
        pop();

        pop();

        y += h;
      }
    }
  };
}

function trace_print(mode, dna) {
  return {
    mode: mode,
    dna: dna,
    update: function(t) {
      let k = floor(t/h);
      let y0 = h*2.7;

      for (let y = y0; y < height; y += h) {
        let d = data.draw_trace[k%trace_len];
        let [sup, dep] = [d.supplier, d.dependency];
        let str;
        if (this.mode == "sup") {
          fill(get_sup_color(sup));
          str = sup;
        } else if (this.mode == "dep") {
          fill(get_dep_color(dep));
          str = dep;
        } else {
          let name = getActualName(d.name);
          if (name.length % 2 == 0) {
            fill(color(get_sup_color(sup)));
          } else {
            fill(color(get_dep_color(dep)));
          }
          str = name;
        }
        if (this.dna) str = turn_into_dna(str);
        text(str, wMargin, y);

        k++;
      }

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
      fill(250);
      text(str, wMargin, h*1.2);
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



function determineScale() {
  my_scale = 0.99*windowHeight/WINDOW_HEIGHT;
}

function centerCanvas() {
  // centering canvas
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  cnv.position(x, y);
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

function getActualName(s) {
  // s: a string corresponding to a method call, of the form "[eventual prefix]/[supplier].[dependency].[actual function name]"
  // return: the actual name of the function
  return s.slice(s.lastIndexOf(".")+1, s.length);
}
