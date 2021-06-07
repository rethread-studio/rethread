
class HomeViewController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
        this.model.addObserver(this);
    }

    addEventListener() {
        this.view.meetRobot_btn.addEventListener("click", () => {
            showView('robot');
        });
        this.view.viewExhibition_btn.addEventListener("click", () => {
            showView('exhibition');
        });
        this.view.takeTour_btn.addEventListener("click", () => {
            showView('tour');
        });
        this.view.aboutReThread_btn.addEventListener("click", () => {
            showView('about');
        });
    }

    removeEventListener() {


        this.view.meetRobot_btn.removeEventListener("click", () => {
            showView('robot');
        });
        this.view.viewExhibition_btn.removeEventListener("click", () => {
            showView('exhibition');
        });
        this.view.takeTour_btn.removeEventListener("click", () => {
            showView('tour');
        });
        this.view.aboutReThread_btn.removeEventListener("click", () => {
            showView('about');
        });

    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "toggleHome") {
            if (currentView == this) {
                this.removeEventListener();
                this.view.renderMenuItems();
                this.addEventListener();
            }
        }
    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    unMountView() {
        this.removeEventListener()
    }
}
