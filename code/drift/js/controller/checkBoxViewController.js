

export default class CheckBoxViewController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.clickHandler = this.onClickCheckBox.bind(this);
        this.model.addObserver(this);
    }

    addEventListener() {
        // console.log(this.view.checkbox.foreach())
        this.view.checkbox.forEach(c => {
            c.addEventListener("click", this.clickHandler);
        })
    }

    removeEventListener() {
        this.view.checkbox.forEach(c => {
            c.removeEventListener("click", this.clickHandler);
        })
    }

    onClickCheckBox(e) {
        if (e.target.value == undefined) return;
        this.model.selectSite(e.target.value)
        start_sound_effect();

    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    unMountView() {
        this.removeEventListener()
    }

    hideOptions() {
        this.view.hideOptions();
    }

    showOptions() {
        this.view.showOptions();
    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "sitesUpdated") {
            this.removeEventListener()
            this.renderView();
            this.addEventListener();
        }
    }
}
