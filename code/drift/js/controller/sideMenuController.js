

export default class SideMenuController {
    constructor(view, model, vizModel, legendController) {
        this.view = view;
        this.model = model;
        this.vizModel = vizModel;
        this.legendViewController = legendController;
        this.model.addObserver(this);
        this.clickHandler = this.onClickItem.bind(this)
        this.btnClickHandler = this.onClickBtn.bind(this);
        this.mouseOverHandler = this.onMouseOver.bind(this);
        this.mouseOutHandler = this.onmouseOut.bind(this)
    }

    onMouseOver(e) {
        const el = e.currentTarget.parentNode;
        this.showTooltip(el, el.dataset.value)
    }

    onmouseOut(e) {
        this.legendViewController.hideLegend();
    }

    onClickBtn(e) {
        this.model.toggleDisplay();
    }

    onClickItem(e) {
        const value = e.currentTarget.dataset.value;
        this.model.selectView(value)
    }

    showTooltip(element, value) {
        const mode = this.model.getModeText()
        // let bodyRect = document.body.getBoundingClientRect()
        let { y } = element.getBoundingClientRect()
        let { x } = this.view.container.getBoundingClientRect()
        console.log(element.parentNode)
        this.legendViewController.showLegend(x, y, value, mode)
    }

    addEventListener() {
        this.view.items.forEach(element => {
            element.addEventListener("click", this.clickHandler)
        });
        const questionsBtn = [...document.getElementsByClassName("question")];

        questionsBtn.forEach(el => {
            el.addEventListener("mouseenter", this.mouseOverHandler)
            el.addEventListener("mouseleave", this.mouseOutHandler)
        })

        this.view.btn.addEventListener("click", this.btnClickHandler)

    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    update(changeDetails) {
        if (changeDetails.type == "updateSideMenu") {
            // this.updateMenu();
        } else if (changeDetails.type == "changeMode") {
            this.renderView();
        } else if (changeDetails.type == "updateViewSideMenu") {
            this.renderView();
        } else if (changeDetails.type == "displayUpdate") {
            this.renderView();
        }
    }

    hideOptions() {
        this.model.toggleViewModeBtn(false)
        this.view.btn.classList.remove("appear")
    }

    showOptions() {
        this.model.toggleViewModeBtn(true)
        this.view.btn.classList.add("appear")
    }

}