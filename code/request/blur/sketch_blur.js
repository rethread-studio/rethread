let user_events = {};
let scripting_events = {};
let rendering_events = {};

let img;
let palette;


function preload() {
    // let file = "query-analyser/scores/";
    // let file = "query-analyser/kth.se/scores/";
    // let file = "query-analyser/softwareart/scores/";
    // let file = "query-analyser/whyamisotired20200108/scores/";
    let file = "query-analyser/softwareart2(Erik)/scores/";

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

    noLoop();
    createCanvas(1800, 1800);
    background(0);
    // blendMode(LIGHTEST);
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
    draw_scripting_events();
    // draw_system_events();
    draw_rendering_events();

    // }


}

function draw_user_events() {

    // example data
    // name: "mouseover"
    // ts: 836309904609

    let data = user_events["events"];
    let all_names = [];
    let total_events = Object.keys(data).length;

    // Get all the names
    data.forEach(function (e) {
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

function draw_scripting_events() {

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

    let data = scripting_events;
    let all_names = [];
    let all_ids = [];
    let all_times = [];
    let all_col = [];
    let all_lines = [];
    let total_events = Object.keys(data).length;

    // Get all the names, 5935
    for (let i = 0; i < total_events; i++) {
        all_names.push(data[i].functionName);
        all_ids.push(data[i].id);
        all_times.push(data[i].totalChunkTime);
        all_col.push(data[i].columnNumber);
        all_lines.push(data[i].lineNumber);
        data[i].index = i;
        data[i].children = 0;
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
    let max_time = Math.max(...all_times);
    let max_col = Math.max(...all_col);
    let max_line = Math.max(...all_lines);

    // colors
    noStroke();

    // Get positions
    for (let i = 0; i < total_events; i++) {
        let angle = i * radians(360.0 / total_events);
        let dist = map(data[i].lineNumber, 0, max_line, 300, 500);
        // dist = 70 + data[i].lineNumber / 10;

        let pos = createVector(cos(angle) * dist, sin(angle) * dist, 0);
        data[i].position = pos;
        // Debug and see all the positions:
        // fill(255)
        // ellipse(pos.x, pos.y, 2, 2);
    }

    // Connections between parents and children
    for (let i = 0; i < total_events; i++) {
        let line_start = data[i].position;
        let this_parent = data[i].parent;
        let this_parent_id;
        let line_end;

        if (this_parent != null) {
            this_parent_id = all_ids.find(x => x == this_parent);
            let parent_index = this_parent_id - 1;
            line_end = data[this_parent_id].position;
            data[parent_index].children++;

            if (i < total_events / 2)
                c = lerpColor(palette[8], palette[7], map(i, 0, total_events, 0, 1));
            else
                c = lerpColor(palette[12], palette[9], map(i, 0, total_events, 0, 1));

            c.setAlpha(3);

            let weight = map(data[i].columnNumber, 0, max_col, 30, 500);
            strokeWeight(weight);
            // strokeWeight(300);
            stroke(c)
            // DEBUG and see lines:
            // stroke(255); strokeWeight(1);

            line(line_start.x, line_start.y, line_end.x, line_end.y);
        }
    }


    // Ellipses around each point based on the total chunk time
    for (let i = 0; i < total_events; i++) {
        colorMode(RGB);
        let size = map(data[i].totalChunkTime, 0, max_time, 5, 900);
        let c;
        if (i < total_events / 2)
            c = lerpColor(palette[20], palette[7], map(i, 0, total_events / 2, 0, 1));
        else
            c = lerpColor(palette[30], palette[5], map(i, 0, total_events / 2, 0, 1));

        colorMode(HSB, 255);
        c.setAlpha(5);
        fill(c);
        // size = size+random(-50,+50);
        ellipse(data[i].position.x, data[i].position.y, size, size);
    }






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

function draw_rendering_events() {
    colorMode(RGB);

    let data = rendering_events.events;
    let total_events = Object.keys(data).length;
    let all_pos = [];
    let all_dur = [];

    // 540 events
    for (let i = 0; i < total_events; i++) {
        if (data[i].x != null) {
            all_pos.push(createVector(data[i].x, data[i].y));
            all_dur.push(data[i].dur);
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
    let max_dur = Math.max(...all_dur);
    let min_dur = Math.min(...all_dur);

    // draw things
    for (let i = 0; i < total_events; i++) {
        if (data[i].x != null) {
            fill(140, 245, 200, 5);
            let dist = map(data[i].dur, min_dur, max_dur, 100, 200);
            // Position is based on the x and y coord (if it has them)
            let pos = createVector(cos(data[i].x) * dist, sin(data[i].y) * dist, 0);
            // Size increases with distance
            ellipse(pos.x, pos.y, dist * 2, dist * 2);
        }
        else {
            fill(255, 4, 200, 5);
            let dist = map(data[i].dur, min_dur, max_dur, 50, 150);
            let i_ = map(i, 0, total_events, -PI, PI);
            // Position depends on the order in the data, going around the circle
            let pos = createVector(cos(i_) * dist, sin(i_) * dist, 0);
            // Size depends on the distance
            ellipse(pos.x, pos.y, dist * 0.5, dist * 0.5);
        }

    }

}

function mouseClicked() {
    img = save('query_art.jpg');
}