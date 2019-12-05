var touches;
var fail = false;
var startColor, newColor;
let palette;

let grid = [];
let sq = 300;
let x_start, y_start, x_end, y_end;

const Y_AXIS = 1;
const X_AXIS = 2;
let c1, c2;

function setup() {
	createCanvas(windowWidth, windowHeight);
	setupOsc(7772, 3334);
	background(0);
	blendMode(LIGHTEST);
	palette = [color(0, 126, 255, 100), color(213, 4, 217, 100), color(242, 105, 56, 100), color(10, 126, 255, 100),
	color(125, 122, 191, 100), color(255, 234, 43, 100), color(122, 245, 200, 100),
	color(255, 4, 217, 100), color(242, 100, 30, 100), color(75, 0, 150, 100),
	color(180, 194, 30, 100), color(140, 245, 200, 100), color(90, 126, 255, 100), color(213, 145, 217, 100),
	color(242, 15, 50, 100), color(85, 30, 194, 100), color(125, 100, 191, 100), color(130, 194, 30, 100),
	color(122, 245, 210, 100), color(255, 4, 200, 100), color(220, 100, 30, 100),
	color(80, 5, 150, 100), color(130, 100, 120, 100), color(180, 170, 30, 100), color(140, 245, 190, 100),
	color(70, 180, 255, 100), color(200, 4, 217, 100), color(230, 105, 56, 100), color(85, 0, 160, 100),];

	let x_max = sq * floor(width / sq);
	let y_max = sq * floor(height / sq);

	x_start = (width - x_max) / 2;
	y_start = (height - y_max) / 2;

	x_end = x_start + x_max;
	y_end = y_start + y_max;

	for (let y = 0; y < (height / sq) - 1; y++) {
		for (let x = 0; x < (width / sq) - 1; x++) {
			grid.push(createVector(x * sq + x_start, y * sq + y_start));
			// visible grid:
			noFill();
			stroke(255);
			rect(x * sq + x_start, y * sq + y_start, sq, sq);
		}
	}
}

function draw() {
	// if (touches[0] == 1) {
	// 	// one touched
	// 	one();
	// }
}

// FOR DEBUGGING
function keyTyped() {
	if (key === 'q') {
		zero();
	}
	if (key === 'a') {
		one();
	}
	if (key === 's') {
		two();
	}
	if (key === 'd') {
		three();
	}
	if (key === 'f') {
		four();
	}
	if (key === 'g') {
		five();
	}
	if (key === 'h') {
		six();
	}
	if (key === 'j') {
		seven();
	}
	if (key === 'k') {
		eight();
	}
	if (key === 'l') {
		nine();
	}
	if (key === 'z') {
		ten();
	}
	if (key === 'x') {
		eleven();
	}
	if (key === 'w') {
		twelve();
	}

	if (key === 'c') {
		clear();
		background(0);
	}
	if (key === '0') {
		background(255);
	}
	if (key === '1') {
		black();
	}
}

function zero() {
	push();
	noStroke();
	fill(palette[13]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	arc(x, y, sq * 2, sq * 2, 0, HALF_PI);
	pop();
}

function one() {
	push();
	noStroke();
	fill(palette[1]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x + (sq / 2);
	let y = pos.y + (sq / 2);
	ellipse(x, y, sq/6, sq/6);
	// ellipse(x + random(20), y + random(20), 60, 60);
	// ellipse(x - random(20), y - random(20), 30, 30);
	// ellipse(x + random(20), y - random(20), 10, 10);
	// ellipse(x - random(20), y + random(20), 20, 20);
	pop();
}

// var angle = 0;
// var r = 50;
// var spin = 0.3;
// var grow = spin * 20;
function two() {
	push();
	noStroke();
	// fill(palette[2]);
	// angle += spin;
	// r = r + grow;
	// r = noise(angle) * 100;
	// Polar to Cartesian Transformation
	// var x = cos(angle) * r;
	// var y = sin(angle) * r;
	// translate(2, 2);
	//line(0, 0, x, y);
	// ellipse(width / 2 + x, height / 2 + y, 100, 100);

	push();
	noStroke();
	fill(palette[2]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	let choose = floor(random(4));
	switch (choose) {
		case 0:
			arc(x, y, sq, sq, 0, HALF_PI);
			break;
		case 1:
			arc(x + sq, y + sq, sq, sq, PI, PI + HALF_PI);
			break;
		case 2:
			arc(x + sq, y, sq, sq, HALF_PI, PI);
			break;
		case 3:
			arc(x, y + sq, sq, sq, PI + HALF_PI, 0);
			break;

		default:
			break;
	}
	// arc(x, y, sq, sq, 0, HALF_PI);
	// arc(x + sq, y + sq, sq, sq, PI, PI + HALF_PI);
	// arc(x + sq, y, sq, sq, HALF_PI, PI);
	// arc(x, y+sq, sq, sq, PI+ HALF_PI, 0);
	pop();
}

function three() {
	// noStroke();
	// fill(palette[3]);
	// let x = random(width);
	// let y = random(height);
	// push();
	// translate(x, y);
	// rotate(random(2 * PI));
	// triangle(0, 0, x + 30, y + 50, x - 30, y + 50);
	// pop();

	push();
	noStroke();
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	// rect(x,y,sq,sq);
	c1 = palette[3];
	c2 = color(0);

	let choose = floor(random(4));
	switch (choose) {
		case 0:
			fill(palette[3]);
			bumps(x, y, sq / 3);
			break;
		case 1:
			push();
			fill(palette[3]);
			translate(x + sq, y + sq);
			rotate(PI);
			x = 0;
			y = 0;
			bumps(x, y, sq / 3);
			pop();
			break;
		case 2:
			fill(palette[3]);
			bumps(x, y, sq / 3 / 2);
			break;
		case 3:
			setGradient(x, y, sq, sq / 2, c1, c2, X_AXIS);
			break;

	}
	pop();
}

function bumps(x, y, size) {
	arc(x, y + size, 2 * size, 2 * size, PI + HALF_PI, 0);
	arc(x + size, y + 2 * size, 2 * size, 2 * size, PI + HALF_PI, 0);
	arc(x + 2 * size, y + 3 * size, 2 * size, 2 * size, PI + HALF_PI, 0);
	rect(x, y + 2 * size, 2 * size, size);
	rect(x, y + size, size, size);
}

function four() {
	// sprinkles
	// push();
	// noStroke();
	// fill(palette[4]);
	// let x = random(width);
	// let y = random(height);
	// translate(x, y);
	// rotate(random(2 * PI));
	// rect(0, 0, 30, 10, 20);
	// pop();

	push();
	noStroke();
	fill(palette[4]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	arc(x, y, sq, sq, 0, HALF_PI);
	arc(x + sq, y + sq, sq, sq, PI, PI + HALF_PI);
	arc(x + sq, y, sq, sq, HALF_PI, PI);
	arc(x, y + sq, sq, sq, PI + HALF_PI, 0);
	pop();
}

// let i5 = 0;
// let y5 = 300;
// let x5;
function five() {
	push();
	noStroke();
	fill(palette[5]);
	// if (x5 > width) {
	// 	y5 = random(height);
	// 	i5 = 0;
	// }
	// x5 = i5 * 30;
	// ellipse(x5, y5 + sin(i5) * 20.0, 26, 26);
	// i5 += 0.9;
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;

	let choose = floor(random(4));
	switch (choose) {
		case 0:
			// if last row/col
			if (x == x_end - sq || y == y_end - sq) {
				rect(x, y, sq, sq);
			}
			// if first row/col
			else if (x == x_start || y == y_start) {
				arc(x, y, sq, sq, 0, HALF_PI);
			}
			else {
				rect(x, y, sq, sq);
				arc(x + sq, y, sq * 2, sq * 2, 0, HALF_PI);
				arc(x, y, sq * 2, sq * 2, HALF_PI, PI);
			}
			break;
		case 1:
			// if first row/col
			if (x == x_start || y == y_start) {
				rect(x, y, sq, sq);
			}
			// if last row/col
			else if (x == x_end - sq || y == y_end - sq) {
				arc(x, y, sq * 2, sq * 2, PI, PI + HALF_PI);
			}
			else {
				rect(x, y, sq, sq);
				arc(x - sq, y, sq * 2, sq * 2, 0, HALF_PI);
				arc(x, y, sq * 2, sq * 2, HALF_PI, PI);
			}
			break;
		case 2:
			arc(x + sq, y, sq, sq, HALF_PI, PI);
			break;
		case 3:
			arc(x, y, sq / 2, sq / 2, 0, HALF_PI);
			break;

		default:
			break;
	}

	pop();
}

function six() {
	push();
	noStroke();
	fill(palette[6]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;


	let choose = floor(random(4));
	switch (choose) {
		case 0:
			arc(x, y, sq * 2, sq * 2, 0, HALF_PI);
			break;
		case 1:
			arc(x + sq, y, sq * 2, sq * 2, HALF_PI, PI);
			break;
		case 2:
			arc(x + sq, y + sq, sq * 2, sq * 2, PI, PI + HALF_PI);
			break;
		case 3:
			arc(x, y + sq, sq * 2, sq * 2, PI + HALF_PI, 0);
			break;

		default:
			break;
	}
	// arc(x, y, sq * 2, sq * 2, 0, HALF_PI);
	// arc(x+sq, y, sq * 2, sq * 2, HALF_PI, PI);
	// arc(x+sq, y+sq, sq * 2, sq * 2, PI, PI + HALF_PI);
	// arc(x, y+sq, sq * 2, sq * 2, PI + HALF_PI, 0);
	pop();
}

function seven() {
	push();
	noStroke();
	fill(palette[7]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	// if first position
	if (x == x_start && y == y_start) {
		arc(x, y, sq * 2, sq * 2, 0, HALF_PI);
	}
	// if first row
	else if (x == x_start) {
		arc(x, y, sq * 2, sq * 2, PI + HALF_PI, HALF_PI);
	}
	// if first col
	else if (y == y_start) {
		arc(x, y, sq * 2, sq * 2, 0, PI);
	}
	else {
		ellipse(x, y, sq * 2, sq * 2);
	}
	pop();
}
function eight() {
	push();
	noStroke();
	fill(palette[8]);
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;

	// if last position
	if (x == x_end - sq && y == y_end - sq) {
		arc(x + sq, y + sq, sq * 2, sq * 2, PI, PI + HALF_PI);
	}
	// if last row
	else if (x == x_end - sq) {
		arc(x + sq, y + sq, sq * 2, sq * 2, HALF_PI, PI + HALF_PI);
	}
	// if last col
	else if (y == y_end - sq) {
		arc(x + sq, y + sq, sq * 2, sq * 2, PI, 0);
	}
	else {
		ellipse(x + sq, y + sq, sq * 2, sq * 2);
	}
	pop();
}
function nine() {
	push();
	noStroke();
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;


	let choose = floor(random(4));
	switch (choose) {
		case 0:
			c1 = palette[9];
			c2 = color(0);
			setGradient(x, y, sq, sq, c2, c1, X_AXIS);
			break;
		case 1:
			c1 = palette[14];
			c2 = color(0);
			setGradient(x, y, sq, sq, c1, c2, X_AXIS);
			break;
		case 2:
			c1 = palette[9];
			c2 = color(0);
			setGradient(x, y, sq / 2, sq / 2, c1, c2, X_AXIS);
			break;
		case 3:
			c1 = palette[9];
			c2 = color(0);
			setGradient(x + sq / 2, y + sq / 2, sq / 2, sq / 2, c2, c1, X_AXIS);
			break;
		default:
			break;
	}




	// arc(x,y,sq,0,HALF_PI);
	pop();
}
function ten() {
	push();
	noStroke();
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	// rect(x,y,sq,sq);
	c1 = palette[10];
	c2 = color(0);
	// if last position
	if (x == x_end - sq && y == y_end - sq) {
		setGradient(x, y, sq, sq, c2, c1, Y_AXIS);
	}
	// if last row
	else if (x == x_end - sq) {
		setGradient(x, y, sq, sq * 2, c2, c1, Y_AXIS);
	}
	// if last col
	else if (y == y_end - sq) {
		setGradient(x, y, sq * 2, sq, c2, c1, Y_AXIS);
	}
	else {
		setGradient(x, y, sq * 2, sq * 2, c2, c1, Y_AXIS);
	}
	pop();
}
function eleven() {
	push();
	noStroke();
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	fill(palette[11]);
	ellipse(x + sq / 2, y + sq / 2, sq / 2, sq / 2);
	pop();
}
function twelve() {
	push();
	noStroke();
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;
	fill(palette[12]);
	// arc(x, y, sq * 2, sq * 2, 0, HALF_PI);
	// arc(x+sq, y, sq * 2, sq * 2, HALF_PI, PI);
	// arc(x+sq, y+sq, sq * 2, sq * 2, PI, PI + HALF_PI);
	// arc(x, y+sq, sq * 2, sq * 2, PI + HALF_PI, 0);
	ellipse(x + sq / 2, y + sq / 2, sq, sq);
	pop();
}

function black() {
	push();
	noStroke();
	let pos = grid[floor(random(grid.length))];
	let x = pos.x;
	let y = pos.y;

	blendMode(MULTIPLY);

	fill(0);
	let choose = floor(random(8));
	// let choose = 8;
	switch (choose) {
		case 0:
			// first row
			y = y_start;
			rect(x, y, sq, sq);
			break;
		case 1:
			// last row
			y = y_end - sq;
			rect(x, y, sq, sq);
			// arc(x, y, sq * 2, sq * 2, 0, HALF_PI);
			break;
		case 2:
			// last col
			x = x_end - sq;
			rect(x, y, sq, sq);
			// arc(x + sq, y, sq * 2, sq * 2, 0, HALF_PI);
			break;
			break;
		case 3:
			// first col
			x = x_start;
			rect(x, y, sq, sq);
			// arc(x + sq, y, sq * 2, sq * 2, 0, HALF_PI);
			break;
		case 4:
			// corner
			y = y_end;
			x = x_end;
			beginShape();
			vertex(x + 1 + - sq, y + 1 - sq);
			for (var i = 0; i < HALF_PI; i += PI / 50) {
				vertex(x + 1 - 2 * sq + sin(i) * sq, y + 1 - 2 * sq + cos(i) * sq);
			}
			vertex(x + 1 - sq, y + 1 - sq);
			endShape();
			rect(x - sq, y - sq, sq, sq);
			rect(x - 2 * sq, y - sq, sq, sq);
			rect(x - sq, y - 2 * sq, sq, sq);
			break;
		case 5:
			// corner
			y = y_start;
			x = x_start;
			beginShape();
			vertex(x + sq, y + sq);
			for (var i = PI; i < PI + HALF_PI; i += PI / 50) {
				vertex(x - 1 + 2 * sq + sin(i) * sq, y - 1 + 2 * sq + cos(i) * sq);
			}
			vertex(x + sq, y + sq);
			endShape();
			rect(x, y, sq, sq);
			rect(x + sq, y, sq, sq);
			rect(x, y + sq, sq, sq);
			break;
		case 6:
			beginShape();
			vertex(x + sq, y + sq);
			for (var i = PI; i < PI + HALF_PI; i += PI / 50) {
				vertex(x - 1 + 2 * sq + sin(i) * sq, y - 1 + 2 * sq + cos(i) * sq);
			}
			vertex(x + sq, y + sq);
			endShape();
			beginShape();
			vertex(x - sq, y - sq);
			for (var i = 0; i < HALF_PI; i += PI / 50) {
				vertex(x + 1 - 2 * sq + sin(i) * sq, y + 1 - 2 * sq + cos(i) * sq);
			}
			vertex(x - sq, y - sq);
			endShape();
			break;
		case 7:
			rect(x, y, sq, sq);
			break;
		case 8:
			beginShape();
			vertex(x, y);
			for (var i = HALF_PI; i < PI; i += PI / 50) {
				vertex(x - sq + sin(i) * sq, y + sq + cos(i) * sq);
			}
			vertex(x, y);
			endShape();
			break;
		default:
			break;
	}

	blendMode(LIGHTEST);
	pop();
}
function customArc(x, y, w, h, start, stop, resolution) {
	beginShape();
	for (var i = start; i < stop; i += resolution) {
		vertex(x + sin(i) * w, y + cos(i) * h);
	}
	endShape();
}

// OSC stuff

function receiveOsc(address, value) {
	console.log("received OSC: " + address + ", " + value);

	// if (address == '/test') {
	// 	x = value[0];
	// 	y = value[1];
	// }
	if (address == '/failure') {
		black();
	}

	if (address == '/touched') {
		if (value[1] == 1) {
			if (value[0] == 0) {
				zero();
			}
			if (value[0] == 1) {
				one();
			}
			if (value[0] == 2) {
				two();
			}
			if (value[0] == 3) {
				three();
			}
			if (value[0] == 4) {
				four();
			}
			if (value[0] == 5) {
				five();
			}
			if (value[0] == 6) {
				six();
			}
			if (value[0] == 7) {
				seven();
			}
			if (value[0] == 8) {
				eight();
			}
			if (value[0] == 9) {
				nine();
			}
			if (value[0] == 10) {
				ten();
			}
			if (value[0] == 11) {
				eleven();
			}
			if (value[0] == 12) {
				twelve();
			}
		}


	}
}

function sendOsc(address, value) {
	socket.emit('message', [address].concat(value));
}

function setupOsc(oscPortIn, oscPortOut) {
	var socket = io.connect('http://127.0.0.1:8081', { port: 8081, rememberTransport: false });
	socket.on('connect', function () {
		socket.emit('config', {
			server: { port: oscPortIn, host: '127.0.0.1' },
			client: { port: oscPortOut, host: '127.0.0.1' }
		});
	});
	socket.on('message', function (msg) {
		if (msg[0] == '#bundle') {
			for (var i = 2; i < msg.length; i++) {
				receiveOsc(msg[i][0], msg[i].splice(1));
			}
		} else {
			receiveOsc(msg[0], msg.splice(1));
		}
	});
}


// Gradient functions

function setGradient(x, y, w, h, c1, c2, axis) {
	noFill();

	if (axis === Y_AXIS) {
		// Top to bottom gradient
		for (let i = y - 1; i <= y - 2 + h; i++) {
			let inter = map(i, y, y + h, 0, 1);
			let c = lerpColor(c1, c2, inter);
			stroke(c);
			line(x, i, x - 1 + w, i);
		}
	} else if (axis === X_AXIS) {
		// Left to right gradient
		for (let i = x; i <= x - 1 + w; i++) {
			let inter = map(i, x, x + w, 0, 1);
			let c = lerpColor(c1, c2, inter);
			stroke(c);
			line(i, y, i, y - 1 + h);
		}
	}
}

function drawRadialGradient(x, y, radius, c1, c2) {
	for (let r = radius; r > 0; --r) {
		let inter = map(r, radius, 0, 1, 0);
		let c = lerpColor(c1, c2, inter);
		fill(c);
		console.log(c)
		ellipse(x, y, r, r);
	}
}

function drawArcGradient(x, y, start, end, radius, c1, c2) {
	for (let r = radius; r > 0; --r) {
		let inter = map(r, radius, 0, 1, 0);
		let c = lerpColor(c1, c2, inter);
		fill(c);
		console.log(c)
		arc(x, y, r, start, end);
	}
}