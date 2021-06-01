class HomeView {
    constructor(container) {

        this.container = document.getElementById(container);
        this.meetRobot_btn = null;
        this.viewExhibition_btn = null;
        this.takeTour_btn = null;
        this.aboutReThread_btn = null;
    }

    render() {
        var content = `
        <div id="intro" class="center h-full">
        <img class="relative top-2-4 left-2-4 transform-50" src="./img/imgTest.png" alt="yahoo profile test">
        <div class="centerText">
            <h1>Dr<span>i</span>ft</h1>
            <ul>
                <button id="meetRobotBtn" type="button">Meet <br>the robot</button>
                <button id="exhibitionBtn" type="button">View <br>Exhibition</button>
                <button id="tourBtn" type="button">Virtual <br>tour</button>
                <button id="AboutBtn" type="button">About <br>re|thread</button>
            </ul>
        </div>
    </div>
		`;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        this.meetRobot_btn = document.getElementById("meetRobotBtn");
        this.viewExhibition_btn = document.getElementById("exhibitionBtn");
        this.takeTour_btn = document.getElementById("tourBtn");
        this.aboutReThread_btn = document.getElementById("AboutBtn");
    }
}
