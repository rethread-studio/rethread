export default class MainVizTDViewController {
    constructor(view, model) {
        this.model = model;
        this.view = view;
        this.renderView();
        this.addEventListener();
        this.resizeHandler = this.onWindowResize.bind(this);
    }

    addEventListener() {
        document.body.style.touchAction = 'none';
        window.addEventListener('resize', this.resizeHandler);
    }


    onWindowResize(event) {
        this.model.updateSize(window.innerWidth, window.innerHeight)
    }

    renderView() {
        this.view.render();
        // this.model.animate()
    }
}
