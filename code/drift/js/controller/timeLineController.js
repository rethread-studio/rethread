
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
            // this.model.advanceSliderPos();
        });
    }

    advanceSlider() {
        return () => { this.model.advanceSliderPos() }
    }

    setTimeInterval() {
        this.timeInterval = window.setInterval(this.advanceSlider(), 1000)
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
        }
    }

}