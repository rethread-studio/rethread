
class IntroViewController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.clickHandler = this.onClickBtn.bind(this)
    }

    onClickBtn() {
        this.model.stepActiveSection()
    }

    addEventListeners() {
        this.view.btn.addEventListener("click", this.clickHandler);
    }

    removeEventListeners() {
        this.view.btn.removeEventListener("click", this.clickHandler);

    }

    renderView() {
        this.view.render();
        this.addEventListeners()
    }
    unMountView() {
        removeEventListeners();
    }

}