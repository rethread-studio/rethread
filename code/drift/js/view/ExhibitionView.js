class ExhibitionView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        // this.meetRobot_btn = null;
    }

    render() {
        var content = `
            <div class="fullHeight">
                <div id="exhibitionIntro" class="flex content-center items-center justify-center relative h-screen  white "> </div>
                <div id="exhibitionProcess" class="flex content-center items-center justify-center relative h-screen  white"> </div>
                <div id="exhibitionExplanation" class="flex content-center items-center justify-center relative h-screen  white"> </div>
                <div id="visContainer" class="relative  h-screen sticky top-0 background-black">
                    <div id="webSitesWrapper"></div>
                    <div id="sideMenuWrapper"></div>
                    <div id="timeLineWrapper"></div>
                    <div id="sitesMenuWrapper" class="absolute mt-20 ml-5"></div>
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
    }

    setIdentifications() {
        // this.meetRobot_btn = document.getElementById("meetRobotBtn");
    }

    renderMainVis() {
        //ADD MAIN VISUALIZATION VIEW
        let mainVisView = new MainVisView("webSitesWrapper", this.model);
        this.mainVizController = new MainVisController(mainVisView, this.model);
        this.mainVizController.renderView();
    }

    renderSideMenu() {
        //ADD SIDE MENU VIEW
        let sideMenuView = new SideMenuView("sideMenuWrapper", this.model);
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
        let sitesMenuView = new CheckBoxListView("sitesMenuWrapper", this.model);
        this.sitesMenuViewController = new CheckBoxViewController(sitesMenuView, this.model);
        this.sitesMenuViewController.renderView();
    }
    unMountView() {
        this.timeLineController.unMountView();
    }
}
