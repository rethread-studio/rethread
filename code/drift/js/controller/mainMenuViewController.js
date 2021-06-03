

class MainMenuViewController {

    constructor(view) {
        this.view = view;
        this.clickHandler = this.onClickHome.bind(this);
    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    onClickHome() {
        showView('home');
    }

    addEventListener() {
        this.view.home_link.addEventListener("click", this.clickHandler);

    }

    removeEventListener() {
        this.view.home_link.removeEventListener("click", this.clickHandler);

    }

    unMountView() {
        if (this.view.home_link != null) this.removeEventListener()
        this.view.unMount();
    }

}