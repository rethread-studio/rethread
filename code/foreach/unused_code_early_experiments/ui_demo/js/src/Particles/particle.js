const particleStatus = {
    "MOVING": "moving",
    "COMPLETE": "complete"
}

class Particle {
    timeLive
    maxTime;
    color;
    //size
    position;
    destination;
    velocity
    //acceleration
    status;
    alpha;


    constructor() {

    }

    init() {
        this.status = particleStatus.MOVING;
        this.timeLive = 500;
        this.velocity = createVector(random(-1, 1), random(-5, 1));
        this.alpha = 255;
        // this.color = color(255, 255, 255);
    }

    getStatus() {
        return this.status;
    }

    setPosition(x, y) {
        this.position = createVector(x, y);
    }

    setDestination(x, y) {
        this.destination = createVector(x, y);
    }

    setColor(color) {
        this.color = color;
    }

    setmaxTime(time) {
        //get current time
        this.maxTime = time + this.timeLive;
    }



    update() {
        //update time
        //update position
        this.position.add(this.velocity);
        this.alpha -= 20;
        this.updateStatus();

    }

    updateStatus() {
        if (this.alpha < 0) this.status = particleStatus.COMPLETE;
    }

    updateTime() {
        //updates the time
        //checks if it is limit
        //if not then is complete
    }

    render() {
        if (this.status == particleStatus.COMPLETE) return;
        //if complete do not render
        noStroke();
        fill(this.color, this.alpha);
        rect(this.position.x, this.position.y, 4);
        //display particle
    }

}