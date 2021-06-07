class HomeView {
<<<<<<< HEAD
    constructor(container, model) {

=======
    constructor(container) {
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb
        this.container = document.getElementById(container);
        this.meetRobot_btn = null;
        this.model = model;
        this.viewExhibition_btn = null;
        this.takeTour_btn = null;
        this.aboutReThread_btn = null;
<<<<<<< HEAD

    }

    render() {
        const content = `
        <div id="intro" class="center txt-white relative h-screen ">
            <img class="relative top-2-4 left-2-4 transform-50 h-auto .max-727 blur" src="./img/imgTest.png" alt="yahoo profile test">
            <div class="absolute middleInset translateCenter">
                <h1 class="m-0 text-center" >Dr<span>i</span>ft</h1>
                <ul id="mainMenuMain" class="flex flex-row justify-between p-0 m-0">
                    
                </ul>
                <div id="toggleHome" class="mt-10"></div>
            </div>
=======
        this.username_inp = null;
    }

    render() {
        var content = `
        <div id="intro" class="center h-full">
        <img class="relative top-2-4 left-2-4 transform-50" src="./img/imgTest.png" alt="yahoo profile test">
        <div class="centerText">
            <h1>Dr<span>i</span>ft</h1>
            <h3>Welcome <input id="usernameInp">
            <ul>
                <button id="meetRobotBtn" type="button">Meet <br>the artists</button>
                <button id="exhibitionBtn" type="button">View <br>Exhibition</button>
                <button id="tourBtn" type="button">Virtual <br>tour</button>
                <button id="AboutBtn" type="button">About <br>re|thread</button>
            </ul>
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb
        </div>
		`;

        this.container.innerHTML = content;
        this.renderMenuItems()
        this.setIdentifications();
        this.renderToggle();
    }

    renderMenuItems() {
        const menuContainer = document.getElementById("mainMenuMain");
        const menuContent = this.model.getMainMenu()
            .map(i => {
                return `<li><a class="transition-colors duration-500 ease-in-out text-white hover:text-black" href="#" id="${i.value}Btn">${i.name}</a></li>`
            })
            .join(" ");

        menuContainer.innerHTML = menuContent;
        this.setIdentifications();

    }

    renderToggle() {
        let toggleView = new ToggleView("toggleHome", this.model);
        this.toggleViewController = new ToggleViewController(toggleView, this.model, "toggleHome");
        this.toggleViewController.renderView();
    }

    setIdentifications() {
        this.meetRobot_btn = document.getElementById("robotBtn");
        this.viewExhibition_btn = document.getElementById("exhibitionBtn");
        this.takeTour_btn = document.getElementById("tourBtn");
<<<<<<< HEAD
        this.aboutReThread_btn = document.getElementById("aboutBtn");

=======
        this.aboutReThread_btn = document.getElementById("AboutBtn");
        this.username_inp = document.getElementById("usernameInp");
    }

    updateUsername(username) {
        this.username_inp.value = username;
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb
    }
}
