class ExhibitionView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        // this.meetRobot_btn = null;
    }

    render() {
        var content = `
    
            <div id="exhibitionIntro" class="relative h-screen"> </div>
            <div id="visContainer" class="relative  h-screen ">
                <div id="webSitesWrapper"></div>
                <div id="sideMenuWrapper"></div>
                <div id="timeLineWrapper"></div>
            </div>
       
		`;
        this.container.innerHTML = content;
        this.renderIntroSection();
        this.renderMainVis();
        this.renderSideMenu();
        this.renderTimeLine();
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

    renderTimeLine() {
        let timeLineView = new TimeLineView("timeLineWrapper", this.model);
        this.timeLineController = new TimeLineController(timeLineView, this.model);

        this.timeLineController.renderView();
    }
    unMountView() {
        this.timeLineController.unMountView();
    }
}
