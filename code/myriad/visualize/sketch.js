p5.disableFriendlyErrors = true;

let projectsData = [];

let inconsolataRegular;

let textSize, titleTextSize;
let lineHeight;
let sideMargin;
let nLines;

let projectIdx = 0, i0 = 0;
let scrollSpeed = 1, y0 = 0;

function preload() {
    let params = getURLParams();
    let work = params.work;
    if (work == undefined) work = "all";
    loadStrings("../get_all_contributors/gh_repos_lists/"+work+"_gh_repos.txt", (l => loadRepos(l, "gh")));
    loadStrings("../get_all_contributors/other_projects_lists/"+work+"_other_projects.txt", (l => loadRepos(l, "other")));

    inconsolataRegular = loadFont("./fonts/Inconsolata-Regular.ttf");
}

function loadRepos(myList, kind) {
    //console.log(projectsList)
    for (let el of myList) {
        if (el.length > 0 && el != "torvalds/linux") {
            let path = kind == "gh" ? "../get_all_contributors/gh_contributors/"+el.replaceAll("/", "&")+".txt" : "../get_all_contributors/other_contributors/"+el+".txt";
            let leftText = kind == "gh" ? el.split("/")[0] : el;
            let rightText = kind == "gh" ? el.split("/")[1] : el;
            loadStrings(path, strings => createProject(leftText, rightText, strings));
        }
    }
}

function createProject(leftText, rightText, strings) {
    let size = 500;
    shuffle(strings, true);
    while (strings.length > 0) {
        projectsData.push({
            leftText: leftText,
            rightText: rightText,
            contributors: strings.splice(0, size)
        });
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(round(randomTriangle(1, 8)));
    //textAlign(CENTER, TOP);
    //noLoop();
    noStroke();

    textSize = max(width, height)/45;
    titleTextSize = textSize*1.5;
    lineHeight = textSize*1.3;
    sideMargin = titleTextSize*1.12;
    nLines = 1+~~(height/lineHeight);

    let contributorCount = 0;

    textFont(inconsolataRegular, textSize);
    let marginToGap = 3;
    for (let project of projectsData) {
        let columnWidth = 0;
        for (let contributor of project.contributors) {
            let w = textWidth(contributor);
            if (w > columnWidth) columnWidth = w;
        }
        project.columnWidth = columnWidth;
        //project.nColumns = ~~(width*0.8/columnWidth);
        //if (project.contributors.length < nLines) project.nColumns = 1;
        project.nColumns = floor(min((width-2*sideMargin)*0.8/columnWidth, 1.5*project.contributors.length/nLines+1));
        project.wGap = (width-2*sideMargin-project.nColumns*columnWidth)/(2*marginToGap+project.nColumns-1);
        project.wMargin = marginToGap*project.wGap;

        shuffle(project.contributors, true);
        for (let i = 0; i < (nLines-1)*project.nColumns; i++) {
            project.contributors.unshift("");
        }

        contributorCount += project.contributors.length;
    }

    shuffle(projectsData, true);
    console.log(contributorCount);
}

function draw() {
    removeElements();
    background(0);

    //if (frameRate() > 30) fill(0, 255, 0);
    //else fill(255, 0, 0);
    //text(~~frameRate(), 20, 10);

    let project = projectsData[projectIdx];

    fill("orange");
    rect(0, 0, sideMargin, height);
    let leftTitle = createElement("h1", project.leftText);
    leftTitle.style("color", "black");
    leftTitle.style("font-size", titleTextSize);
    leftTitle.style("width", width);
    leftTitle.style("transform", "rotate(-90deg)");
    leftTitle.position(-width/2+titleTextSize/2, height/2-titleTextSize);

    rect(width-sideMargin, 0, sideMargin, height);
    let rightTitle = createElement("h1", project.rightText);
    rightTitle.style("color", "black");
    rightTitle.style("font-size", titleTextSize);
    rightTitle.style("width", width);
    rightTitle.style("transform", "rotate(90deg)");
    rightTitle.position(width/2-titleTextSize/2, height/2-titleTextSize);
    
    let y = 0;
    for (let i = 0; i < nLines; i++) {
        let x = sideMargin+project.wMargin;
        for (let j = 0; j < project.nColumns; j++) {
            let idx = i0 + i*project.nColumns + j;
            if (idx >= project.contributors.length) break;
            let contributor = project.contributors[idx];
            let p = createP(contributor);
            p.style("color", "white");
            p.style("font-size", textSize);
            p.style("width", project.columnWidth);
            p.position(x, y);

            x += project.wGap + project.columnWidth;
        }
        y += lineHeight;
    }

    i0 += project.nColumns;
    if (i0 > project.contributors.length) {
        projectIdx++;
        if (projectIdx >= projectsData.length) projectIdx = 0;
        i0 = 0;
    }
}

function randomTriangle(a, b) {
    return a + (b - a) * (random()-random()+1) / 2;
}