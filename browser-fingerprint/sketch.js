let rad = 300; // Width of the shape
let xpos, ypos; // Starting position of shape

let xspeed = 5.8; // Speed of the shape
let yspeed = 5.2; // Speed of the shape

let xdirection = 1; // Left or Right
let ydirection = 1; // Top to Bottom
let t = 0;
let f = 0;

let colors = ["#d8bfd8", "#A9AFD1", "#191970", "#fff8dc", "#F92A82", "#ED7B84", "#d8bfd8"];
let cLerp = [];

let addText = false;

let robotoMono;
function preload() {
    robotoMono = loadFont('assets/fonts/roboto-mono/roboto-mono-v7-latin-regular.ttf');
}

function setup() {
    // let cnv = createCanvas(700, 400);
    // cnv.parent("welcome");

    width = windowWidth;
    height = windowHeight;
    canvas = createCanvas(width, height);
    // canvas.parent('main_header');
    canvas.style('display', 'block');
    canvas.position(0, 0);
    canvas.style("z-index", "-1");
    

    rad = windowWidth/7;

    background("#d8bfd8");
    textFont(robotoMono);
    textSize(windowWidth/50);
    frameRate(30);
    ellipseMode(RADIUS);
    textAlign(CENTER, CENTER);

    // Set the starting position of the shape
    xpos = width / 2;
    ypos = height / 2;

    for (let c = 0; c < colors.length - 1; c++) {

        let currentC = colors[c];
        let nextC = colors[c + 1];

        for (let i = 0; i < 1; i += 0.02) {
            cLerp.push(lerpColor(color(currentC), color(nextC), i));
        }

    }

}

function draw() {

    if (f < cLerp.length - 1) {
        f++;
    } else {
        f = 0;
    }

    //background(0);


    // Update the position of the shape
    xpos = xpos + xspeed * xdirection;
    ypos = ypos + yspeed * ydirection;

    // Test to see if the shape exceeds the boundaries of the screen
    // If it does, reverse its direction by multiplying by -1
    if (xpos > width - rad || xpos < rad) {
        xdirection *= random(-0.9, -1.1);
    }
    if (ypos > height - rad || ypos < rad) {
        ydirection *= random(-0.9, -1.1);
    }

    // Draw the shape
    let c = color(85, 75, 200 + 200 * sin(0.012 + t));
    fill(cLerp[f]);
    noStroke();

    ellipse(xpos, ypos, rad, rad);

    let time = millis();
    //translate(time / 100,time/100);
    //translate(mouseX, mouseY);
    fill(0);
    //noFill();
    // stroke(255);

    push();
    translate(xpos, ypos);
    text('are you unique on the internet?', -rad + rad / 2, -rad + rad / 2, rad, rad);
    pop();

    if (addText) {

        if (time > 3000 && time < 3100) {
            push()
            noStroke();
            fill(255);
            textSize(40);
            // text('you are invited to', 200, 100);
            text('you are invited to', 350, 300);
            // fill(0)
            // text('an online exhibition', 200, 150);
            // setTimeout(function () { text('an online exhibition', 200, 200); }, 2000);
            pop()
            push()
            translate(xpos, ypos);
            text('are you unique on the internet?', -rad + rad / 2, -rad + rad / 2, rad, rad);
            pop()
        }

        if (time > 6500 && time < 6600) {
            push()
            noStroke();
            fill(255);
            textSize(40);

            text('an online exhibition', 350, 100);

            pop()
            push()
            translate(xpos, ypos);
            text('are you unique on the internet?', -rad + rad / 2, -rad + rad / 2, rad, rad);
            pop()
        }

        if (time > 10000 && time < 10100) {
            push()
            noStroke();
            fill(255);
            textSize(30);

            text('exploring', 150, 300);

            pop()
            push()
            translate(xpos, ypos);
            text('are you unique on the internet?', -rad + rad / 2, -rad + rad / 2, rad, rad);
            pop()
        }
        if (time > 13000 && time < 13100) {
            push()
            noStroke();
            fill(255);
            textSize(30);
            fill(0);
            text('{browser fingerprinting}', 300, 120);

            pop()
            push()
            translate(xpos, ypos);
            text('are you unique on the internet?', -rad + rad / 2, -rad + rad / 2, rad, rad);
            pop()
        }
        if (time > 16000) {
            push()
            noStroke();
            fill(255);
            textSize(40);

            text('April 22nd 2020 {5pm}', 350, 100);
            textSize(20);
            text('rethread.art/browser-fingerprint', 350, 300);
            pop()
            rad += t;
        }
    }

    t += 0.02;


}

let clicked = false;

function mouseClicked() {

    clicked = true;



}