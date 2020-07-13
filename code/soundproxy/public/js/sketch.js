// Daniel Shiffman
// http://codingtra.in
// http://patreon.com/codingtrain
// Code for: https://youtu.be/BjoM9oKOAKY

var inc = 0.1;
var scl = 5;
var cols, rows;

var zoff = 0;

var fr;

var particles = [];

var flowfield;

function setup() {
  const c = createCanvas(document.getElementById("services").clientWidth, document.getElementById("services").clientHeight);
  c.parent("services")
  cols = floor(width / scl);
  rows = floor(height / scl);
  fr = createP('');

  flowfield = new Array(cols * rows);

}
function getRandomColor() {
    return "#" + (Math.floor(Math.random() * 16777215).toString(16) + '000000').substring(0, 6)
}

function draw() {
  clear()
  var yoff = 0;
  for (var y = 0; y < rows; y++) {
    var xoff = 0;
    for (var x = 0; x < cols; x++) {
      var index = x + y * cols;
      var angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
      var v = p5.Vector.fromAngle(angle);
      v.setMag(1);
      flowfield[index] = v;
      xoff += inc;
      stroke(0, 50);
      // push();
      // translate(x * scl, y * scl);
      // rotate(v.heading());
      // strokeWeight(1);
      // line(0, 0, scl, 0);
      // pop();
    }
    yoff += inc;

    zoff += 0.0003;
  }
  for (let service in services) {
      if (!services[service].particle) {
        services[service].particle = new Particle(service, getRandomColor(), services[service].len)
      }
      services[service].particle.particuleSize = services[service].len
      services[service].particle.follow(flowfield);
      services[service].particle.update();
      services[service].particle.edges();
      services[service].particle.show();
  }
}