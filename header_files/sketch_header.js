let canvas;
let width = 0;
let height = 0;

// function windowResized() {
//     width = window.innerWidth;
//     height = windowWidth * 0.5;
//     resizeCanvas(width, height);
// }

// windowResized function by GoToLoop
// https://gist.github.com/GoToLoop/54b4c49e9c2541da2d91692bf0c01192
// removes scrollbars by using the computed width?
function windowResized() {
    const css = getComputedStyle(document.getElementById('header')),
          mw = float(css.marginLeft) + float(css.marginRight),
          mh = float(css.marginTop)  + float(css.marginBottom),
          ww = float(css.width)  || windowWidth,
          wh = float(css.height) || windowHeight,
          w = round(ww - mw), h = round(wh - mh);
  
    resizeCanvas(w, h, true);
  }



let user_events = {};
let scripting_events = {};
let rendering_events = {};

let img;
let palette;


function preload() {
    // let file = "query-analyser/scores/";
    // let file = "query-analyser/kth.se/scores/";
    // let file = "query-analyser/softwareart/scores/";
    let file = "header_files/whyamisotired20200108/scores/";
    // let file = "query-analyser/softwareart2(Erik)/scores/";

    user_events = loadJSON(file + "user_events.json");
    scripting_events = loadJSON(file + "parsed_scripting_events.json");
    rendering_events = loadJSON(file + "rendering_events.json");
}

function setup() {
    palette = [color(0, 126, 255, 100), color(213, 4, 217, 100), color(242, 105, 56, 100), color(85, 0, 194, 100),
    color(125, 122, 191, 100), color(160, 194, 30, 100), color(122, 245, 200, 100), color(20, 126, 255, 100),
    color(255, 4, 217, 100), color(242, 100, 30, 100), color(75, 0, 150, 100), color(130, 122, 120, 100),
    color(180, 194, 30, 100), color(140, 245, 200, 100), color(90, 126, 255, 100), color(213, 145, 217, 100),
    color(242, 15, 50, 100), color(85, 30, 194, 100), color(125, 100, 191, 100), color(130, 194, 30, 100),
    color(122, 245, 210, 100), color(10, 126, 255, 100), color(255, 4, 200, 100), color(220, 100, 30, 100),
    color(80, 5, 150, 100), color(130, 100, 120, 100), color(180, 170, 30, 100), color(140, 245, 190, 100),
    color(70, 180, 255, 100), color(200, 4, 217, 100), color(230, 105, 56, 100), color(85, 0, 160, 100),];

    // noLoop();
    frameRate(1000);

    blendMode(LIGHTEST);



    setup_scripting();
    setup_rendering();


    // Setup header

    width = windowWidth;
    height = width * 0.5;
    canvas = createCanvas(width, height);
    canvas.parent('header');
    canvas.style('display', 'block');
    canvas.position(0, 0);
    windowResized(); // immediately resize to fit
    // canvas.style("z-index", "-1");
}

let f = 0;

// Both
let data_s, data_r;
let total_events_s, total_events_r;

// Scripting
let all_names = [];
let all_ids = [];
let all_times = [];
let all_col = [];
let all_lines = [];

let max_time, max_col, max_line;

// Rendering
let all_pos = [];
let all_dur = [];
let max_dur, min_dur;


function setup_scripting() {
    data_s = scripting_events;
    total_events_s = Object.keys(data_s).length;

    // Get all the names, 5935
    for (let i = 0; i < total_events_s; i++) {
        all_names.push(data_s[i].functionName);
        all_ids.push(data_s[i].id);
        all_times.push(data_s[i].totalChunkTime);
        all_col.push(data_s[i].columnNumber);
        all_lines.push(data_s[i].lineNumber);
        data_s[i].index = i;
        data_s[i].children = 0;
    }
    // Get unique names -> root, over, program, idle...
    let unique_names = Array.from(new Set(all_names));

    // How many unique names? 1507
    let names_amount = [];
    unique_names.forEach(function (n, index) {
        let amount = all_names.filter(x => x == n).length;
        names_amount.push(amount);
    });

    // Get max time, column number and line number
    max_time = Math.max(...all_times);
    max_col = Math.max(...all_col);
    max_line = Math.max(...all_lines);

    // Get positions
    for (let i = 0; i < total_events_s; i++) {
        let angle = i * radians(360.0 / total_events_s);
        let dist = map(data_s[i].lineNumber, 0, max_line, 300, 500);
        // dist = 70 + data[i].lineNumber / 10;

        let pos = createVector(cos(angle) * dist, sin(angle) * dist, 0);
        data_s[i].position = pos;
        // Debug and see all the positions:
        // fill(255)
        // ellipse(pos.x, pos.y, 2, 2);
    }
}

function setup_rendering() {
    data_r = rendering_events.events;
    total_events_r = Object.keys(data_r).length;

    // 540 events
    for (let i = 0; i < total_events_r; i++) {
        if (data_r[i].x != null) {
            all_pos.push(createVector(data_r[i].x, data_r[i].y));
            all_dur.push(data_r[i].dur);
        }

    }

    //////// two examples of data, some have x,y, some don't

    // name: "UpdateLayerTree"
    // dur: 20
    // ts: 312361811267

    // name: "HitTest"
    // ts: 312361811292
    // dur: 53
    // x: 1283
    // y: 290
    // nodeName: "DIV id='lga'"
    // move: true




    // Get max x and max y
    // let max_pos = createVector( Math.max(...all_pos.x), Math.max(...all_pos.y));
    // Get max duration
    max_dur = Math.max(...all_dur);
    min_dur = Math.min(...all_dur);
}



function draw() {

    // Coordinate system starts in the middle of the canvas:
    translate(width / 2, height / 2);

    // Microscope effect
    // fill(255);
    // ellipse(0, 0, width / 2, height / 2);

    // For a very saturated glitchy effect, repeat everything:
    // for (let i = 0; i < 20; i++) {

    // draw_user_events();
    if (f < total_events_s)
        draw_scripting_events(f);
    else if (f < total_events_s + total_events_r) {
        draw_rendering_events(f);
    }



    // }

    f++;
}

function draw_user_events() {

    // example data
    // name: "mouseover"
    // ts: 836309904609

    let data_u = user_events["events"];
    let all_names = [];
    let total_events_u = Object.keys(data_u).length;

    // Get all the names
    data_u.forEach(function (e) {
        all_names.push(e.name)
    });
    // Get unique names -> mouseover, mousemove, mouseout,...
    let unique_names = Array.from(new Set(all_names));
    // How many unique names?
    let names_amount = [];
    unique_names.forEach(function (n) {
        names_amount.push(all_names.filter(x => x == n).length);
        console.log(names_amount)
    });
    let max_names_amount = Math.max(...names_amount);

    noStroke();
    fill(255);

    unique_names.forEach(function (un, index) {
        let angle = index * radians(360.0 / names_amount.length);
        let dist = map(names_amount[index], 0, max_names_amount, 100, 500);
        let pos = createVector(cos(angle) * dist, sin(angle) * dist, 0);
        // ellipse(pos.x, pos.y, dist, dist);
        strokeWeight(2);
        stroke(200, 220, 217, 20);
        push();
        translate(-100, -100);
        line(pos.x, pos.y, 0, 0);
        pop();
    });

}

function draw_scripting_events(f) {

    // The data looks like this:
    // {
    //     "type": "js_function",
    //     "ts": 836321567908,
    //     "functionName": "",
    //     "lineNumber": 681,
    //     "columnNumber": 37,
    //     "code": "",
    //     "id": 5935,
    //     "parent": 1,
    //     "totalChunkTime": 13648
    // }

    // colors
    noStroke();

    // Connections between parents and children
    // for (let i = 0; i < total_events; i++) {
    let i = f;

    let line_start = data_s[i].position;
    let this_parent = data_s[i].parent;
    let this_parent_id;
    let line_end;

    if (this_parent != null) {
        this_parent_id = all_ids.find(x => x == this_parent);
        let parent_index = this_parent_id - 1;
        line_end = data_s[this_parent_id].position;
        data_s[parent_index].children++;
        let c;
        if (i < total_events_s / 2)
            c = lerpColor(palette[8], palette[7], map(i, 0, total_events_s, 0, 1));
        else
            c = lerpColor(palette[12], palette[9], map(i, 0, total_events_s, 0, 1));

        c.setAlpha(1);

        let weight = map(data_s[i].columnNumber, 0, max_col, 300, 1000);
        strokeWeight(weight);
        // strokeWeight(300);
        stroke(c)
        // DEBUG and see lines:
        // stroke(255); strokeWeight(1);

        line(line_start.x, line_start.y, line_end.x, line_end.y);
    }
    // }

    // Ellipses around each point based on the total chunk time
    // for (let i = 0; i < total_events; i++) {
    colorMode(RGB);
    let size = map(data_s[i].totalChunkTime, 0, max_time, 5, 1000);
    let c;
    if (i < total_events_s / 2)
        c = lerpColor(palette[20], palette[7], map(i, 0, total_events_s / 2, 0, 1));
    else
        c = lerpColor(palette[30], palette[5], map(i, 0, total_events_s / 2, 0, 1));

    colorMode(HSB, 255);
    c.setAlpha(5);
    fill(c);
    // size = size+random(-50,+50);
    ellipse(data_s[i].position.x, data_s[i].position.y, size, size);
    // }






    // let points = [];

    // stroke(palette[0]);
    // strokeWeight(1);
    // noFill();
    // noStroke();
    // fill(palette[0]);


    // let center = createVector(width / 2, height / 2);

    // unique_names.forEach(function (n, index) {
    //     let amount = all_names.filter(x => x == n).length;

    //     translate(-amount/2, -amount/2);
    //     if (amount > 4) {
    //         beginShape();
    //         console.log(amount)
    //         for (let i = 0; i < amount; i++) {
    //             curveVertex(center.x + amount-amount, center.y + amount-amount);
    //             curveVertex(center.x + amount*2-amount, center.y + amount-amount);
    //             curveVertex(center.x + amount*2-amount, center.y + amount*2-amount);
    //             curveVertex(center.x + amount-amount, center.y + amount*2-amount);
    //         }
    //         endShape();
    //     }
    //     translate(amount/2,amount/2);



    //     names_amount.push(amount);
    // });


}

function draw_rendering_events(f) {
    colorMode(RGB);

    let i = f-total_events_s;

    // draw things

    if (data_r[i].x != null) {
        fill(140, 245, 200, 5);
        let dist = map(data_r[i].dur, min_dur, max_dur, 100, 200);
        // Position is based on the x and y coord (if it has them)
        let pos = createVector(cos(data_r[i].x) * dist, sin(data_r[i].y) * dist, 0);
        // Size increases with distance
        ellipse(pos.x, pos.y, dist * 2, dist * 2);
    }
    else {
        fill(255, 4, 200, 5);
        let dist = map(data_r[i].dur, min_dur, max_dur, 50, 150);
        let i_ = map(i, 0, total_events_r, -PI, PI);
        // Position depends on the order in the data, going around the circle
        let pos = createVector(cos(i_) * dist, sin(i_) * dist, 0);
        // Size depends on the distance
        ellipse(pos.x, pos.y, dist * 0.5, dist * 0.5);
    }



}
