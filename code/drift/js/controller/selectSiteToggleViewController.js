

export default class SelectSiteToggleViewController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.model.addObserver(this);
    }

    renderView() {
        this.view.render();

    }
    unmountView() {
        this.view.unmount()
    }
    update(changeDetails) {
        if (changeDetails.type == "displayUpdate") {
            this.unmountView();
            this.renderView();
        }
    }
    hideOptions() {
        this.view.hideOptions()
    }
    showOptions() {
        this.view.showOptions()
    }

}