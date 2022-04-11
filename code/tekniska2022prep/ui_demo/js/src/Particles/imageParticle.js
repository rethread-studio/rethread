const imageParticleStatus = {
    "MOVING": "moving",
    "COMPLETE": "complete",
    "IDDLE": "iddle"
}

const imagePixelSize = 10;

class ImageParticle {
    position;
    target;

    color;
    colorO;
    size = { width: 1, height: 1 };

    velocity;
    acceleration;
    maxForce;
    maxSpeed;
    status;

    imgRefI = null;
    imgRefO = null;

    constructor(position, target, color, colorO, velocity) {
        this.position = position.copy();
        this.target = target.copy();
        this.color = color;
        this.colorO = colorO;
        this.velocity = velocity.copy();
        this.status = imageParticleStatus.MOVING;
        this.maxSpeed = this.velocity.x + this.velocity.y / 2;
        this.maxForce = 0.9;
        this.acceleration = createVector(0, 0);
    }
    setStatus(newStatus = imageParticleStatus.MOVING) {
        this.status = newStatus;
    }

    getStatus() {
        return this.status;
    }

    setColor(color) {
        this.color = color;
    }

    update() {
        if (!this.isMoving()) return;
        this.arrive();
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);

    }

    arrive() {
        const desired = p5.Vector.sub(this.target, this.position);
        const d = desired.mag();
        desired.normalize();
        const distance = 150;
        if (d < distance) {
            const m = map(d, 0, distance, 0, this.maxSpeed);
            desired.mult(m);
            this.setColor(this.colorO);
        } else {
            desired.mult(this.maxSpeed);
        }

        const steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        this.acceleration.add(steer);
    }


    isMoving() {
        return this.status === imageParticleStatus.MOVING;
    }

    render() {
        noStroke();
        fill(this.color);
        rect(this.position.x, this.position.y, this.size.width, this.size.height);
    }
}