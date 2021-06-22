class ExhibitionView {
    constructor(container, model, vizModel) {

        this.container = document.getElementById(container);
        this.model = model;
        this.vizModel = vizModel;
        // this.meetRobot_btn = null;
    }

    render() {
        // <div id="webSitesWrapper"></div>
        const content = `
        <div class="">
            <div id="exhibitionIntro" class="flex content-center items-center justify-left h-screen  white fixed top-0 left-300 hidden z-10 "> </div>
            <div id="exhibitionProcess" class="flex content-center items-center justify-left h-screen  white fixed top-0 left-300 hidden z-10"> </div>
            <div id="exhibitionExplanation" class="flex content-center items-center justify-left h-screen  white fixed top-0 left-300 hidden z-10"> </div>
            <div id="exhibitionSpread" class="flex content-center items-center justify-left h-screen  white fixed top-0 left-300 hidden z-10"> </div>
            
            <div id="visContainer" class="h-screen w-screen fixed top-0">
                    <div id="viewSideMenu" class="absolute top-2-4 -translate-y-2-4  mr-5 right-0"></div>
                    <div id="timeLineWrapper"></div>
                    <div id="currentTimeWrapper" class= "relative top-100 ml-5 "></div>
                    <div id="sitesMenuWrapper" class="absolute top-2-4 -translate-y-2-4  ml-5"></div>
            </div>
        </div>
       
		`;
        this.container.innerHTML = content;
        this.renderIntroSection();
        this.renderWhatWeDid();
        this.renderExplanation();
        this.renderSpreadSection()
        // this.renderMainVis();
        this.renderSideMenu();
        this.renderTimeLine();
        this.renderSitesMenu();
        this.renderCurrentTime();
        this.setIdentifications()
    }



    renderCurrentTime() {
        //ADD MAIN VISUALIZATION VIEWda
        let currentTimeView = new CurrentTimeView("currentTimeWrapper", this.model);
        this.currentTimeController = new CurrentTimeViewController(currentTimeView, this.model);
        this.currentTimeController.renderView();
    }
    // renderMainVis() {
    //     //ADD MAIN VISUALIZATION VIEW
    //     let mainVisView = new MainVisView("webSitesWrapper", this.model);
    //     this.mainVizController = new MainVisController(mainVisView, this.model);
    //     this.mainVizController.renderView();
    // }

    renderSideMenu() {
        //ADD SIDE MENU VIEW
        let sideMenuView = new SideMenuView("viewSideMenu", this.model);
        this.sideMenuController = new SideMenuController(sideMenuView, this.model);
        this.sideMenuController.renderView();
    }

    renderIntroSection() {
        let introView = new IntroView("exhibitionIntro", this.vizModel);
        this.introController = new IntroViewController(introView, this.vizModel);
        this.introController.renderView();
    }

    renderWhatWeDid() {
        let whatView = new WhatWeDidViewView("exhibitionProcess", this.vizModel);
        this.whatController = new WhatWeDidViewController(whatView, this.vizModel);
        this.whatController.renderView();
    }
    renderExplanation() {
        let explanationView = new ExplainView("exhibitionExplanation", this.vizModel);
        this.explainController = new ExplainViewController(explanationView, this.vizModel);
        this.explainController.renderView();
    }

    renderSpreadSection() {
        let spreadView = new SpreadView("exhibitionSpread", this.vizModel);
        this.spreadController = new SpreadViewController(spreadView, this.vizModel);
        this.spreadController.renderView();
    }

    renderTimeLine() {
        let timeLineView = new TimeLineView("timeLineWrapper", this.model);
        this.timeLineController = new TimeLineController(timeLineView, this.model);
        this.timeLineController.renderView();
    }

    renderSitesMenu() {
        let sitesMenuView = new SelectSiteToggleView("sitesMenuWrapper", this.model);
        this.sitesMenuViewController = new SelectSiteToggleViewController(sitesMenuView, this.model);
        this.sitesMenuViewController.renderView();
    }
    unMountView() {
        this.timeLineController.unMountView();
    }

    setIdentifications() {
        this.intro = document.getElementById('exhibitionIntro')
        this.process = document.getElementById('exhibitionProcess')
        this.explanation = document.getElementById('exhibitionExplanation')
        this.spread = document.getElementById('exhibitionSpread')
        this.visContainer = document.getElementById('visContainer')
        this.timeline = document.getElementById('timeLineWrapper')
        this.viewsMenu = document.getElementById('viewSideMenu')
    }
}
