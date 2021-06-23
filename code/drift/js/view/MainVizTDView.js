
export default class MainVizTDView {
    constructor(container, model) {
        this.model = model;
        this.container = document.getElementById(container);

    }

    render() {

        const renderer = this.model.getRenderer();
        this.container.appendChild(renderer.domElement);
        this.setIdentifications();
    }

    setIdentifications() {

    }
}
