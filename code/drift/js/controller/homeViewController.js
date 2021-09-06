import showView from '../app.js'

export default class HomeViewController {
    constructor(view, model, mainViz) {
        this.view = view;
        this.model = model;
        this.mainViz = mainViz;
    }

    addEventListener() {
        this.view.meetRobot_btn.addEventListener("click", (e) => {
            this.model.updateURL("/driftbot", "Meet the bot");
            showView('driftbot');
            e.preventDefault();
        });
        this.view.viewExhibition_btn.addEventListener("click", (e) => {
            this.model.updateURL("/exhibition", "Drift");
            showView('exhibition');
            e.preventDefault();
        });
        this.view.takeTour_btn.addEventListener("click", (e) => {
            this.model.updateURL("/tour", "Tour");
            showView('tour');
            e.preventDefault();
        });
        this.view.aboutReThread_btn.addEventListener("click", (e) => {
            this.model.updateURL("/about", "About");
            showView('about');
            e.preventDefault();
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
            showView('driftbot');
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
        //run particles
        this.mainViz.addParticles();
        this.mainViz.animate()
    }

    unMountView() {
        this.removeEventListener();
        //remove renderanimation
        this.mainViz.removeAnimation()
        //remove particles
        this.mainViz.removeParticles();
        //render 
        this.mainViz.render()
    }
}
