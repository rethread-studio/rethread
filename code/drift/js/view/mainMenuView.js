
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
<header>
<nav class="flex items-center justify-between p-6 container mx-auto">


    <!-- Menu items -->
    <div class="text-lg text-gray-600 hidden lg:flex">
        <a id="home" href="#" class="block mt-4 lg:inline-block text-teal-600 lg:mt-0 mr-10">
            Drift
        </a>
        <a id="meetRobot" href="#" class="block mt-4 lg:inline-block hover:text-gray-700 lg:mt-0 mr-10">
            Meet<br>the artists
        </a>
        <a id="viewExhibit" href="#" class="block mt-4 lg:inline-block hover:text-gray-700 lg:mt-0 mr-10">
            View <br>Exhibition
        </a>
        <a id="virtualTour" href="#" class="block hover:text-gray-700 mt-4 lg:inline-block lg:mt-0 mr-10">
            Virtual <br>tour
        </a>
        <a id="aboutRethread" href="#" class="block hover:text-gray-700 mt-4 lg:inline-block lg:mt-0">
            About <br>re|thread
        </a>
    </div>

    <!-- CTA and Hamburger icon -->
    <div class="flex items-center">

        <div class="block lg:hidden">
            <button
                class="flex items-center px-4 py-3 border rounded text-teal-500 border-teal-500 focus:outline-none">
                <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <title>Menu</title>
                    <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
                </svg>
            </button>
        </div>
    </div>
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

