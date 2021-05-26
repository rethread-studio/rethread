class ExhibitionView {
    constructor(container) {

        this.container = document.getElementById(container);
        // this.meetRobot_btn = null;
    }

    render() {
        var content = `
        <div id="webSitesWrapper"></div>
        <div id="wrapper"></div>
		`;
        this.container.innerHTML = content;
        // this.setIdentifications();
    }

    setIdentifications() {
        // this.meetRobot_btn = document.getElementById("meetRobotBtn");
    }
}
