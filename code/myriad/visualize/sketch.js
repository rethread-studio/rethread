p5.disableFriendlyErrors = true; // disables FES

let reposData = [];

let inconsolataMedium, inconsolataSemiBold;

let textSize;
let lineHeight;
let topMargin;
let nLines;

let repoIdx = 0, i0 = 0;
let scrollSpeed = 1, y0 = 0;

function preload() {
    let params = getURLParams();
    let work = params.work;
    if (work == undefined) work = "all";
    loadStrings("../get_all_contributors/gh_repo_lists/"+work+"_gh_repos.txt", loadRepos);

    inconsolataMedium = loadFont("./fonts/Inconsolata-Medium.ttf");
}

function loadRepos(reposList) {
    //console.log(reposList)
    for (let r of reposList) {
        if (r.length > 0 && r[0] != "*") {
            reposData.push(loadJSON("../get_all_contributors/contributors/"+r.replaceAll("/", "&")+".json"));
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(3);
    textAlign(CENTER, TOP);
    //noLoop();

    textSize = 18;
    lineHeight = textSize*1.5;
    topMargin = textSize*5;
    nLines = ~~((height-topMargin)/lineHeight);

    textFont(inconsolataMedium, textSize);

    let marginToGap = 4;
    for (let repo of reposData) {
        let columnWidth = 0;
        for (let contributor of repo.contributors) {
            let w = textWidth(contributor.id);
            if (w > columnWidth) columnWidth = w;
        }
        repo.columnWidth = columnWidth;
        //repo.nColumns = ~~(width*0.8/columnWidth);
        //if (repo.contributors.length < nLines) repo.nColumns = 1;
        repo.nColumns = floor(min(width*0.8/columnWidth, 1.5*repo.contributors.length/nLines+1));
        repo.wGap = (width-repo.nColumns*columnWidth)/(2*marginToGap+repo.nColumns-1);
        repo.wMargin = marginToGap*repo.wGap;

        for (let i = 0; i < (nLines-1)*repo.nColumns; i++) {
            repo.contributors.unshift({id: ""});
        }
    }

    shuffle(reposData, true);
}

function draw() {
    removeElements();
    background(0);

    if (frameRate() > 30) fill(0, 255, 0);
    else fill(255, 0, 0);
    text(~~frameRate(), 20, 10);
    //circle(width/2, height/2, 10);

    let repo = reposData[repoIdx];
    let h1 = createElement("h1", repo.repo);
    h1.style("color", "white");
    h1.style("font-size", textSize*2);
    h1.style("width", width);
    //h1.style("height", topMargin);
    h1.style("top-margin", textSize*1.5);
    h1.style("bottom-margin", textSize*1.5);
    h1.position(0, 0);

    let y = topMargin;
    for (let i = 0; i < nLines; i++) {
        let x = repo.wMargin;
        for (let j = 0; j < repo.nColumns; j++) {
            let idx = i0 + i*repo.nColumns + j;
            if (idx >= repo.contributors.length) break;
            let contributor = repo.contributors[idx];
            let p = createP(contributor.id);
            p.style("color", "white");
            p.style("font-size", textSize);
            p.style("width", repo.columnWidth);
            p.position(x, y);

            x += repo.wGap + repo.columnWidth;
        }
        y += lineHeight;
    }

    i0 += repo.nColumns;
    if (i0 > repo.contributors.length) {
        repoIdx++;
        if (repoIdx >= reposData.length) repoIdx = 0;
        i0 = 0;
    }
}