

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

        this.itemOverHandler = this.onItemMouseEnter.bind(this)
        this.itemLeaveandler = this.onItemMouseLeave.bind(this)

        this.timeOut = null;
    }

    onItemMouseEnter(e) {
        const element = e.currentTarget;
        const value = element.dataset.value;
        const showTooltip = this.showTooltip.bind(this);
        this.timeOut = setTimeout(function () { showTooltip(element, value) }, 1000);
    }

    onItemMouseLeave(e) {
        this.clearLegendTimeOut()
        this.legendViewController.hideLegend()
    }

    clearLegendTimeOut() {
        if (this.timeOut != null) clearTimeout(this.timeOut);
        this.timeOut = null;
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
        this.legendViewController.hideLegend();
    }

    onClickItem(e) {
        const value = e.currentTarget.dataset.value;
        this.clearLegendTimeOut()
        this.model.selectView(value)
        start_sound_effect();
    }

    showTooltip(element, value) {
        const mode = this.model.getModeText()
        // let bodyRect = document.body.getBoundingClientRect()
        let { y } = element.getBoundingClientRect()
        let { x } = this.view.container.getBoundingClientRect()
        this.legendViewController.showLegend(x, y, value, mode)
    }

    addEventListener() {
        this.view.items.forEach(element => {
            element.addEventListener("click", this.clickHandler)
            element.addEventListener("mouseenter", this.itemOverHandler)
            element.addEventListener("mouseleave", this.itemLeaveandler)
        });
        const questionsBtn = [...document.getElementsByClassName("question")];

        questionsBtn.forEach(el => {
            el.addEventListener("mouseenter", this.mouseOverHandler)
            el.addEventListener("mouseleave", this.mouseOutHandler)
        })

        this.view.btn.addEventListener("click", this.btnClickHandler)

    }

    removeEventListener() {
        this.view.items.forEach(element => {
            element.removeEventListener("click", this.clickHandler)
            element.removeEventListener("mouseenter", this.itemOverHandler)
            element.removeEventListener("mouseleave", this.itemLeaveandler)
        });
        const questionsBtn = [...document.getElementsByClassName("question")];

        questionsBtn.forEach(el => {
            el.removeEventListener("mouseenter", this.mouseOverHandler)
            el.removeEventListener("mouseleave", this.mouseOutHandler)
        })

        this.view.btn.removeEventListener("click", this.btnClickHandler)
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
        } else if (changeDetails.type == "updateToggle") {
            this.renderView();
        }
    }

    hideOptions() {
        // this.model.toggleViewModeBtn(false)
        // this.view.btn.classList.remove("appear")
    }

    showOptions() {
        // this.model.toggleViewModeBtn(true)
        // this.view.btn.classList.add("appear")
        // this.enableButon()
    }

    enableButon() {
        const disabled = this.model.getStackDisabled()
        this.view.btn.disabled = disabled;
    }

}