


//SHOWS THE MAIN TEXT AND ITS INFO
class DashBoard {

    constructor(_font, colorPallete, positions, location, fontSize) {
        this.packages = 0;
        this.size = 0;

        this.tick = 400;
        this.time = Date.now() + this.tick;
        this.showTick = true;

        this.font = loadFont(_font);

        this.fontSize = fontSize;

        this.colorPallete = colorPallete;
        this.positions = positions;
        this.focuLocation = location;

    }


    //update all the data and states
    updateData() {

        this.updateTickTime();
    }

    //RENDER ALL THE ELEMENTS 
    display() {
        this.writeTittle();
        this.writePackages();
        // this.writeSize();
        if (this.showTick) this.writeLocation();
        this.drawTick();
    }



    addPackage(num) {
        this.packages += num;
    }

    addSize(_quantity) {
        this.size += _quantity;
    }

    //update the status of ShowTick 
    //updates if time is greater that this.time
    updateTickTime() {
        if (Date.now() > this.time) {
            this.showTick = !this.showTick;
            this.time = Date.now() + this.tick;
        }
    }

    //WRITE THE TITTLE
    //write tittle centered
    writeTittle() {
        const { r, g, b } = this.colorPallete.green;
        fill(r, g, b);
        textFont('sans');
        textSize(this.fontSize.tittle);
        textAlign(CENTER, CENTER);
        textFont(this.font);
        text("STOCKHOLM", width / 2, 129);
    }

    //Write the number of packages
    writePackages() {
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(LEFT);
        textFont(this.font);
        text(this.packages, this.positions.row.r3, this.positions.col.c2 + this.positions.padding.top);
    }

    //Write the size
    writeSize() {
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(LEFT);
        textFont(this.font);
        text(this.size, this.positions.row.r3, this.positions.col.c2 + 24);
    }

    //Write the size
    writeLocation() {
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(RIGHT);
        textFont(this.font);
        text("LIVE", this.positions.row.r1 - 10, this.positions.col.c2 + this.positions.padding.top);
        circle(this.positions.row.r1 - 31, this.positions.col.c2 + this.positions.padding.top, 7);
        text(this.focuLocation, this.positions.row.r1 - 10, this.positions.col.c2 + (this.positions.padding.top * 2) + 4);
    }

    //DRAW THE TICK
    //showstick then draw or not
    drawTick() {
        noStroke();
        const { r, g, b } = this.showTick ? colorPallete.white : colorPallete.black;
        fill(r, g, b, 100);
        rect(32, 121, 4, 24);

    }

    //change the focus location
    changeLocation(newLoc) {
        this.focuLocation = newLoc;
    }
}