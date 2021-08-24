




export default class DropDownController {
    constructor(view, model, vizModel) {
        this.view = view;
        this.model = model;
        this.viewContent = false;
        this.model.addObserver(this);
        this.clickHandler = this.onClick.bind(this)
        this.itemClickHandler = this.onClickItem.bind(this)
    }

    onClick(e) { this.showContent(!this.viewContent) }

    onClickItem(e) {
        const value = e.currentTarget.dataset.value;
        this.model.selectView(value)
        this.viewContent = false;
        start_sound_effect();
    }

    showContent(show = false) {
        this.viewContent = show;
        this.viewContent ? this.displayContent() : this.hideContent();
    }
    displayContent() {
        this.view.content.classList.remove("hidden")
    }

    hideContent() {
        this.view.content.classList.add("hidden")
    }

    addEventListeners() {

        this.view.dropBtn.onclick = this.clickHandler;
        this.view.items.forEach(element => {
            element.addEventListener("click", this.itemClickHandler)
        });
    }

    removeEventListeners() {
        this.view.dropBtn.removeEventListener("click", this.clickHandler)
        this.view.items.forEach(element => {
            element.removeEventListener("click", this.itemClickHandler)
        });
    }

    renderView() {
        this.view.render();
        this.addEventListeners()
    }

    unMountView() {
        this.view.unMountView()
    }

    hideOptions() {

    }

    showOptions() {

    }

    update(changeDetails) {
        if (changeDetails.type == "changeMode") {
            this.renderView();
        } else if (changeDetails.type == "updateViewSideMenu") {
            this.renderView();
        } else if (changeDetails.type == "displayUpdate") {
            this.renderView();
        } else if (changeDetails.type == "updateToggle") {
            this.renderView();
        }
    }
}