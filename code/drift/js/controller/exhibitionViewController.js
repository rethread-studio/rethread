


export default class ExhibitionViewController {
    constructor(view, model) {
        this.view = view;
        this.wheelHandler = this.wheelEvent.bind(this);
        this.speed = 0;
        this.position = 0;
        this.rounded = 0;
        this.model = model
        this.model.addObserver(this);
    }

    wheelEvent(e) {
        this.model.updateSpeed(e.deltaY);
    }

    addEventListener() {
        window.addEventListener('wheel', this.wheelHandler);
        // this.view.meetRobot_btn.addEventListener("click", () => {
        //     showView('meetTheRobot');
        // });
        // this.view.viewExhibition_btn.addEventListener("click", () => {
    }

    setState() {
        const state = this.model.getActiveSection()
        //get state
        switch (state) {
            case 0:
                this.view.intro.classList.remove("hidden")
                this.view.timeline.classList.add("hidden")
                this.view.viewsMenu.classList.add("hidden")
                this.view.sitesMenuViewController.hideOptions()
                this.model.removeImages()
                this.model.showFirstImage()
                // this.model.showImages()
                // this.model.spreadImages()
                //hide timeline
                //hide side menu views
                //hide other view options enable only the first
                //viz show only screen shot

                break;
            case 1:
                this.view.intro.classList.add("hidden")
                this.view.process.classList.remove("hidden")
                this.view.viewsMenu.classList.remove("hidden")
                this.view.sideMenuController.hideOptions()
                this.model.removeImages()
                this.model.showImages()
                //show views side menu, hide button spread
                //viz show all views 
                // 
                break;
            case 2:
                this.view.intro.classList.add("hidden")
                this.view.process.classList.add("hidden")
                this.view.explanation.classList.remove("hidden")
                this.view.timeline.classList.remove("hidden")

                //show timeline
                break;
            case 3:
                this.view.intro.classList.add("hidden")
                this.view.process.classList.add("hidden")
                this.view.explanation.classList.add("hidden")
                this.view.spread.classList.remove("hidden")
                this.view.sideMenuController.showOptions()
                //show button and spread viz
                break;
            case 4:
                this.view.intro.classList.add("hidden")
                this.view.process.classList.add("hidden")
                this.view.explanation.classList.add("hidden")
                this.view.spread.classList.add("hidden")
                this.view.sitesMenuViewController.showOptions()
                this.model.centerImages()
                //show all and hide texts
                break;

            default:
                this.view.intro.classList.remove("hidden")
                this.view.process.classList.add("hidden")
                this.view.explanation.classList.add("hidden")
                this.view.spread.classList.add("hidden")
                break;
        }
    }

    removeEventListener() {
        window.removeEventListener('wheel', this.wheelHandler);
    }

    renderView() {
        this.view.render();
        this.addEventListener();
        this.setState()
    }

    unMountView() {
        this.model.resetActiveSection()
        this.model.removeImages();
        this.view.unMountView()
        this.removeEventListener()
    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "changeVisState") {
            this.setState()
        }
    }
}