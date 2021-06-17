class MainVizTDViewController {
    constructor(view, model) {
        this.model = model;
        this.view = view;
        this.renderView();
        this.addEventListener();
        this.pointHandler = this.onPointerMove.bind(this);

        // this.model.addObserver(this)
    }

    addEventListener() {
        document.body.style.touchAction = 'none';
        document.body.addEventListener('pointermove', (event) => {
            this.onPointerMove(event)
        })
        window.addEventListener('resize', this.onWindowResize);
    }

    onWindowResize() {
        this.model.updateSize(window.innerWidth, window.innerHeight)
    }

    onPointerMove(event) {

        if (event.isPrimary === false) return;
        this.model.setMouse(event.clientX, event.clientY)
    }

    renderView() {
        this.view.render();
        this.model.animate()
    }

    update(changeDetails) {
        // if (changeDetails.type == "toggleChat") {
        //     this.renderView();
        //     this.addEventListener();
        // }
    }
}
