p5.disableFriendlyErrors = true; // disables FES

let data = [];
let all_repos_list;
let gitlab_repos_list = ["redhat/centos-stream/rpms/bpftrace"], other_repos_list = ["artistic-inspirations", "rethread-and-friends"];

let lineHeight = 20;
let charWidth;
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

// glitch modes
const RANDOM = -1, NO_GLITCH = 0, SHUFFLE = 1, LEET = 2, S_PLUS_7 = 3, HEXADECIMAL = 4, SLIDE = 5, REVERSE = 6;
const numModes = 7;
let wasGlitched = false;
let glitchMode = NO_GLITCH;

function preload() {
  all_repos_list = loadStrings("../data/repo_lists/all_repos.txt", loadRepos);
  //all_repos_list = loadStrings("https://raw.githubusercontent.com/castor-software/rethread/master/code/credits/data/repo_lists/all_repos.txt", loadRepos);
}

function loadRepos(all_repos_list) {
  for (let r of all_repos_list) {
    if (r.length > 0) {
      data.push(loadJSON("../data/processed_datasets/"+r.replaceAll("/", "_")+"_contributors_processed.json"));
      //data.push(loadJSON("https://raw.githubusercontent.com/castor-software/rethread/master/code/credits/data/processed_datasets/"+r.replaceAll("/", "_")+"_contributors_processed.json"));
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
  
  textFont("monospace", lineHeight/1.1);
  charWidth = textWidth("a");
  gap = 3*charWidth;
  
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

  if (glitchMode == RANDOM) {
    if (random() < 1/8) glitchMode = wasGlitched ? 0 : ~~random(numModes);
  } else if (glitchMode == NO_GLITCH) {
    if (random() < 1/512) {
      // glitch it!
      glitchMode = RANDOM;
      wasGlitched = false;
    }
  } else {
    if (random() < 1/128) {
      // back to normal
      glitchMode = RANDOM;
      wasGlitched = true;
    }
  }
  
  if (selectedLine != -1) {
    fill(dark_green);
    rect(0, (selectedLine)*lineHeight, width, lineHeight);
  }
  
  fill(neon_green);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    let contributors = data[i].contributors;
    let x = x0[i];
    let j = j0[i];
    while (x < width*1.2) {
      let c = contributors[j%contributors.length];
      text(glitchText(c.id), x, y);
      x += charWidth*c.id.length + gap;
      j++;
    }
    y += lineHeight;
    let theSpeed = theSpeeds[i];
    if (i == selectedLine) theSpeed = minSpeed/2;
    x0[i] -= theSpeed;
    if (x0[i] <= -charWidth*contributors[j0[i]].id.length - gap) {
      x0[i] = 0;
      j0[i] = (j0[i]+1)%contributors.length;
    }
  }
  
  if (selectedLine != -1) {
    let repo_name = all_repos_list[selectedLine];
    repo_name = repo_name.substring(repo_name.lastIndexOf("/")+1);
    let info_contributors = data[selectedLine].contributors.length + (other_repos_list.indexOf(repo_name) != -1 ? " people" : " contributors") ;
    let offset = lineHeight*3/4;
    let x = mouseX+offset;
    let y = mouseY+offset;
    let w = Math.max(repo_name.length, info_contributors.length)*charWidth;
    let h = 2*lineHeight;
    if (x + w > width) x -= w;
    if (y + h > height) y -= 2*h;
    fill(dark_pink);
    stroke(neon_green);
    rect(x, y, w, h);
    noStroke();
    fill(neon_green);
    text(repo_name, x, y);
    text(info_contributors, x, y+lineHeight);
  }
}

function glitchText(str) {
  if (glitchMode == RANDOM) {
    let chars = str.split("");
    for (let i = 0; i < chars.length; i++) {
      chars[i] = random("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ".split(""));
    }
    return chars.join("");
  }
  if (glitchMode == NO_GLITCH) return str;
  if (glitchMode == SHUFFLE) {
    randomSeed(frameCount/64);
    return shuffle(str.split("")).join("");
  }
  if (glitchMode == LEET) {
    let chars = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split("");
    for (let i = 0; i < chars.length; i++) {
      switch (chars[i].toUpperCase()) {
        case "A":
          chars[i] = "4";
          break;
        case "B":
          chars[i] = "8";
          break;
        case "E":
          chars[i] = "3";
          break;
        case "G":
          chars[i] = "6";
          break;
        case "L":
          chars[i] = "1";
          break;
        case "O":
          chars[i] = "0";
          break;
        case "Q":
          chars[i] = "9";
          break;
        case "S":
          chars[i] = "5";
          break;
        case "T":
          chars[i] = "7";
          break;
        case "Z":
          chars[i] = "2";
          break;
      }
    }
    return chars.join("");
  }
  if (glitchMode == S_PLUS_7) {
    let chars = str.split("");
    for (let i = 0; i < chars.length; i++) {
      let c = chars[i];
      chars[i] = String.fromCodePoint(c.codePointAt(0)+7);
    }
    return chars.join("");
  } else if (glitchMode == HEXADECIMAL) {
    let chars = str.split("");
    for (let i = 0; i < chars.length; i++) {
      let c = chars[i];
      chars[i] = (c.codePointAt(0)%16).toString(16);
    }
    return chars.join("");
  } else if (glitchMode == SLIDE) {
    let chars = str.split("");
    for (let i = 0; i < chars.length; i++) {
      chars[i] = str[(i+floor(frameCount/10))%str.length];
    }
    return chars.join("");
  } else if (glitchMode == REVERSE) {
    return str.split("").reverse().join("");
  }
}

function doubleClicked() {
  if (mouseY > 0 && mouseY < height) {
    let idx = floor(mouseY/lineHeight);
    let repo_name = all_repos_list[idx];
    if (repo_name == "artistic-inspirations") {
      window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    } else if (repo_name == "rethread-and-friends") {
      window.open("https://rethread.art/");
    } else if (gitlab_repos_list.indexOf(repo_name) != -1) {
      window.open("https://gitlab.com/"+repo_name);
    } else {
      window.open("https://github.com/"+repo_name);
    }
  }
}

function mouseMoved() {
  if (mouseY > 0 && mouseY < height && !(navigator.userAgent.toLowerCase().match(/mobile/i)))
    selectedLine = floor(mouseY/lineHeight);
  else 
    selectedLine = -1;
}

function keyPressed() {
  if (key == "r") {
    glitchMode = (glitchMode + 1)%numModes;
  }
}

function windowResized() {
  let params = getURLParams();
  if (params.wholescreen != undefined && params.wholescreen == "yes") {
    lineHeight = 0.99*windowHeight/data.length;
  }
  resizeCanvas(windowWidth, data.length*lineHeight);
}