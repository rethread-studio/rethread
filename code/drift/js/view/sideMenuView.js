const nameAccessor = (d) => d.name;
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
        this.container = container;
        this.model = model;
        this.model.addObserver(this);
    }

    render() {
        const dimensions = this.model.getSideMenudimensions();
        const rectDimensions = this.model.getRectDimensions();

        //ADD ALL THE VISUAL ITEMS 
        //MAIN wrapper in the HTML
        const wrapper = d3.select("#" + this.container)
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        //general graphic container
        const bounds = wrapper.append("g")
            .style("transform", `translate(${dimensions.width - dimensions.margin.left - rectDimensions.width
                }px, ${dimensions.margin.top
                }px)`)

        const scrollState = bounds.append("g")
            .attr("id", "sideMenuInfo")
            .style("transform", `translate(${0
                }px, ${0
                }px)`)

        //SQUARE
        scrollState.append("rect")
            .attr("x", 0)
            .attr("height", dimensions.height)
            .attr("width", rectDimensions.width)
            .style("fill", "#ffffff")

        //Current position
        scrollState.append("rect")
            .attr("id", "scrollPosition")
            .attr("x", posScale(dimensions)(0))
            .attr("height", 0)
            .attr("width", rectDimensions.width)
            .style("fill", "#ff0000")

        //menu text
        scrollState
            .selectAll('text')
            .data(this.model.getMenu("views"))
            .enter().append("text")
            .text(nameAccessor)
            .attr("class", getState)
            .style("transform", getStyle(rectDimensions))
        // .on("click", clickMenu)
    }

    updateScroll(mouseY) {
        const dimensions = this.model.getSideMenudimensions();
        d3.select("#scrollPosition")
            .attr("height", posScale(dimensions)(mouseY));
    }

    updateMenu() {
        const menuInfo = this.model.getMenu("views")
        //menu text
        d3.select("#sideMenuInfo")
            .selectAll('text')
            .data(menuInfo)
            .join("text")
            .text(nameAccessor)
            .attr("class", getState)
            .style("transform", getStyle)
        // .on("click", clickMenu)
    }

    update(changeDetails) {
        if (changeDetails.type == "updateSideMenu") {
            this.updateMenu();
        }
    }
}