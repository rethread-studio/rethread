

//ACCESSORS 
const stateAccessor = (d) => d.data.state;
const logoAccessor = (d) => stateAccessor(d) == 0 ? `./img/${d.data.logo}` : `./img/${d.data.image}`;
const translateToCenter = (radius, dimensions) => () => `translate(${dimensions.boundedWidth / 2 - radius},${dimensions.boundedHeight / 2 - radius})`;
const translaeWithRadius = d => `translate(${d.x - d.r},${d.y - d.r})`
const getSize = (d) => d.r * 2;

class MainVisView {

    constructor(container, model) {
        this.container = container;
        this.model = model;
        this.model.addObserver(this);

    }

    handleClick() {
        return (event, datum) => {
            this.model.selectDataItem(datum)
        }
    }
    render() {
        //ADD THE WRAPPER
        const dimensions = this.model.getVisDimensions();
        const wrapper = d3.select("#" + this.container)
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        wrapper.append("g")
            .attr("class", "bounds")
            .style("transform", `translate(${dimensions.margin.left
                }px, ${dimensions.margin.top
                }px)`)
            .attr("width", dimensions.boundedWidth)
            .attr("height", dimensions.boundedHeight)

        this.renderBubles(this.model.data, dimensions)

    }

    onEnter() {
        return (enter) => {
            const introTransition = d3.transition().duration(800)
            const radius = 80;
            const dimensions = this.model.visDimensions;

            enter
                .append("svg:image")
                .attr("xlink:href", logoAccessor)
                .attr("transform", translateToCenter(radius, dimensions))
                .attr("width", radius)
                .attr("height", radius)
                .on("click", this.handleClick())
                .transition(introTransition)
                .attr("transform", translaeWithRadius)
                .attr("width", getSize)
                .attr("height", getSize)
                .attr("class", "cursor-pointer")
        }
    }
    onUpdate() {
        return (update) => {
            const joinTransition = d3.transition().duration(800)
            const updateTransition = joinTransition.transition().duration(600)
            const radius = 100;
            const dimensions = this.model.visDimensions;
            update
                .transition(joinTransition)
                .attr("transform", translateToCenter(radius, dimensions))
                .attr("width", radius)
                .attr("height", radius)
                .transition(updateTransition)
                .attr("xlink:href", logoAccessor)
                .attr("transform", translaeWithRadius)
                .attr("width", getSize)
                .attr("height", getSize)
        }
    }

    onExit() {
        return (exit) => exit.remove()
    }

    renderBubles() {
        //calculate positions
        const pack = this.model.calculatePack()

        d3.select("#" + this.container)
            .select(".bounds")
            .selectAll("image")
            .data(pack.descendants().splice(1))
            .join(
                this.onEnter(),
                this.onUpdate(),
                this.onExit(),
            )
    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "selectItem") {
            this.renderBubles();
        } else if (changeDetails.type == "updateSideMenu") {
            this.renderBubles();
        } else if (changeDetails.type == "updateData") {
            this.renderBubles();
        }

    }
}