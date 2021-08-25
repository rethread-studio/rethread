import { currentView, exhibitionViewController } from '../app.js';
import ToggleView from './toggleView.js';
import ToggleViewController from '../controller/toggleViewController.js';

export default class MainMenuView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.home_link = null;
        this.menuButton = null;
        this.model = model
        this.meetArtists_link = null;
        this.viewExhibition_link = null;
        this.takeTour_link = null;
        this.aboutReThread_link = null;
    }

    render() {
        const visible = this.model.getMenuVisible();
        const viewToggle = currentView == exhibitionViewController;
        let audio_button = getAudioOnOffButton("fa-2x");

        const menu = `
        <nav id= "burguerMenu" class="${visible ? "visible" : "invisible"} absolute top-0 left-0 flex flex-col items-center  justify-center  mx-auto w-screen  h-screen  pt-20 pb-20 background ">
            <div id="mainMenuItems"  class="text-center z-10">
            </div>
            
            <img id="imageIntro" class="absolute left-2-4 transform-50 w-2/4 md:h-auto .max-727 z-0" src="./img/imgTest.png" alt="yahoo profile test">
        </nav>
        `

        const content = `
        <header class="fixed w-screen block z-50 flex flex-wrap flex-row place-content-center  place-items-center justify-between  px-6 pt-2 md:pt-6">
        <!-- Menu items -->
        <a id="home" value="home" class="z-50 robotoFont self-center txt-white text-xl md:text-3xl font-semibold tracking-widest" href="#" class="block mt-4 lg:inline-block text-teal-600 lg:mt-0 mr-10">
             Dr<span class="italic">i</span>ft
        </a>
            
            <div id="toggleItem" class="ml-auto mr-4 pt-2 hidden md:block ${viewToggle ? "visible" : "invisible"}"></div>
            <div id="audio-div" class="mr-4 md:mr-8 ml-2 md:ml-4 text-white pt-2">${audio_button}</div>
            <button id="menuButton" class="flex px-4 py-3 border rounded mt-auto z-50 transition-colors duration-500 ease-in-out ${visible ? "bg-white" : "bg-current"} ">
                <svg class="fill-current h-3 w-3 ${visible ? " text-black" : " text-white"}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <title>Menu</title>
                    <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
                </svg>
            </button>
           ${menu}
        </header>
		`;
        this.container.innerHTML = content;
        this.renderMenuItems()
        this.setIdentifications();
        this.renderToggle();
    }

    renderMenuItems() {
        const menuContainer = document.getElementById("mainMenuItems");
        const items = this.model.getMainMenu(false)
            .map(i => {
                return ` <a id="${i.value}Link" value="${i.value}" href="#" class="block py-1 white roboto text-4xl md:text-8xl mb-4 md:mb-10 font-light hover:underline">${i.name}</a>`
            })
            .join(" ");
        const menuContent = ` ${items}`

        menuContainer.innerHTML = menuContent;
        this.setIdentifications();

    }


    unMount() {
        this.container.innerHTML = ``;
    }

    renderToggle() {
        let toggleView = new ToggleView("toggleItem", this.model);
        this.toggleViewController = new ToggleViewController(toggleView, this.model, "toggleModeMenu");
        this.toggleViewController.renderView();
    }

    setIdentifications() {
        this.home_link = document.getElementById("home");
        this.menuButton = document.getElementById("menuButton");

        if (this.model.getMenuVisible()) {
            this.meetArtists_link = document.getElementById("driftbotLink");
            this.viewExhibition_link = document.getElementById("exhibitionLink");
            this.takeTour_link = document.getElementById("tourLink");
            this.aboutReThread_link = document.getElementById("aboutLink");
        }
    }
}

