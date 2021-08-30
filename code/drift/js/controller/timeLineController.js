
export default class TimeLineController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.timeInterval = null;
        this.model.addObserver(this);
        this.clickHandler = this.onClick.bind(this);
        this.changeHandler = this.changeSelection.bind(this);
        this.clickTimeLineHandler = this.onClickTimeline.bind(this);
        this.onMouoverHandler = this.onmouseover.bind(this);
        this.onMouseOutHandler = this.onmouseout.bind(this);
        this.onMouseMoveHandler = this.onmousemove.bind(this);
        this.onResizeHandler = this.onResize.bind(this)
    }

    renderView() {
        this.view.render();
        this.addEventListeners();
    }

    onResize() {
        this.model.updateTimelineDimensions();
        this.view.render();
    }

    onmouseover(e) {
        this.view.timeline.addEventListener("mousemove", this.onMouseMoveHandler)
        this.view.viewPhantomSlider(true);
    }
    onmousemove(e) {
        const { width, left } = e.target.getBoundingClientRect();
        const posX = e.clientX - left;
        const datePos = this.model.getDatebyPosX(posX / width)
        const date = this.model.getDateByPos(datePos)
        const formatedDate = this.model.formatDateString(date);
        const isMiddle = this.model.isSliderInMiddle(datePos) ? "end" : "start";
        const slidePos = this.model.calculateSliderPos(datePos);

        this.view.updatePhantomSlider(formatedDate, isMiddle, slidePos)

    }
    onmouseout(e) {
        this.view.viewPhantomSlider(false);
        this.view.timeline.removeEventListener("mousemove", this.onMouseMoveHandler)
    }

    onClickTimeline(e) {
        const { width, left } = e.target.getBoundingClientRect();
        const posX = e.clientX - left;
        this.model.updateSliderPos(posX / width)
        start_sound_effect();
    }

    onClick() {
        this.model.getChangePlayState();
    }

    changeSelection() {
        this.model.setSpeed(this.view.selectMenu.selectedIndex);
    }

    addEventListeners() {
        this.view.timeline.addEventListener("click", this.clickTimeLineHandler)
        this.view.timeline.addEventListener("mouseover", this.onMouoverHandler)
        this.view.timeline.addEventListener("mouseout", this.onMouseOutHandler)
        this.view.play_btn.addEventListener("click", this.clickHandler);
        this.view.selectMenu.addEventListener("change", this.changeHandler);
        window.addEventListener("resize", this.onResizeHandler);
    }



    setTimeInterval() {
        const speed = this.model.getCurrentSpeed()
        this.timeInterval = window.setInterval(() =>
            this.model.advanceSliderPos(), speed)
        console.log("SET TIME", this.timeInterval)
    }

    removeTimeInterval() {
        console.log("clean", this.timeInterval)
        if (this.timeInterval != null && this.timeInterval != undefined) clearInterval(this.timeInterval);
    }

    removeEventListeners() {
        this.view.timeline.removeEventListener("mouseover", this.onMouoverHandler)
        this.view.timeline.removeEventListener("mouseout", this.onMouseOutHandler)
        this.view.timeline.removeEventListener("click", this.clickTimeLineHandler)
        this.view.play_btn.removeEventListener("click", this.clickHandler);
        this.view.selectMenu.removeEventListener("change", this.changeHandler)
        window.removeEventListener("resize", this.onResizeHandler);
    }


    unMountView() {
        this.model.removeObserver(this);
        // this.removeTimeInterval();
        this.removeEventListeners();
        this.model.resetSlider();
    }

    update(changeDetails) {
        if (changeDetails.type == "playTimeLine") {
            // console.log("play interval")
            // this.setTimeInterval();
        } else if (changeDetails.type == "pauseTimeLine") {
            // this.removeTimeInterval();
        } else if (changeDetails.type == "updateSpeed") {
            // this.removeTimeInterval();
            // this.setTimeInterval();
        }
    }

}