class Country {

    constructor(x, y, colorPallete, goalPos) {
        this.colorPallete = colorPallete;
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(2, 0);
        this.position = createVector(x, y);
        this.countryName = name;

        this.r = 1.0; // Half the width of veihcle's back side
        this.maxspeed = random(0.002, 1)//random(0.00001, 0.004); //
        this.maxforce = 0.1;

        this.goalPos = createVector(goalPos.x, goalPos.y);;

        this.size = 2;
        this.state = "MOVE";
    }

    getPosition() {
        return this.position;
    }


    addVelocity() {
        this.maxspeed = this.maxspeed + 0.0005;
        this.size = min(12, this.size + 0.2);
    }
    /////////////////////////////
    follow(p) {

        // Predict the vehicle future location
        let predict = this.velocity.copy();
        predict.normalize();
        // 25 pixels ahead in current velocity direction
        predict.mult(25);
        // Get the predicted point
        let predictLoc = p5.Vector.add(this.position, predict);

        // Find the nomal point along the path
        let target = 0;
        let worldRecord = 1000000;

        for (let i = 0; i < p.points.length - 1; i++) {
            let a = p.points[i].copy(); // i = 3
            let b = p.points[i + 1].copy(); // i+1= 4 (last point)
            let normalPoint = this.getNormalPoint(predictLoc, a, b);

            // Check if the normal point is outside the line segment
            if (normalPoint.x < a.x || normalPoint.x > b.x) {
                normalPoint = b.copy();
            }

            // Length of normal from precictLoc to normalPoint
            let distance = p5.Vector.dist(predictLoc, normalPoint);

            // Check if this normalPoint is nearest to the predictLoc
            if (distance < worldRecord) {
                worldRecord = distance;
                // Move a little further along the path and set a target
                // let dir = p5.Vector.sub(a, b);
                // dir.normalize();
                // dir.mult(10);
                // let target = p5.Vector.add(normalPoint, dir);

                // or let the target be the normal point
                target = normalPoint.copy();
            }
        }

        // seek the target...
        this.seek(target);

        // ... or check if we are off the path:
        // if (distance > p.radius) {
        //    this.seek(target);
        // }

        // Off the canvas: new radnom start from the left
        if (this.position.x > width) {
            this.position.x = 0;
            this.position.y = random(height);
        }
    }


    ////////////////////////////////////////////////////
    // Get the normal point from p to line segment ab
    getNormalPoint(p, a, b) {

        let ap = p5.Vector.sub(p, a);
        let ab = p5.Vector.sub(b, a);
        ab.normalize();

        // Instead of d = ap.mag() * cos(theta)
        // See file explanation.js or page 290
        let d = ap.dot(ab);

        ab.mult(d);

        let normalPoint = p5.Vector.add(a, ab);
        return normalPoint;
    }


    /////////////////////////////////////////////////////
    seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxspeed);
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxforce);
        this.applyForce(steer);
    }


    ////////////////////////////////
    update() {

        switch (this.state) {
            case "MOVE":
                this.velocity.add(this.acceleration);
                this.velocity.limit(this.maxspeed);
                this.position.add(this.velocity);
                this.acceleration.mult(0);
                if (this.position.dist(this.goalPos) < 5) {
                    this.state = "REMOVE";
                }

                break;

            case "STOP":
                // console.log("stop")
                break;

            default:
                break;
        }


    }


    ////////////////////////////////
    applyForce(force) {
        this.acceleration.add(force);


    }
    ///////////////////////////////
    display() {



        //DRAW COUNTRY
        if (this.state == "MOVE") {
            this.theta = this.velocity.heading() + PI / 2;
            let { r, g, b } = this.colorPallete.red;
            fill(r, g, b);
            noStroke()
            push();
            translate(this.position.x, this.position.y);
            circle(0, 0, this.size);
            // rotate(this.theta);
            // beginShape();
            // vertex(0, -this.r * 2); // Arrow pointing upp
            // vertex(-this.r, this.r * 2); // Lower left corner
            // vertex(this.r, this.r * 2); // Lower right corner
            // endShape(CLOSE);
            pop();
        }

    }
}