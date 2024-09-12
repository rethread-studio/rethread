p5.disableFriendlyErrors = true; // disables FES

let reposData = [];

let inconsolataMedium, inconsolataSemiBold;

let textSize;
let wMargin;
let lineHeight;
let topMargin;
let nLines;

let repoIdx = 0, i0 = 0;
let scrollSpeed = 1, y0 = 0;

function preload() {
    let params = getURLParams();
    let work = params.work;
    loadStrings("../get_all_contributors/gh_repo_lists/"+work+"_gh_repos.txt", loadRepos);

    inconsolataMedium = loadFont("./fonts/Inconsolata-Medium.ttf");
}

function loadRepos(reposList) {
    //console.log(reposList)
    for (let r of reposList) {
        if (r.length > 0) {
            reposData.push(loadJSON("../get_all_contributors/contributors/"+r.replaceAll("/", "&")+".json"));
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(5);
    textAlign(CENTER, TOP);
    //noLoop();

    textSize = 16;
    wMargin = 10*textSize;
    console.log(wMargin)
    lineHeight = textSize*1.5;
    topMargin = textSize*5;
    nLines = ~~((height-topMargin)/lineHeight);

    textFont(inconsolataMedium, textSize);

    for (let repo of reposData) {
        let columnWidth = 0;
        for (let contributor of repo.contributors) {
            let w = textWidth(contributor.id);
            if (w > columnWidth) columnWidth = w;
        }
        repo.columnWidth = columnWidth;
        repo.nColumns = ~~((width-2*wMargin)/columnWidth);
        repo.wGap = (width-2*wMargin-repo.nColumns*columnWidth)/(repo.nColumns-1);
    }
}

function draw() {
    removeElements();
    background(0);

    if (frameRate() > 30) fill(0, 255, 0);
    else fill(255, 0, 0);
    text(~~frameRate(), 20, 10);

    let repo = reposData[repoIdx];
    let h1 = createP(repo.repo);
    h1.style("color", "white");
    h1.style("text-align", "center");
    h1.style("font-family", "monospace");
    h1.style("font-size", textSize*1.5);
    h1.style("width", width);
    //h1.style("height", topMargin);
    //h1.style("margin", 0);
    h1.position(0, 0);

    let x = wMargin, y = topMargin;
    let iMax = min(i0+nLines*repo.nColumns, repo.contributors.length);
    for (let i = i0; i < iMax; i++) {
        let contributor = repo.contributors[i];
        let p = createP(contributor.id);
        p.style("color", "white");
        p.style("text-align", "center");
        p.style("font-family", "monospace");
        p.style("font-size", textSize);
        p.style("width", repo.columnWidth);
        p.style("margin", 0);
        p.position(x, y);

        x += repo.wGap + repo.columnWidth;
        if (x > width-wMargin) {
            x = wMargin;
            y += lineHeight;
        }
    }

    i0 += repo.nColumns;
    if (i0 > repo.contributors.length) {
        repoIdx++;
        if (repoIdx > reposData.length) repoIdx = 0;
        i0 = 0;
    }
}