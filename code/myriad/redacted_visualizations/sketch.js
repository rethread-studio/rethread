p5.disableFriendlyErrors = true;

let inconsolataRegular, inconsolataSemiBold;

const COMPUTER = 0, KINDLE = 1, TABLET = 2;
let type = COMPUTER;

let w = 1024;
let ratio = type == COMPUTER ? 3/4 : (type == KINDLE ? 297/210 : 1.6);

let project;

let textSize, titleTextSize;
let lineHeight;
let sideMargin;
let nLines;

let columnWidth;
let nColumns;
let wGap;
let wMargin;

function preload() {
    inconsolataRegular = loadFont("../visualize/fonts/Inconsolata-Regular.ttf");
    inconsolataSemiBold = loadFont("../visualize/fonts/Inconsolata-SemiBold.ttf");
}

function setup() {
    createCanvas(w, w*ratio);
    pixelDensity(1);
    noLoop();
    noStroke();

    let possibilities = ["macOS", "Windows", "Google Docs", "Adobe Photoshop", "Adobe Illustrator", "Safari", "Facebook"];
    if (type == 1) possibilities = ["Amazon.se"];
    if (type == 2) possibilities = ["Instagram", "ChatGPT", "YouTube", "Gmail", "WhatsApp", "iOS"];
    project = random(possibilities);
    //project = possibilities[0];

    textSize = max(width, height)/45;
    titleTextSize = textSize*1.5;
    lineHeight = textSize*1.3;
    sideMargin = titleTextSize*1.12;
    nLines = round(height/lineHeight);

    let marginToGap = 4;
    textFont(inconsolataRegular, textSize);
    columnWidth = textWidth("a".repeat(15));
    nColumns = type == COMPUTER ? 5 : 3;
    wGap = (width-2*sideMargin-nColumns*columnWidth)/(2*marginToGap+nColumns-1);
    wMargin = marginToGap*wGap;
}

function draw() {
    background("black");

    fill("orange");
    rect(0, 0, sideMargin, height);
    rect(width-sideMargin, 0, sideMargin, height);

    fill("black");
    textFont(inconsolataSemiBold, titleTextSize);
    textAlign(CENTER, TOP);

    push();
    translate(0, height/2);
    rotate(-PI/2);
    text(project, 0, 0);
    pop();

    push();
    translate(width, height/2);
    rotate(PI/2);
    text(project, 0, 0);
    pop();

    fill("white");
    textFont(inconsolataRegular, textSize);
    textAlign(CENTER, TOP);
    
    let y = 0;
    for (let i = 0; i < nLines; i++) {
        let x = sideMargin+wMargin+columnWidth/2;
        for (let j = 0; j < nColumns; j++) {
            let contributor = "▓".repeat(round(randomTriangle(1, 15)));
            if (i == ~~(nLines/2-1) && j == ~~(nColumns/2)) contributor = "information";
            if (i == ~~(nLines/2) && j == ~~(nColumns/2)) contributor = "not";
            if (i == ~~(nLines/2+1) && j == ~~(nColumns/2)) contributor = "available";
            text(contributor, x, y);

            x += wGap + columnWidth;
        }
        y += lineHeight;
    }
}

function randomTriangle(a, b) {
    return a + (b - a) * (random()-random()+1) / 2;
}