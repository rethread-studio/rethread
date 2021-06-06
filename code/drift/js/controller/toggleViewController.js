

class ToggleViewController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.model.addObserver(this);
        this.toggleClickHandler = this.onClickToggle.bind(this);

    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    onClickToggle(e) {
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
        if (changeDetails.type == "toggleMode") {
            console.log("in")
            this.removeEventListener()
            this.renderView();
        }
    }

}