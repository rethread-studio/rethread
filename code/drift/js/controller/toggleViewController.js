

export default class ToggleViewController {

    constructor(view, model, message) {
        this.view = view;
        this.model = model;
        this.model.addObserver(this);
        this.toggleClickHandler = this.onClickToggle.bind(this);
        this.message = message;

    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    onClickToggle(e) {
        start_sound_effect(); // Play sound effect
        this.model.setMode(e.target.checked)
    }

    addEventListener() {
        this.view.checkbox.addEventListener("change", this.toggleClickHandler);
    }

    removeEventListener() {
        this.view.checkbox.removeEventListener("change", this.toggleClickHandler);
    }

    unMountView() {
        this.removeEventListener()
        this.view.unMount();
    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "changeMode") {
            this.removeEventListener()
            this.renderView();
        }
    }

}