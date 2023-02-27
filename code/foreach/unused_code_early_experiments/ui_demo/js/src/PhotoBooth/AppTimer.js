class AppTimer {
    time = 5000;
    callBackFunction = () => { console.log("call me back") };
    intervalId = null;
    currentTime = 5;

    constructor() {
    }

    setTimer(time = 5, callBackFuntion = () => { console.log("call me back") }) {

        if (this.isTimerActive()) return;
        this.currentTime = time;
        this.intervalId = setInterval(() => {
            this.currentTime--;
            if (this.currentTime <= 0) {
                this.resetTimer();
                callBackFuntion();
            }
        }, 1000);
    }

    resetTimer() {
        if (this.intervalId == null) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    isTimerActive() {
        return this.intervalId != null;
    }

    update() {

    }

    render() {
        rectMode(CENTER);
        textAlign(CENTER, CENTER);
        textSize(state.counterFontSize);
        fill(255, 255, 255);
        text(this.currentTime, windowWidth / 2, windowHeight / 2);

        rectMode(CORNER);
        textAlign(LEFT);
        textAlign(CENTER, CENTER);
        text(this.currentTime, 40, windowHeight / 2);


        textAlign(RIGHT);
        textAlign(CENTER, CENTER);
        text(this.currentTime, windowWidth - 40, windowHeight / 2);


        rectMode(CORNER);
        textAlign(LEFT);
    }


}