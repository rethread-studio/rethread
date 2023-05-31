let logo = [
	[1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
	[1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
	[1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0],
	[1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
	[1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]
];

let m = 35, n = 5, s = 20;
let margin = 1;
let col = "#69ff00";

function setup() {
	createCanvas((m+2*margin)*s, (n+2*margin)*s);
	pixelDensity(4);
	noLoop();
	noStroke();
}

function draw() {
	for (let i = 0; i < m+2*margin; i++) {
		let x = i*s;
		for (let j = 0; j < n+2*margin; j++) {
			let y = j*s;
			if (!(i < margin || i >= m+margin || j < margin || j >= n+margin)) {
				if (logo[j-margin][i-margin] == 1) {
					drawTile(x, y, s);
				}
			} else {
				//drawTile(x, y, s);
			}
		}
	}
}

function drawTile(x, y, s) {
  push();
  translate(x+s/2, y+s/2);
  rotate(random([0, PI/2, PI, 3*PI/2]));
  translate(-x-s/2, -y-s/2);
  
  let u = s/5;
  
  let r = random(2.5);
  if (r < 1) {
    fill(col);
    arc(x, y, 4*u, 4*u, 0, PI/2);
    arc(x+s, y, 2*u, 2*u, PI/2, PI);
    arc(x+s, y, 4*u, 4*u, PI/2, PI);
    arc(x+s, y+s, 2*u, 2*u, PI, 3*PI/2);
    arc(x+s, y+s, 4*u, 4*u, PI, 3*PI/2);
    arc(x, y+s, 2*u, 2*u, 3*PI/2, TAU);
    arc(x, y+s, 4*u, 4*u, 3*PI/2, TAU);
    circle(x+s/2, y+s/2, 2*u);
    
    erase();
    arc(x, y+s, 2*u, 2*u, 3*PI/2, TAU);
    arc(x+s, y+s, 2*u, 2*u, PI, 3*PI/2);
    arc(x+s, y, 2*u, 2*u, PI/2, PI);
    arc(x, y, 2*u, 2*u, 0, PI/2);
		noErase();
  } else if (r < 2) {
    fill(col);
    square(x, y, s);
    
    erase();
    arc(x, y, 6*u, 6*u, 0, PI/2);
    arc(x+s, y, 2*u, 2*u, PI/2, PI);
    arc(x+s, y+s, 6*u, 6*u, PI, 3*PI/2);
    arc(x, y+s, 2*u, 2*u, 3*PI/2, TAU);
		noErase();
    
    fill(col);
    arc(x, y, 4*u, 4*u, 0, PI/2);
    arc(x+s, y+s, 4*u, 4*u, PI, 3*PI/2);
    
    erase();
    arc(x+s, y+s, 2*u, 2*u, PI, 3*PI/2);
    arc(x, y, 2*u, 2*u, 0, PI/2);
		noErase();
  } else if (r < 3) {
    fill(col);
    arc(x, y, 8*u, 8*u, 0, PI/2);
    arc(x+s, y+3*u/2, u, u, PI/2, 3*PI/2);
    arc(x+3*u/2, y+s, u, u, PI, TAU);
    arc(x+s, y+s, 4*u, 4*u, PI, 3*PI/2);
    
    erase();
    arc(x, y, 6*u, 6*u, 0, PI/2);
    arc(x+s, y+s, 2*u, 2*u, PI, 3*PI/2);
		noErase();
    
    fill(col);
    arc(x, y, 4*u, 4*u, 0, PI/2);
    
    erase();
    arc(x, y, 2*u, 2*u, 0, PI/2);
		noErase();
  }
  
  fill(col);
  circle(x+3*u/2, y, u);
  circle(x+7*u/2, y, u);
  circle(x+s, y+3*u/2, u);
  circle(x+s, y+7*u/2, u);
  circle(x+3*u/2, y+s, u);
  circle(x+7*u/2, y+s, u);
  circle(x, y+3*u/2, u);
  circle(x, y+7*u/2, u);
  
  erase();
  circle(x, y, 2*u);
  circle(x+s, y, 2*u);
  circle(x, y+s, 2*u);
  circle(x+s, y+s, 2*u);
  
  circle(x+s/2, y, u);
  circle(x+s, y+s/2, u);
  circle(x+s/2, y+s, u);
  circle(x, y+s/2, u);
	noErase();
  
  pop();
}