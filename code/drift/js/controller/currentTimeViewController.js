




export default class CurrentTimeViewController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
    }

    renderView() {
        this.view.render();
    }

    unMountView() {
        this.view.unMountView()
    }
}