
class MainMenuView {
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

        const menu = `
        <nav id= "burguerMenu" class="absolute flex flex-col items-center  justify-center  mx-auto w-screen    h-screen  pt-20 pb-20 background ">
            <a id="meetArtists_link" value="meetTheRobot" href="#" class="block py-1 white roboto text-8xl mb-10 font-light hover:underline">Meet the artists</a>
            <a id="viewExhibition_link" value="exhibition" href="#" class="block py-1 white roboto text-8xl mb-10 font-light hover:underline">View Exhibition</a>
            <a id="takeTour_link" value="tour" href="#" class="block py-1 white roboto text-8xl mb-10 font-light hover:underline">Virtual tour</a>
            <a id="aboutReThread_link" value="about" href="#" class="block py-1 white roboto text-8xl mb-10 font-light hover:underline">About re|thread </a>
        </nav>
            `

        const content = `
        <header class="fixed w-screen block z-50 flex flex-wrap flex-row justify-between p-6">
            <!-- Menu items -->
            <a id="home" value="home" class="z-50 robotoFont self-center txt-white text-3xl font-semibold tracking-widest" href="#" class="block mt-4 lg:inline-block text-teal-600 lg:mt-0 mr-10">
                Dr<span class="italic">i</span>ft
            </a>

            <button id="menuButton" class="flex px-4 py-3 border rounded mt-auto z-50 transition-colors duration-500 ease-in-out ${visible ? "bg-white" : "bg-current"} ">
                <svg class="fill-current h-3 w-3 ${visible ? " text-black" : " text-white"}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <title>Menu</title>
                    <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
                </svg>
            </button>
           ${visible ? menu : ""}
        </header>
		`;
        this.container.innerHTML = content;
        this.setIdentifications();
    }


    unMount() {
        this.container.innerHTML = ``;
    }

    setIdentifications() {
        this.home_link = document.getElementById("home");
        this.menuButton = document.getElementById("menuButton");

        if (this.model.getMenuVisible()) {
            this.meetArtists_link = document.getElementById("meetArtists_link");
            this.viewExhibition_link = document.getElementById("viewExhibition_link");
            this.takeTour_link = document.getElementById("takeTour_link");
            this.aboutReThread_link = document.getElementById("aboutReThread_link");
        }
    }
}

