
class TimeLineController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
    }

    renderView() {
        this.view.render();
        this.addEventListeners();
    }

    addEventListeners() {

        this.view.play_btn.addEventListener("click", () => {
            this.model.getChangePlayState();
            this.model.advanceSliderPos();
        });
    }

    removeEventListeners() {

    }

}