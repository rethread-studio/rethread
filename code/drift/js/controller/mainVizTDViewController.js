export default class MainVizTDViewController {
    constructor(view, model) {
        this.model = model;
        this.view = view;
        this.renderView();
        this.addEventListener();
        this.pointHandler = this.onPointerMove.bind(this);
        this.resizeHandler = this.onWindowResize.bind(this);
        // this.mouseScrollHandler = this.onMouseScroll.bind(this);

        // this.model.addObserver(this)
        this.scrollPos = 0;
    }

    addEventListener() {
        document.body.style.touchAction = 'none';
        document.body.addEventListener('pointermove', (event) => {
            this.onPointerMove(event)
        })
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('scroll', (event) => {
            let diff = this.scrollPos < window.scrollY ? window.scrollY - this.scrollPos : -(this.scrollPos - window.scrollY);
            this.scrollPos = window.scrollY;
            this.model.setMouse(undefined, diff * 10)
        });
    }


    onWindowResize(event) {
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

    // update(changeDetails) {
    // if (changeDetails.type == "toggleChat") {
    //     this.renderView();
    //     this.addEventListener();
    // }
    // }
}
