let ratio = 2/3;
let t = 0;
let colors = ["#35a842", "#3851a2", "#e16c01"];

function setup() {
	createCanvas(600, 600);
	pixelDensity(4);
	stroke(0);
	noLoop();
}

function draw() {
	//background(255);
	let r = 275;
	let x = width/2;
	let y = height/2;
	let n = 10;
	noFill();
	circle(x, y, 2*r);
	pappus(r, x, y, n, -1);
	t += 0.0025;
}

function pappus(rv, vx, vy, n, col) {
	if (rv <= 25) return;
	push();
	translate(vx, vy);
	//rotate(random(TWO_PI));
	let ru = rv*ratio;
	let ux = (ratio-1)*rv;
	let uy = 0;
	//circle(ux, uy, ru*2);
	pappus(ru, ux, uy, n-1, myCircle(ux, uy, ru*2, col));
	let s = rv*2;
	for (let i = -n; i < n; i++) {
		let a = ratio*(1-ratio);
		let b = sq(i)*sq(1-ratio)+ratio;
		let x = ratio*(1+ratio)/(2*b);
		let y = i*a/b;
		let r = a/(2*b);
		//circle((x-0.5)*s, y*s, r*s*2);
		pappus(r*s, (x-0.5)*s, y*s, n-2, myCircle((x-0.5)*s, y*s, r*s*2, col));
	}
	pop();
}

function myCircle(x, y, d, col) {
	while (random() < 1/4 && col < colors.length-1) {
		col++;
	}
	if (col == -1) noFill();
	else fill(colors[col]);
	circle(x, y, d);
	return col;
}