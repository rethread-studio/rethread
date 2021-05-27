

class MainMenuViewController {

    constructor(view) {
        this.view = view;
    }

    renderView() {
        this.view.render();
    }

    unMountView() {
        this.view.unMount();
    }

}