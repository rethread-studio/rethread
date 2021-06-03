
class MainMenuView {
    constructor(container) {

        this.container = document.getElementById(container);
        this.home_link = null;
        this.meetRobot_link = null;
        this.viewExhibition_link = null;
        this.takeTour_link = null;
        this.aboutReThread_link = null;
    }

    render() {
        var content = `
        <header class="fixed w-screen block z-50">
        <nav class="flex items-center justify-between p-6 container mx-auto">


            <!-- Menu items -->
        
                <a id="home" class="robotoFont self-center txt-white text-3xl font-semibold tracking-widest" href="#" class="block mt-4 lg:inline-block text-teal-600 lg:mt-0 mr-10">
                    Dr<span class="italic">i</span>ft
                </a>

                <button class="flex px-4 py-3 border rounded mt-auto focus:outline-none">
                        <svg class="fill-current text-white h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <title>Menu</title>
                            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
                        </svg>
                </button>
        

        </nav>
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
        this.meetRobot_link = document.getElementById("meetRobot");
        this.viewExhibition_link = document.getElementById("viewExhibit");
        this.takeTour_link = document.getElementById("virtualTour");
        this.aboutReThread_link = document.getElementById("aboutRethread");
    }
}

