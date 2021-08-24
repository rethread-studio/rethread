
export default class DropDownToggleController {
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

        if (e.target.dataset.value == undefined) return;
        this.model.selectSite(e.target.dataset.value)
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
        if (changeDetails.type == "sitesUpdated") {
            this.renderView();
        }
    }
}