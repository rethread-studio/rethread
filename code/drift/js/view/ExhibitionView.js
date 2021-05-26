class ExhibitionView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        // this.meetRobot_btn = null;
    }

    render() {
        var content = `
        <div id="webSitesWrapper"></div>
        <div id="wrapper"></div>
		`;
        this.container.innerHTML = content;
        this.renderMainVis();

    }

    setIdentifications() {
        // this.meetRobot_btn = document.getElementById("meetRobotBtn");
    }

    renderMainVis() {
        let mainVisView = new MainVisView("webSitesWrapper", this.model);
        this.mainVizController = new MainVisController(mainVisView, this.model);
        this.mainVizController.renderView();
    }
}
