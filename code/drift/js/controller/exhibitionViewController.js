
import createObserver from '../intersectionOberserver.js'

export default class ExhibitionViewController {
    constructor(view, model) {
        this.view = view;
        // this.wheelHandler = this.wheelEvent.bind(this);
        this.speed = 0;
        this.position = 0;
        this.rounded = 0;
        this.model = model
        this.model.addObserver(this);
        this.scrollHandler = this.onScroll.bind(this);
        this.prevRatio = 0;
        this.intersectHandler = this.handleIntersect.bind(this)
    }

    onScroll(e) {
        const arr = [...this.view.exhibitContent.children].forEach(el => {

        })
    }


    // wheelEvent(e) {
    //     this.model.updateSpeed(e.deltaY);
    //     this.position += e.deltaY

    // }

    handleIntersect(entries, observer) {
        entries.forEach((entry) => {
            // console.log(entry.intersectionRatio)
            // console.log()
            // console.log(entry.target, entry.isIntersecting, entry.intersectionRatio)
            const element = entry.target.getAttribute("id") == "exhibitDescrip" ? entry.target.parentElement : entry.target;
            if (entry.isIntersecting) {
                // console.log(this.model, this)
                this.model.activateSection(element.getAttribute("id"))
                // console.log(element.getAttribute("value"))

            }

            // if (entry.intersectionRatio > this.prevRatio) {
            //     // console.log(entry, "going in", entry.intersectionRatio)
            //     entry.target.style.opacity = entry.intersectionRatio;
            // } else {
            //     // console.log(entry, "going out", entry.intersectionRatio)
            //     entry.target.style.opacity = entry.intersectionRatio;
            // }

            // this.prevRatio = entry.intersectionRatio;
        })
    }

    addEventListener() {
        let sections = [...this.view.exhibitContent.children]
        sections.shift()

        createObserver(this.intersectHandler, sections)
        // window.addEventListener('wheel', this.wheelHandler);
        // window.addEventListener('scroll', this.scrollHandler);

        // this.view.meetRobot_btn.addEventListener("click", () => {
        //     showView('meetTheRobot');
        // });
        // this.view.viewExhibition_btn.addEventListener("click", () => {
    }

    removeEventListener() {
        // window.removeEventListener('wheel', this.wheelHandler);
        // window.removeEventListener('scroll', this.scrollHandler);
    }

    setState() {
        const state = this.model.getActiveSection()
        //get state
        switch (state) {
            case 0:
                // this.view.intro.classList.remove("hidden")
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
                // this.view.intro.classList.add("hidden")
                // this.view.process.classList.remove("hidden")
                this.view.timeline.classList.add("hidden")
                this.view.viewsMenu.classList.remove("hidden")
                this.view.sideMenuController.hideOptions()
                this.model.removeImages()
                this.model.showImages()
                //show views side menu, hide button spread
                //viz show all views 
                // 
                break;
            case 2:
                this.view.timeline.classList.remove("hidden")
                this.view.sideMenuController.hideOptions()
                //show timeline
                break;
            case 3:
                this.view.sideMenuController.showOptions()
                this.model.removeImages()
                this.model.showImages()
                //show button and spread viz
                break;
            case 4:
                this.view.sitesMenuViewController.showOptions()
                // this.model.removeImages()
                this.model.centerImages()
                //show all and hide texts
                break;

            default:
                // this.view.intro.classList.remove("hidden")
                // this.view.process.classList.add("hidden")
                // this.view.explanation.classList.add("hidden")
                // this.view.spread.classList.add("hidden")
                break;
        }
    }


    setHeight() {
        const nEl = [...this.view.exhibitContent.children].length;
        const heightWindow = window.innerHeight;
        this.view.exhibitContent.style.height = `${heightWindow, nEl * heightWindow}px`;

    }

    renderView() {
        this.view.render();
        // this.setHeight();
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