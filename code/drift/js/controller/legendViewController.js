
export default class LegendViewController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.model.addObserver(this);

    }

    renderView() {
        this.view.render();
    }
    unMountView() {

    }

    hideLegend() {
        this.view.container.classList.add("hidden")
    }

    showLegend(x, y, key, mode) {
        const data = this.model.getInfo(key)
        this.model.setContent(data[mode]);
        this.view.updateText();
        this.view.container.classList.remove("hidden")
        this.view.container.style.transform = `translate(calc(-100% + ${x}px), calc(-50% + ${y}px))`

        // this.model.setPosition(x, y)
        // this.model.visible(true);

    }
}