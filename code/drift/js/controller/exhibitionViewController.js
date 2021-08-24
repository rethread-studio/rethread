
import createObserver from '../intersectionOberserver.js'

export default class ExhibitionViewController {
    constructor(view, vizModel, model) {
        this.view = view;
        // this.wheelHandler = this.wheelEvent.bind(this);
        this.speed = 0;
        this.position = 0;
        this.rounded = 0;
        this.model = model;
        this.vizModel = vizModel
        this.vizModel.addObserver(this);
        this.scrollHandler = this.onScroll.bind(this);
        this.prevRatio = 0;
        this.intersectHandler = this.handleIntersect.bind(this)
    }

    onScroll(e) {
        const arr = [...this.view.exhibitContent.children].forEach(el => {

        })
    }


    handleIntersect(entries, observer) {
        entries.forEach((entry) => {
            const element = entry.target.getAttribute("id") == "exhibitDescrip" ? entry.target.parentElement : entry.target;
            if (entry.isIntersecting) {
                // element.classList.add("appear")
                this.vizModel.activateSection(element.getAttribute("id"))
            }
            // else {
            // element.classList.remove("appear")
            // }

        })
    }

    addEventListener() {
        let sections = [...this.view.exhibitContent.children]
        sections.shift()

        createObserver(this.intersectHandler, sections)
    }

    removeEventListener() {
        // window.removeEventListener('wheel', this.wheelHandler);
        // window.removeEventListener('scroll', this.scrollHandler);
    }

    setState() {
        const state = this.vizModel.getActiveSection()
        //get state
        switch (state) {
            case 0:
                // this.model.resetSites();
                this.view.currentTime.classList.add("appear")
                this.view.timeline.classList.remove("appear")
                this.view.viewsMenu.classList.remove("appear")
                // this.view.sitesMenuViewController.hideOptions()
                this.view.sideMenuController.hideOptions()
                this.model.getChangePlayState(false)
                this.model.removeLayerStepInterval();
                this.model.selectSiteByName("qwant");

                break;
            case 1:
                // this.model.resetSites();
                this.model.setLayerStepInterval();
                this.model.getChangePlayState(true)
                this.view.timeline.classList.remove("appear")
                this.view.viewsMenu.classList.add("appear")
                this.view.sideMenuController.showOptions()
                // this.view.sitesMenuViewController.hideOptions()
                break;
            case 2:
                // this.model.resetSites();
                // this.model.toggleNoNotification(true)
                this.model.removeLayerStepInterval();
                this.view.timeline.classList.add("appear")
                this.view.sideMenuController.showOptions()
                // this.view.sitesMenuViewController.hideOptions()
                break;
            case 3:

                // this.model.resetSites();
                // this.model.toggleDisplay(false);
                this.model.setStackDisabled(true);
                this.model.removeLayerStepInterval();
                this.view.sideMenuController.showOptions()
                // this.view.sitesMenuViewController.hideOptions()
                //CHANGE TO SPREAD
                this.view.timeline.classList.add("appear")
                this.view.viewsMenu.classList.add("appear")
                break;
            case 4:
                this.model.setStackDisabled(false);
                this.model.removeLayerStepInterval();
                // this.view.sideMenuController.showOptions()
                this.view.sitesMenuViewController.showOptions()
                this.view.timeline.classList.add("appear")
                this.view.viewsMenu.classList.add("appear")

                //show all and hide texts
                break;

            default:
                // this.view.intro.classList.remove("hidden")
                // this.view.process.classList.add("hidden")
                // this.view.explanation.classList.add("hidden")
                // this.view.spread.classList.add("hidden")
                break;
        }
        this.vizModel.upDateImages()
    }


    setHeight() {
        const nEl = [...this.view.exhibitContent.children].length;
        const heightWindow = window.innerHeight;
        this.view.exhibitContent.style.height = `${heightWindow, nEl * heightWindow}px`;

    }

    renderView() {
        const deviceW = this.model.getScreenSize()
        if (deviceW < 768) {
            this.view.renderMobile()
            this.addEventListener();
            this.setState()
        } else {

            this.model.addKeyEventListener();
            this.view.render();
            this.addEventListener();
            this.setState()
        }

    }

    unMountView() {
        const deviceW = this.model.getScreenSize()
        if (deviceW < 768) {
            console.log("render cel")
        } else {
            this.model.removeTimeInterval()
            this.vizModel.resetActiveSection()
            this.vizModel.removeImages();
            this.view.unMountView()
            this.removeEventListener()
            this.model.removeKeyEventListener();
        }
    }

    //update info when modified in vizModel
    update(changeDetails) {
        if (changeDetails.type == "changeVisState") {
            this.setState()
        }
    }
}