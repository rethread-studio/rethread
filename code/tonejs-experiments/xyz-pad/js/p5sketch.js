class MovingPoint {
  p;
  targetPoint;
  vel;
  constructor(p){
    this.p = p;
    this.vel = createVector(0, 0, 0);
    this.newTarget();
  }
  update(){
    let newVel = this.targetPoint.copy();
    newVel = newVel.sub(this.p).limit(5);
    newVel.sub(this.vel).mult(0.1);
    this.vel.add(newVel);
    this.p.add(this.vel);
    if(this.p.dist(this.targetPoint) < 1) {
      this.newTarget();
    }
  }
  newTarget() {
    this.targetPoint = new p5.Vector(Math.random()*width, Math.random()*height, 0);
  }
}

let points = [];

function draw() {
  // background(244, 164, 96);
  fill(255, 255, 255, 5);
  rect(0, 0, width, height);
  let y = mouseY;
  let x = mouseX;

  fill(150, 10, 20);
  for(p of points) {
    ellipse(p.p.x, p.p.y, 5);
    updateSound(p.p.x/width, p.p.y/height);
  }
  fill(50, 10, 120);
  for(p of points) {
    ellipse(p.targetPoint.x, p.targetPoint.y, 3);
    p.update();
  }
  ellipse(x, y, 10, 10);
  if(x < width && x > 0 && y < height && y > 0) {
    updateSound(x/width, y/height);
  }  
}