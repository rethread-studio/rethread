// randomly flips to other text modes:
// - other encodings
// - leet https://en.wikipedia.org/wiki/Leet
// - hexadecimal
// - shuffle

// random highlight, automatic mouse

let data = [];
let all_repos_list;
let gitlab_repos_list = ["redhat/centos-stream/rpms/bpftrace"], other_repos_list = ["artistic-inspirations", "rethread-and-friends"];

let lineHeight = 20;
let maxLength = []; // max word length for each dataset
let gap; // gap between each name horintally
let nCols; // number of columns
let minContributors, maxContributors; // min and max number of contributors in all datasets

let neon_green = "#69ff00";
let dark_green = "#147600";
let neon_pink = "#E80985";
let dark_pink = "#7C0087";

// parameters for the animation
let j0 = [];
let x0 = [];
let minSpeed = 0.5, maxSpeed = 5, theSpeeds = [];
let selectedLine = -1;

function preload() {
  all_repos_list = loadStrings("../data/repo_lists/all_repos.txt", loadRepos);
}

function loadRepos(all_repos_list) {
  for (let r of all_repos_list) {
    if (r.length > 0) {
      data.push(loadJSON("../data/processed_datasets/"+r.replaceAll("/", "_")+"_contributors_processed.json"));
    }
  }
}

function setup() {
  let params = getURLParams();
  if (params.wholescreen != undefined && params.wholescreen == "yes") {
    lineHeight = 0.99*windowHeight/data.length;
  }
  createCanvas(windowWidth, data.length*lineHeight);
  //noLoop();
  noStroke();
  textAlign(LEFT, TOP);
  
  textFont("monospace", lineHeight/1.25);
  gap = 3*textWidth("a");
  
  minContributors = data[0].contributors.length;
  maxContributors = 0;
  for (let d of data) {
    j0.push(0);
    x0.push(0);
    let nContributors = d.contributors.length;
    if (nContributors < minContributors) minContributors = nContributors;
    if (nContributors > maxContributors) maxContributors =  nContributors;
  }
  
  for (let d of data) {
    theSpeeds.push(
      sqrt((d.contributors.length-minContributors)/(maxContributors-minContributors))*(maxSpeed-minSpeed)+minSpeed
    );
  }
}

function draw() {
  background(0);
  
  if (selectedLine != -1) {
    fill(dark_green);
    rect(0, (selectedLine)*lineHeight, width, lineHeight);
  }
  
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    let contributors = data[i].contributors;
    let x = x0[i];
    let j = j0[i];
    while (x < width*1.2) {
      let c = contributors[j%contributors.length];
      fill(neon_green);
      text(c.id, x, y);
      x += textWidth(c.id) + gap;
      j++;
    }
    y += lineHeight;
    let theSpeed = theSpeeds[i]
    if (i == selectedLine) theSpeed = minSpeed/2;
    x0[i] -= theSpeed;
    if (x0[i] < -textWidth(contributors[j0[i]].id)-gap) {
      x0[i] = 0;
      j0[i] = (j0[i]+1)%contributors.length;
    }
  }
  
  if (selectedLine != -1) {
    let repo_name = all_repos_list[selectedLine];
    repo_name = repo_name.substring(repo_name.lastIndexOf("/")+1);
    let offset = lineHeight*3/4;
    let x = mouseX+offset;
    let y = mouseY+offset;
    if (y + lineHeight > height) y -= 2*offset;
    fill(dark_pink);
    stroke(neon_green);
    rect(x, y, textWidth(repo_name), lineHeight);
    noStroke();
    fill(neon_green);
    text(repo_name, x, y);
  }
}

function mouseClicked() {
  let repo_name = all_repos_list[selectedLine];
  if (other_repos_list.indexOf(repo_name) != -1) {
    return;
  } else if (gitlab_repos_list.indexOf(repo_name) != -1) {
    window.open("https://gitlab.com/"+repo_name);
  } else {
    window.open("https://github.com/"+repo_name);
  }
}

function mouseMoved() {
  if (mouseY > 0 && mouseY < height)
    selectedLine = floor(mouseY/lineHeight);
  else 
    selectedLine = -1;
}

function windowResized() {
  let params = getURLParams();
  if (params.wholescreen != undefined && params.wholescreen == "yes") {
    lineHeight = 0.99*windowHeight/data.length;
  }
  resizeCanvas(windowWidth, data.length*lineHeight);
}