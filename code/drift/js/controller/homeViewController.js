
class HomeViewController {
    constructor(view, model) {
        this.view = view;
        this.model = model;
<<<<<<< HEAD
        this.model.addObserver(this);
=======
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb
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

        this.view.username_inp.addEventListener("change", () => {
            this.model.interaction.changeUsername(this.view.username_inp.value);
        });

        this.model.interaction.onWelcome((data) => {
            this.view.updateUsername(this.model.interaction.username);
        })
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
