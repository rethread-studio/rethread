class Pixel {
    position;
    target;
    velocity;
    acceleration;
    maxForce;
    maxSpeed;
    status = MOVE;
    color = "#000000";
    size = { width: 1, height: 1 };
    id = null;

    constructor(posX, posY, destX, destY, velocityX, veolocityY, color, id) {
        this.position = createVector(posX, posY);
        this.target = createVector(destX, destY);
        this.velocity = createVector(velocityX, veolocityY);
        this.color = color;
        this.maxSpeed = velocityX + velocityX / 2;
        this.maxForce = 0.9;
        this.acceleration = createVector(0, 0);
        this.id = id;
    }

    setStatus(newStatus = IDDLE) {
        this.status = newStatus;
    }

    setTarget(newTarget) {
        this.target = newTarget;
    }

    update() {
        if (!this.isMoving()) return;
        this.arrive(this.target);
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
        if (this.isInPosition()) {
            this.position = this.target;
            this.status = IDDLE;
        }
    }

    isInPosition() {
        const desired = p5.Vector.sub(this.target, this.position);
        const d = desired.mag();
        desired.normalize();
        return d < 10;
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    moveStep() {
        this.position = this.target;
        this.status = IDDLE;
    }


    arrive(target) {
        const desired = p5.Vector.sub(this.target, this.position);
        const d = desired.mag();
        desired.normalize();

        if (d < 150) {
            const m = map(d, 0, 100, 0, this.maxSpeed);
            desired.mult(m);
        } else {
            desired.mult(this.maxSpeed);
        }

        const steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        this.applyForce(steer);
    }

    isMoving() {
        return this.status === MOVE;
    }

    render() {
        noStroke();
        fill(this.color);
        rect(this.position.x, this.position.y, this.size.width, this.size.height);
    }
}