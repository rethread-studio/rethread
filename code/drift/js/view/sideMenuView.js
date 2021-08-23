
const stateItemAccessor = (d) => d.state;
const valueAccessor = (d) => d.value;

export default class SideMenuView {

    constructor(container, model) {
        this.container = document.getElementById(container);
        this.model = model;
    }

    render() {
        const accessor = this.model.getModeAccessor();
        const stack = this.model.getStack()

        const menuInfo = this.model.getMenu("views")
            .map((i) => {
                const slct = stateItemAccessor(i);
                return `<li data-value="${valueAccessor(i)}" class ="viewListItem cursor-pointer transition duration-500 ease-in-out viewItem text-right mt-3 flex flex-row items-center justify-end ${slct == 1 ? "white" : " text-gray-700"}">
                            <div class="question"> 
                                <i class="fas fa-question mr-2 text-xs text-gray-800 hover:text-white"></i>
                            </div>
                                ${accessor(i)}  
                            <div class="box transition duration-500 ease-in-out rounded-md border-2 ${slct == 1 ? "border-white bg-white" : " border-gray-700"} bg-transparent ml-2" ><div/>
                        </li>`

            })
            .join(" ")

        const content = `
        <div class="flex flex-col items-end ">
            ${this.renderButton()}
            <ul id = "viewListMenu" class="viewsList from-right ${stack ? "appear" : ""}">
                ${menuInfo}
            </ul>
        </div>
       
		`;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    renderButton() {
        const stack = this.model.getStack();
        const disabled = this.model.getStackDisabled()
        const viewButton = this.model.getViewMode();
        const btnIcon = stack ? `<i class="fas fa-square-full mr-1 ml-2 text-xs"></i> <i class="fas fa-square-full text-xs"></i>` : `<i class="fas fa-clone ml-2"></i>`
        return `<button ${disabled ? "disabled " : " "} id="spreadBtn" class="transition-colors border-gray-600 bg-gray-600 border-2 duration-500 ease-in-out mb-5 rounded-xl p-3  bg-transparent hover:bg-white white hover:text-black text-center focus:border-0 focus:border-transparent focus:outline-none flex flex-row items-center justify-center from-right ${viewButton ? " appear" : ""}" >${stack ? "spread" : "stack"} ${btnIcon} </button>`;
    }

    updateViewList() {
        const accessor = this.model.getModeAccessor();
        const menuInfo = this.model.getMenu("views")
            .map((i) => {
                const slct = stateItemAccessor(i);
                return `<li data-value="${valueAccessor(i)}" class ="viewListItem cursor-pointer transition duration-500 ease-in-out viewItem text-right mt-3 flex flex-row items-center justify-end ${slct == 1 ? "white" : " text-gray-700"}">
                            <div class="question"> 
                                <i class="fas fa-question mr-2 text-xs text-gray-800 hover:text-white"></i>
                            </div>
                                ${accessor(i)}  
                            <div class="box transition duration-500 ease-in-out rounded-md border-2 ${slct == 1 ? "border-white bg-white" : " border-gray-700"} bg-transparent ml-2" ><div/>
                        </li>`

            })
            .join(" ")
        const container = document.getElementById("viewListMenu");
        container.innerHTML = menuInfo;

    }

    showHideViewList() {
        const container = document.getElementById("viewListMenu");
        const stack = this.model.getStack();
        stack ? container.classList.add("appear") : container.classList.remove("appear")
    }

    updateButton() {
        const stack = this.model.getStack();
        const btnIcon = stack ? `<i class="fas fa-square-full mr-1 ml-2 text-xs"></i> <i class="fas fa-square-full text-xs"></i>` : `<i class="fas fa-clone ml-2"></i>`
        const label = `${stack ? "spread" : "stack"}`
        this.btn.innerHTML = `${label} ${btnIcon}`;
    }



    setIdentifications() {
        this.items = document.querySelectorAll(".viewListItem");
        this.btn = document.getElementById("spreadBtn")
    }

}