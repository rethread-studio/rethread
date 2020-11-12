
// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

class VisualIntro {


    constructor(font, positions, fontSize, colorPallete) {

        this.font = font;
        this.positions = positions;
        this.fontSize = fontSize;
        this.colorPallete = colorPallete;

        this.tick = 500;
        this.time = Date.now() + this.tick;
        this.showTick = true;
        this.tickCounter = 0;
        this.tickLimiter = 3;

        this.message = [
            {
                top: "TO",
                bottom: "EU"
            },
            {
                top: "TO",
                bottom: "AMERICA"
            },
            {
                top: "TO",
                bottom: "ASIA"
            },
            {
                top: "TO",
                bottom: "AFRICA"
            },
            {
                top: "TO",
                bottom: "OCEANIA"
            },
        ]

        this.crossPoints = [

            this.positions.row.r1 + 25

            ,

            this.positions.row.r3 - 25

            ,
        ]
        this.messagePos = 0;
    }

    //UPDATE ALL THE DATA
    updateData() {
        this.updateTickTime();
    }


    //RENDER ALL THE ELEMENTS
    display() {


        this.writeText();
        this.drawTick();
        this.drawDecorations();

    }

    //updates if time is greater that this.time
    updateTickTime() {
        if (Date.now() > this.time) {
            this.showTick = !this.showTick;
            this.time = Date.now() + this.tick;
            this.tickCounter++;
            this.messagePos = this.tickCounter % this.tickLimiter == 0 ? (this.messagePos + 1) >= this.message.length ? 0 : (this.messagePos + 1) : this.messagePos;
        }



    }

    writeText() {

        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b);
        textFont('sans');
        textSize(this.fontSize.tittle);
        textAlign(LEFT, TOP);
        textFont(this.font);
        text("STOCKHOLM'S", this.positions.row.r1, this.positions.col.c2 - 2);
        text("INTERNET IN", this.positions.row.r1, this.positions.col.c3 - 2);
        text("REAL TIME", this.positions.row.r1, this.positions.col.c4 - 2);
        textAlign(RIGHT, TOP);
        textSize(this.fontSize.tittle);
        text("RFC 675:08", this.positions.row.r3 + 12, this.positions.col.c1 - 4);

    }

    //DRAW THE TICK
    //showstick then draw or not
    drawTick() {
        if (this.showTick) {

            noStroke();
            const { r, g, b } = colorPallete.white;
            fill(r, g, b, 100);
            rect(30, 121, 4, 24);

            textFont('sans');
            textSize(this.fontSize.number);
            textAlign(RIGHT, TOP);
            textFont(this.font);
            const posX = 10;
            const { top, bottom } = this.message[this.messagePos];
            text(top, this.positions.row.r1 - posX, this.positions.col.c2 + 3);
            text(bottom, this.positions.row.r1 - posX, this.positions.col.c2 + 18);
        }


    }

    drawDecorations() {
        for (let i = 0; i < 7; i++) {
            const { r, g, b } = this.showTick ? colorPallete.white : colorPallete.orange;
            stroke(r, g, b);
            strokeWeight(1);
            const x = this.crossPoints[0];
            const y = (i * 80) + 20;
            const padding = 3;
            line(x, y - padding, x, y + padding);
            line(x + padding, y, x - padding, y);

            const x2 = this.crossPoints[1];
            line(x2, y - padding, x2, y + padding);
            line(x2 + padding, y, x2 - padding, y);
        }

    }

}