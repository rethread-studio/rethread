class ExhibitionView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        // this.meetRobot_btn = null;
    }

    render() {
        const content = `
        <div class="">
            <div id="exhibitionIntro" class="flex content-center items-center justify-center relative h-screen  white "> </div>
            <div id="exhibitionProcess" class="flex content-center items-center justify-center relative h-screen  white"> </div>
            <div id="exhibitionExplanation" class="flex content-center items-center justify-center relative h-screen  white"> </div>
            
            <div id="visContainer" class="h-screen w-screen fixed top-0">
                     <div id="webSitesWrapper"></div>
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
        this.renderExplanation()
        this.renderMainVis();
        this.renderSideMenu();
        this.renderTimeLine();
        this.renderSitesMenu();
        this.renderCurrentTime();
    }

    setIdentifications() {
        // this.meetRobot_btn = document.getElementById("meetRobotBtn");
    }

    renderCurrentTime() {
        //ADD MAIN VISUALIZATION VIEWda
        let currentTimeView = new CurrentTimeView("currentTimeWrapper", this.model);
        this.currentTimeController = new CurrentTimeViewController(currentTimeView, this.model);
        this.currentTimeController.renderView();
    }
    renderMainVis() {
        //ADD MAIN VISUALIZATION VIEW
        let mainVisView = new MainVisView("webSitesWrapper", this.model);
        this.mainVizController = new MainVisController(mainVisView, this.model);
        this.mainVizController.renderView();
    }

    renderSideMenu() {
        //ADD SIDE MENU VIEW
        let sideMenuView = new SideMenuView("viewSideMenu", this.model);
        this.sideMenuController = new SideMenuController(sideMenuView, this.model);
        this.sideMenuController.renderView();
    }

    renderIntroSection() {
        let introView = new IntroView("exhibitionIntro", this.model);
        this.introController = new IntroViewController(introView, this.model);
        this.introController.renderView();
    }

    renderWhatWeDid() {
        let whatView = new WhatWeDidViewView("exhibitionProcess", this.model);
        this.whatController = new WhatWeDidViewController(whatView, this.model);
        this.whatController.renderView();
    }
    renderExplanation() {
        let explanationView = new ExplainView("exhibitionExplanation", this.model);
        this.explainController = new ExplainViewController(explanationView, this.model);
        this.explainController.renderView();
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
}
