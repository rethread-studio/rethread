
import showView from '../app.js';

export default class MainMenuViewController {

    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.hamburguerClickHandler = this.onClickMenuButon.bind(this);
        this.menuClickHandler = this.onMenuClick.bind(this);
        this.model.addObserver(this);
    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    onMenuClick(e) {
        this.model.hideMenu()
        const value = e.target.getAttribute('value') == null ? "home" : e.target.getAttribute('value');
        showView(value)
        this.model.updateURL("/" + value, "Drift");
        e.preventDefault();
    }

    onClickMenuButon() {
        this.model.toggleMenu()
    }

    addEventListener() {
        this.view.home_link.addEventListener("click", this.menuClickHandler);
        this.view.menuButton.addEventListener("click", this.hamburguerClickHandler);

        if (this.model.getMenuVisible()) {
            this.view.meetArtists_link.addEventListener("click", this.menuClickHandler);
            this.view.viewExhibition_link.addEventListener("click", this.menuClickHandler);
            this.view.takeTour_link.addEventListener("click", this.menuClickHandler);
            this.view.aboutReThread_link.addEventListener("click", this.menuClickHandler);
        }
    }

    removeEventListener() {
        if (this.model.getMenuVisible()) {
            this.view.meetArtists_link.removeEventListener("click", this.menuClickHandler);
            this.view.viewExhibition_link.removeEventListener("click", this.menuClickHandler);
            this.view.takeTour_link.removeEventListener("click", this.menuClickHandler);
            this.view.aboutReThread_link.removeEventListener("click", this.menuClickHandler);
        }
        if (this.view.home_link != null) this.view.home_link.removeEventListener("click", this.menuClickHandler);
        if (this.view.menuButton != null) this.view.menuButton.removeEventListener("click", this.hamburguerClickHandler);
    }

    unMountView() {
        this.removeEventListener()
        this.view.unMount();
    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "toggleMenu") {
            this.view.render();
            this.addEventListener();
        } if (changeDetails.type == "toggleModeMenu") {
            this.view.render();
            this.addEventListener();
        }
    }

}