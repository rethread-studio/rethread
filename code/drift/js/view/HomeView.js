export default class HomeView {
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
        let audio_button = getAudioOnOffButton("fa-4x");
        const content = `
        <div id="intro" class="center txt-white relative h-screen ">
            <img id="imageIntro" class="relative left-2-4 transform-50 h-auto .max-727" src="./img/imgTest.png" alt="Drift intro">
            <div class="absolute middleInset translateCenter">
                <h3 class="text-center text-xl select-none ">Welcome <br> <input class="transition-colors duration-500 ease-in-out border border-gray-400 bg-transparent focus:bg-white focus:bg-opacity-1 mt-2 text-center text-white focus:text-gray-900 appearance-none inline-block rounded py-3 px-4 focus:outline-none" id="usernameInp">
                <h1 class=" text-200xl sm:text-xs m-0 select-none text-center font-black" >Dr<span class="italic">i</span>ft</h1>
                <ul id="mainMenuMain" class="flex flex-row justify-between p-0 m-0">
                </ul>
                <div id="audio-div" class="m-8 flex justify-center">${audio_button}</div>
            </div>
        </div>
		`;

        this.container.innerHTML = content;
        this.renderMenuItems()
        this.setIdentifications();

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
