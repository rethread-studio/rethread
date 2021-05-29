
class TimeLineController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.timeInterval = null;
        this.model.addObserver(this);
    }

    renderView() {
        this.view.render();
        this.addEventListeners();
    }

    addEventListeners() {

        this.view.play_btn.addEventListener("click", () => {
            this.model.getChangePlayState();
        });

        this.view.selectMenu.addEventListener("change", () => {
            this.model.setSpeed(this.view.selectMenu.selectedIndex)
        })
    }



    setTimeInterval() {
        const speed = this.model.getCurrentSpeed()
        this.timeInterval = window.setInterval(() =>
            this.model.advanceSliderPos(), speed)
    }

    removeTimeInterval() {
        if (this.timeInterval != null && this.timeInterval != undefined) clearInterval(this.timeInterval);
    }

    removeEventListeners() {

    }

    unmount() {
        this.removeTimeInterval();
        this.removeEventListeners();
    }

    update(changeDetails) {
        if (changeDetails.type == "playTimeLine") {
            this.setTimeInterval();
        } else if (changeDetails.type == "pauseTimeLine") {
            this.removeTimeInterval();
        } else if (changeDetails.type == "updateSpeed") {
            this.removeTimeInterval();
            this.setTimeInterval();
        }
    }

}