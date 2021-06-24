
export default class SideMenuController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.model.addObserver(this);
        this.clickHandler = this.onClickItem.bind(this)
        this.btnClickHandler = this.onClickBtn.bind(this);
    }

    onClickBtn(e) {
        this.model.toggleDisplay();
    }

    onClickItem(e) {
        this.model.selectView(e.currentTarget.dataset.value)
    }

    addEventListener() {
        this.view.items.forEach(element => {
            element.addEventListener("click", this.clickHandler)
        });

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