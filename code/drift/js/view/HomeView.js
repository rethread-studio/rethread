class HomeView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.meetRobot_btn = null;
        this.model = model;
        this.viewExhibition_btn = null;
        this.takeTour_btn = null;
        this.aboutReThread_btn = null;
        this.username_inp = null;
    }




    render() {
        const content = `
        <div id="intro" class="center txt-white relative h-screen ">
            <img class="relative top-2-4 left-2-4 transform-50 h-auto .max-727 blur" src="./img/imgTest.png" alt="yahoo profile test">
            <div class="absolute middleInset translateCenter">
                <h1 class="m-0 text-center" >Dr<span>i</span>ft</h1>
            <h3>Welcome <input id="usernameInp">
                <ul id="mainMenuMain" class="flex flex-row justify-between p-0 m-0">
                    
                </ul>
                <div id="toggleHome" class="mt-10"></div>
            </div>
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
        this.aboutReThread_btn = document.getElementById("aboutBtn");
        this.username_inp = document.getElementById("usernameInp");
    }

    updateUsername(username) {
        this.username_inp.value = username;
    }
}
