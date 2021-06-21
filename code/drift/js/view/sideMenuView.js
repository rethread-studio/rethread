const nameAccessor = (d) => d.name;
const stateItemAccessor = (d) => d.state;
const valueAccessor = (d) => d.value;
const getState = (d) => d.state == 1 ? "menuText active cursor-pointer" : "menuText cursor-pointer"
const getStyle = (rectDimensions) => (d, i) => `translate(${-20
    }px, ${rectDimensions.sectionHeight * i + rectDimensions.sectionHeight / 2
    }px)`;
//calculate the height related to the windows scroll height
const posScale = (dimensions) => d3.scaleLinear()
    .domain([0, document.documentElement.scrollHeight])
    .range([0, dimensions.height])

class SideMenuView {

    constructor(container, model) {
        this.container = document.getElementById(container);
        this.model = model;
    }

    render() {
        const accessor = this.model.getModeAccessor();
        const stack = this.model.getStack();
        const btnIcon = stack ? `<i class="fas fa-square-full mr-1 ml-2 text-xs"></i> <i class="fas fa-square-full text-xs"></i>` : `<i class="fas fa-clone ml-2"></i>`
        const menuInfo = this.model.getMenu("views")
            .map((i) => {
                const slct = stateItemAccessor(i);
                return `<li data-value="${valueAccessor(i)}" class ="viewListItem cursor-pointer transition duration-500 ease-in-out viewItem text-right mt-3 flex flex-row items-center justify-end ${slct == 1 ? "white" : " text-gray-700"}">
                            <i class="fas fa-question mr-2 text-xs text-gray-800 hover:text-white"></i>
                            ${accessor(i)}  
                        <div class="box transition duration-500 ease-in-out rounded-md border-2 ${slct == 1 ? "border-white bg-white" : " border-gray-700"} bg-transparent ml-2" ><div/>
                    </li>`

            })
            .join(" ")

        const content = `
        <div class="flex flex-col items-end">
            <button id="spreadBtn" class="transition-colors border-gray-600 bg-gray-600 border-2 duration-500 ease-in-out mb-5 rounded-xl p-3  bg-transparent hover:bg-white white hover:text-black text-center focus:border-0 focus:border-transparent focus:outline-none flex flex-row items-center justify-center" >${stack ? "spread" : "stack"} ${btnIcon} </button>
            <ul class="viewsList">
                ${menuInfo}
            </ul>
        </div>
       
		`;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        this.items = document.querySelectorAll(".viewListItem");
        this.btn = document.getElementById("spreadBtn")
    }

}