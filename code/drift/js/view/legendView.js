export default class LegendView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model

    }

    render() {
        const text = this.model.getContent();
        const content = `
        <div id="tooltipText" class="text-base text-left white">
            ${text}
        </div>
		`;
        this.container.innerHTML = content;
    }

    updateText() {
        const text = this.model.getContent();
        const el = document.getElementById("tooltipText");
        el.innerHTML = text;
    }

}


