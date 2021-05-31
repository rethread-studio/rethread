
class TimeLineController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.timeInterval = null;
        this.model.addObserver(this);
        this.clickHandler = this.onClick.bind(this);
        this.changeHandler = this.changeSelection.bind(this);
        this.clickTimeLineHandler = this.onClickTimeline.bind(this);
    }

    renderView() {
        this.view.render();
        this.addEventListeners();
    }

    onClickTimeline(e) {
        const { left, width } = e.target.getBoundingClientRect();
        const posX = e.clientX - left;
        //pass the percentage
        this.model.updateSliderPos(posX / width)
    }

    onClick() {
        this.model.getChangePlayState();
    }

    changeSelection() {
        this.model.setSpeed(this.view.selectMenu.selectedIndex);
    }

    addEventListeners() {
        this.view.timeline.addEventListener("click", this.clickTimeLineHandler)
        this.view.play_btn.addEventListener("click", this.clickHandler);
        this.view.selectMenu.addEventListener("change", this.changeHandler);
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
        this.view.timeline.removeEventListener("click", this.clickTimeLineHandler)
        this.view.play_btn.removeEventListener("click", this.clickHandler);
        this.view.selectMenu.removeEventListener("change", this.changeHandler)
    }


    unMountView() {
        this.model.removeObserver(this);
        this.removeTimeInterval();
        this.removeEventListeners();
        this.model.resetSlider();
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