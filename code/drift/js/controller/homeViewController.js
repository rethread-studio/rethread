
class HomeViewController {
    constructor(view) {
        this.view = view;
    }

    addEventListener() {
        this.view.meetRobot_btn.addEventListener("click", () => {
            showView('meetTheRobot');
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
            showView('meetTheRobot');
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

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    unMountView() {
        this.removeEventListener()
    }
}
