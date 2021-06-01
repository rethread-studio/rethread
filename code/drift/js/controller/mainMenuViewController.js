

class MainMenuViewController {

    constructor(view) {
        this.view = view;
    }

    renderView() {
        this.view.render();
        this.addEventListener();
    }

    addEventListener() {
        this.view.home_link.addEventListener("click", () => {
            showView('home');
        });
        this.view.meetRobot_link.addEventListener("click", () => {
            showView('meetTheRobot');
        });
        this.view.viewExhibition_link.addEventListener("click", () => {
            showView('exhibition');
        });
        this.view.takeTour_link.addEventListener("click", () => {
            showView('tour');
        });
        this.view.aboutReThread_link.addEventListener("click", () => {
            showView('about');
        });
    }

    removeEventListener() {
        this.view.home_link.removeEventListener("click", () => {
            showView('meetTheRobot');
        });
        this.view.meetRobot_link.removeEventListener("click", () => {
            showView('meetTheRobot');
        });
        this.view.viewExhibition_link.removeEventListener("click", () => {
            showView('exhibition');
        });
        this.view.takeTour_link.removeEventListener("click", () => {
            showView('tour');
        });
        this.view.aboutReThread_link.removeEventListener("click", () => {
            showView('about');
        });
    }

    unMountView() {
        if (this.view.home_link != null) this.removeEventListener()
        this.view.unMount();
    }

}