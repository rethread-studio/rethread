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
        <div id="intro" class="center txt-white relative h-screen ">
        <img class="relative top-2-4 left-2-4 transform-50 h-auto .max-727 blur" src="./img/imgTest.png" alt="yahoo profile test">
        <div class="absolute middleInset translateCenter">
            <h1 class="m-0 text-center" >Dr<span>i</span>ft</h1>
            <ul class="flex flex-row justify-between p-0 m-0">
                <li><a class="transition-colors duration-500 ease-in-out text-white hover:text-black" href="#" id="meetRobotBtn" >Meet <br>the artists</a></li>
                <li><a class="transition-colors duration-500 ease-in-out text-white hover:text-black" href="#" id="exhibitionBtn" >View <br>Exhibition</a></li>
                <li><a class="transition-colors duration-500 ease-in-out text-white hover:text-black" href="#" id="tourBtn" >Virtual <br>tour</a></li>
                <li><a class="transition-colors duration-500 ease-in-out text-white hover:text-black" href="#" id="AboutBtn" >About <br>re|thread</a></li>
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
