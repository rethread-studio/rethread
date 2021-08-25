
export default class LoadingController {

    constructor(view) {
        this.view = view;
    }

    renderView() {
        this.view.render();
    }
    unMountView() {

    }
}