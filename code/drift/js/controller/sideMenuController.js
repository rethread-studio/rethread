
class SideMenuController {
    constructor(view, model) {
        this.view = view;
        this.model = model;

    }
    //INTERACTIONS
    mouseScroll() {
        return (event) => {
            const scrollY = window.scrollY;
            const windowHeight = document.documentElement.scrollHeight;
            //get current scroll position Y
            this.view.updateScroll(scrollY);
            this.model.isNewMenu(scrollY, windowHeight)
        }
    }

    addEventListener() {
        window.addEventListener("scroll", this.mouseScroll());
    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

}