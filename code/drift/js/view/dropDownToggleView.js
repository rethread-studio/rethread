

export default class DropDownToggleView {
    constructor(container, model) {
        this.container = document.getElementById(container);
        this.model = model;

    }

    render() {
        const menuInfo = this.model.getDataChildren()
            .map((i) => {
                const slct = i.state;
                return `<li data-value="${i.name}" class ="siteItem cursor-pointer transition duration-500 ease-in-out text-base text-left mt-3 flex flex-row items-center justify-start  text-gray-700">
                                <div class="box transition duration-500 ease-in-out rounded-md  ${slct ? "border-transparent" : "border-2 border-gray-700"} ${slct ? "bg-gray-700" : "bg-transparent"} ml-2 mr-2"></div>
                                ${i.name}  
                        </li>`
            })
            .join(" ")

        const content = `
        <!-- This example requires Tailwind CSS v2.0+ -->
        <div class="relative block text-right">
          <div>
            <button id="dropDownSitesBtn" type="button" class="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500" id="menu-button" aria-expanded="true" aria-haspopup="true">
              Search engines
              <!-- Heroicon name: solid/chevron-down -->
              <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        
          
          <div id="dropDownSitesContent" class="w-full origin-top-right absolute right-0 mt-2 w-32  pb-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <ul id = "viewSitesMenu" class="sitesList">
                ${menuInfo}
            </ul>
          </div>
        </div>
       `;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {

        this.content = document.getElementById('dropDownSitesContent')
        this.dropBtn = document.getElementById('dropDownSitesBtn')
        this.items = document.querySelectorAll(".siteItem");
    }


}

