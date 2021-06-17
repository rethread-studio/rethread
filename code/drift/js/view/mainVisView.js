
//ACCESSORS 
const dataNameAccessor = (d) => d.data.name.toLowerCase();
const stateAccessor = (d) => d.data.state;
const imageAccessor = (d) => d.data.image;
const getMaskId = (d) => `${d.data.name}Mask`
const getMaskIdString = (d) => `#${d.data.name}Mask`
const getUrlMaskId = (d) => `url(#${d.data.name}Mask)`

const getId = (d) => `#${d.data.name.toLowerCase()}`;

const logoAccessor = (d) => stateAccessor(d) == 0 ? `./img/${d.data.logo}` : `${d.data.image}`;
const translateTo = (radius, dimensions) => () => `translate(${dimensions.boundedWidth / 2 - radius},${dimensions.boundedHeight / 2 - radius})`;
const translateBottomCenter = (radius, dimensions) => () => `translate(${dimensions.boundedWidth / 2 - radius},${dimensions.boundedHeight / 2 - radius / 2})`;
const translateToPos = d => `translate(${d.x0},${d.y0})`;
const translateToUnderImage = d => `translate(${(d.x1 - d.x0) / 2},${(d.y1 - d.y0) / 2 + calculateRadius(d)})`;

const getCenterX = d => (d.x1 - d.x0) / 2;
const getCenterY = d => (d.y1 - d.y0) / 2;

const translaeWithRadius = d => `translate(${d.x - d.r},${d.y - d.r})`
const getSize = (d) => d.r * 2;
const getWidth = (d) => d.x1 - d.x0;
const getHeight = (d) => d.y1 - d.y0;

const calculateRadius = (d) => {
    const width = getWidth(d);
    const height = getHeight(d);
    const diameter = width > height ? height : width;
    return diameter / 2;
}

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

        this.renderBubles()

    }

    onEnter() {
        return (enter) => {
            const introTransition = d3.transition().duration(800)
            const dimensions = this.model.visDimensions;

            const element = enter
                .append("g")
                .attr("id", dataNameAccessor)
                .attr("class", "image-container")
                .attr("transform", translateToPos)

            const def = element.append(`defs`)
            const gradient = def.append(`radialGradient`)
                .attr(`id`, `radialGradient`)

            gradient.append(`stop`)
                .attr(`class`, `start`)
                .attr(`offset`, `3%`)
                .attr(`stop-color`, `white`)
                .attr(`stop-opacity`, 1);

            gradient.append(`stop`)
                .attr(`class`, `start`)
                .attr(`offset`, `100%`)
                .attr(`stop-color`, `black`)
                .attr(`stop-opacity`, 1);
            def.append(`mask`)
                .attr("id", getMaskId)
                .append(`circle`)
                .attr("class", "maskCircle")
                .attr(`cx`, getCenterX)
                .attr(`cy`, getCenterY)
                .attr(`r`, calculateRadius)
                .attr(`fill`, "url('#radialGradient')")

            element.append("svg:image")
                .attr("xlink:href", logoAccessor)
                .attr("width", getWidth)
                .attr("height", getHeight)
                .attr("mask", getUrlMaskId)

            element
                .append(`text`)
                .text(dataNameAccessor)
                .attr("fill", "white")
                .attr("opacity", `100%`)
                .attr("transform", translateToUnderImage)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
        }
    }
    onUpdate() {
        return (update) => {
            const joinTransition = d3.transition().duration(800)
            const updateTransition = joinTransition.transition().duration(600)
            const radius = 100;
            const dimensions = this.model.visDimensions;


            update
                .attr("transform", translateToPos)

            update.select("maskCircle")
                .attr(`cx`, getCenterX)
                .attr(`cy`, getCenterY)
                .attr(`r`, calculateRadius)

            update.select("mask")
                .remove()

            update.select(`defs`)
                .append(`mask`)
                .attr("id", getMaskId)
                .append(`circle`)
                .attr("class", "maskCircle")
                .attr(`cx`, getCenterX)
                .attr(`cy`, getCenterY)
                .attr(`r`, calculateRadius)
                .attr(`fill`, "url('#radialGradient')")


            update.select("image")
                .attr("width", getWidth)
                .attr("height", getHeight)
                .attr("mask", getUrlMaskId)

            update.select(`text`)
                .text(dataNameAccessor)
                .attr("fill", "white")
                .attr("transform", translateToUnderImage)
            // .attr("mask", getUrlMaskId)

            // update.select(`#getMaskId`)
            //     .select(`circle`)
            //     .attr(`cx`, getCenterX)
            //     .attr(`cy`, getCenterY)
            //     .attr(`r`, calculateRadius)
            //     .attr(`fill`, "url('#radialGradient')")


            // .attr(`cx`, getCenterX)
            // .attr(`cy`, getCenterY)
            // .attr(`r`, calculateRadius)
            // .select(getId)
            // .transition(joinTransition)
            // .attr("transform", translateTo(radius, dimensions))
            // .attr("width", radius)
            // .attr("height", radius)
            // .transition(updateTransition)
            // .attr("xlink:href", logoAccessor)
            // .attr("transform", translaeWithRadius)
            // .attr("width", getSize)
            // .attr("height", getSize)
            // console.log(item)

        }
    }

    //UPDATE BUBBLES 
    //all bubbles must be already rendered
    updateBubbles() {

        const nodes = this.model.calculatePack()
            .descendants()
            .splice(1)
        const joinTransition = d3.transition().duration(800)
        const updateTransition = joinTransition.transition().duration(600)
        const textTransition = updateTransition.transition().duration(800)
        const radius = 100;
        const dimensions = this.model.visDimensions;

        nodes.forEach(node => {
            let item = d3.select(`#${dataNameAccessor(node)} `)
                .attr("transform", `translate(${0},${0})`)

            // .select("image")
            // .transition(joinTransition)
            // .attr("transform", translateTo(radius, dimensions))
            // .attr("width", getWidth)
            // .attr("height", getHeight)
            // .transition(updateTransition)
            // .attr("xlink:href", logoAccessor(node))
            // .attr("transform", translateToPos(node))
            // .attr("width", getWidth)
            // .attr("height", getHeight)

            // const text = d3.select(`#${ dataNameAccessor(node) } `)
            //     .select(`text`)
            //     .attr("opacity", `0 % `)
            //     .transition(joinTransition)
            //     .attr("opacity", `0 % `)
            //     .attr("transform", `translate(${ node.x }
            //         ,${node.y + node.r + 20})`)
            //     .transition(textTransition)
            //     .attr("opacity", node.data.state == 1 ? `100%` : `0%`)
        })
    }

    onExit() {
        return (exit) => exit.remove()
    }

    renderBubles() {
        //calculate positions
        const pack = this.model.calculatePack()
        d3.select("#" + this.container)
            .select(".bounds")
            .selectAll(".image-container")
            .data(pack.descendants().splice(1))
            .join(
                this.onEnter(),
                this.onUpdate(),
                this.onExit(),
            )
    }

    updateImages() {
        this.model.getActiveNodes().forEach(node => {
            //upadte the image
            d3.select(`#${dataNameAccessor(node)}`)
                .select("image")
                .remove()

            d3.select(`#${dataNameAccessor(node)}`)
                .append("image")
                .attr("xlink:href", imageAccessor(node))
                .attr("transform", translaeWithRadius(node))
                .attr("width", getSize(node))
                .attr("height", getSize(node))
                .on("click", this.handleClick())
        })
    }

    //update info when modified in model
    update(changeDetails) {
        if (changeDetails.type == "selectItem") {
            // this.updateBubbles();
        } else if (changeDetails.type == "updateSideMenu") {
            // this.updateBubbles();
        } else if (changeDetails.type == "updateData") {
            // this.updateBubbles();
        } else if (changeDetails.type == "updateImages") {
            // this.updateImages();
        } else if (changeDetails.type == "sitesUpdated") {
            this.renderBubles();
        }
    }
}