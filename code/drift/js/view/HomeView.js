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
        const width = window.innerWidth;
        let audio_button = getAudioOnOffButton(width > 640 ? "fa-4x" : "fa-2x");
        const name = this.model.interaction.username;

        const content = `
        <div id="intro" class="center txt-white relative h-screen ">
            <img id="imageIntro" class="relative left-2-4 transform-50 h-auto max-w-xs md:max-w-3xl" src="./img/imgTest.png" alt="Drift intro">
            <div class="absolute middleInset translateCenter flex flex-col">
                <h3 class="text-center text-sm md:text-xl select-none">
                    Welcome <br> 
                    <div class="relative w-28 md:w-60 m-auto">
                        <label for="usernameInp"><i class="absolute inset-y-4 md:inset-y-6 right-2 md:right-4 fas fa-pen text-xs md:text-base"></i></label>
                        <input class="transition-colors duration-500 ease-in-out border border-gray-400 bg-transparent focus:bg-white focus:bg-opacity-1 mt-2 text-center text-white focus:text-gray-900 appearance-none inline-block rounded py-3 px-4 focus:outline-none w-28 md:w-60 h-8 md:h-16" value="${name}" id="usernameInp">
                    </div>
                </h3>
                <h1 class="text-9xl md:text-200xl m-0  mt-5 md:mt-0 select-none text-center font-black" >Dr<span class="italic">i</span>ft</h1>
                <ul id="mainMenuMain" class="flex flex-col sm:flex-row justify-between p-0 m-0 mt-4 sm:mt-0 space-y-3 sm:space-y-0 space-x-0 md:space-x-2">
                </ul>
                <div id="audio-div" class="mt-8 flex justify-center">${audio_button}</div>
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
                return `<li class="list-none text-xl md:text-2xl text-center"><a class="block text-white no-underline transition-colors duration-500 ease-in-out text-white hover:text-black" href="#" id="${i.value}Btn">${i.name}</a></li>`
            })
            .join(" ");

        menuContainer.innerHTML = menuContent;
        this.setIdentifications();

    }


    setIdentifications() {
        this.meetRobot_btn = document.getElementById("driftbotBtn");
        this.viewExhibition_btn = document.getElementById("exhibitionBtn");
        this.takeTour_btn = document.getElementById("tourBtn");
        this.aboutReThread_btn = document.getElementById("aboutBtn");
        this.username_inp = document.getElementById("usernameInp");
    }

    updateUsername(username) {
        this.username_inp.value = username;
    }
}
