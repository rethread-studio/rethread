
class HomeViewController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
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

        this.view.username_inp.addEventListener("change", () => {
            this.model.interaction.changeUsername(this.view.username_inp.value);
        });

        this.model.interaction.onWelcome((data) => {
            this.view.updateUsername(this.model.interaction.username);
        })
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
