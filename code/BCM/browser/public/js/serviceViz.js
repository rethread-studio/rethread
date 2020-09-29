//service container
class ServiceGenerator {

    constructor(height, width) {
        //DATA 
        this.servicesData = [];
        this.initiatorsData = [];

        //GENERAL DIMENSIONS OF THE VIZ
        this.dimensions = {
            width: width,
            height: height,
            margin: {
                top: 15,
                right: 15,
                bottom: 40,
                left: 10
            },
        }
        this.dimensions.boundedWidth = this.dimensions.width - this.dimensions.margin.left - this.dimensions.margin.right;
        this.dimensions.boundedHeight = this.dimensions.height - this.dimensions.margin.top - this.dimensions.margin.bottom;

        //ALL THE ELEMENTS CONTAINERS
        this.wrapper;
        this.bounds;
        //Serices container
        this.serviceGroups;

        this.initiators;
        this.initiatorGroups;
        //CREATE THE CONTAINERS IN THE HTML
        this.createContainers();
    }

    createContainers() {
        //general container
        this.wrapper = d3
            .select("#wrapper")
            .append("svg")
            .attr("width", this.dimensions.width)
            .attr("height", this.dimensions.height)
        //All graphs container
        this.bounds = this.wrapper
            .append('g')
            .attr('class', 'services')
            .style(
                'transform',
                `translate(${this.dimensions.margin.left}px, ${this.dimensions.margin.top}px)`
            )
            .attr("width", this.dimensions.boundedWidth)
            .attr("height", this.dimensions.boundedHeight)


        //Initiator container
        this.initiators = this.wrapper
            .append('g')
            .attr('class', 'initiators')
            .style(
                'transform',
                `translate(${this.dimensions.margin.left}px, ${this.dimensions.margin.top}px)`
            )
            .attr("width", this.dimensions.boundedWidth / 2)
            .attr("height", this.dimensions.boundedHeight)
    }

    //Check if initiator exists
    //if it exists it adds +1 to counter
    //otherwise it creates it
    // _name string name of initiator
    addInitiator(_name) {

        //add if initiator does not exist
        if (!this.initiatorsData.find(i => i.getName() == _name)) {
            this.initiatorsData.push(new Initiator(_name, 0))
            this.updateYpos(this.initiatorsData);
        } else {

        }
        this.drawInitiators();
    }

    //Adds a new service to the data set if it does not exist
    addService(_service) {
        //Add if it does not exist
        if (!this.servicesData.find(s => s.name == _service)) {
            this.servicesData.push(new Service(_service, 0))
            this.updateYpos(this.servicesData);
        } else {
            //Add more time of life to the service
        }

        this.drawServices();
    }

    updateYpos(_arr) {
        _arr.map(d => {
            d.addPosY();
            return d
        })
    }

    drawInitiators() {
        //ACCESSORS
        const yAccessor = d => this.dimensions.boundedHeight - d.getPosY();

        //Create the transitions for NEW rects, REMAINING, and OLD information
        const exitTransition = d3.transition().duration(600);
        const updateTransition = exitTransition.transition().duration(600)

        //Create new visual Services baed on the data
        //Ask the new and old services to create animations 
        this.initiatorGroups = this.wrapper.select('.initiators').selectAll('.initiator').data(this.initiatorsData);
        // let binGroups = bounds.select('.bins').selectAll('.bin').data(bins)

        // get the services that are already going out
        const oldInitiators = this.initiatorGroups.exit();

        oldInitiators.selectAll("rect")
            .style("fill", "red")
            // .transition(exitTransition)
            .attr("y", yAccessor)
            .attr("x", this.dimensions.margin.left)

        oldInitiators.selectAll("text")
            // .transition(exitTransition)
            .attr("y", yAccessor)

        // Remove from the DOM after completing the animations
        oldInitiators
            // .transition(exitTransition)
            .remove()

        const newInitiatorGroup = this.initiatorGroups.enter().append('g').attr('class', 'initiator');
        // newInitiatorGroup.append('rect')
        //     .attr("width", 100)
        //     .attr("height", 50)
        //     .attr("y", yAccessor)
        //     .attr("x", this.dimensions.boundedWidth - 100)
        //     .attr("fill", "white")

        newInitiatorGroup.append('text')
            //set the lavels in the initial position to prevent them from flying
            .attr("x", this.dimensions.margin.left)
            .attr("y", d => this.dimensions.boundedHeight)

        this.initiatorGroups = newInitiatorGroup.merge(this.initiatorGroups)

        // const barRects = this.initiatorGroups
        //     .select('rect')
        //     .transition(updateTransition)
        //     .attr('x', this.dimensions.boundedWidth - 100)
        //     .attr("y", d => this.dimensions.boundedHeight - d.getPosY())
        //     .attr('height', 50)
        //     .attr('width', 100)
        //     .attr('fill', 'white')

        const barText = this.initiatorGroups
            .select('text')
            // Let's add a transition so that our text transitions with our bars
            // .transition(updateTransition) // IMPROVEMENT: Use our custom transition from above
            .attr('x', this.dimensions.margin.left)
            .attr('y', yAccessor)
            .attr('text-anchor', 'start')
            .text(d => d.getName() || '')
            .style('fill', 'green')
    }

    drawServices() {

        //ACCESSORS
        const yAccessor = d => this.dimensions.boundedHeight - d.getPosY();

        //Create the transitions for NEW rects, REMAINING, and OLD information
        const exitTransition = d3.transition().duration(600);
        const updateTransition = exitTransition.transition().duration(600)

        //Create new visual Services baed on the data
        //Ask the new and old services to create animations 
        this.serviceGroups = this.wrapper.select('.services').selectAll('.service').data(this.servicesData);
        // let binGroups = bounds.select('.bins').selectAll('.bin').data(bins)

        // get the services that are already going out
        const oldServices = this.serviceGroups.exit();

        oldServices.selectAll("rect")
            .style("fill", "red")
            // .transition(exitTransition)
            .attr("y", yAccessor)
            .attr("x", this.dimensions.boundedWidth - 10)

        oldServices.selectAll("text")
            // .transition(exitTransition)
            .attr("y", yAccessor)

        // Remove from the DOM after completing the animations
        oldServices
            // .transition(exitTransition)
            .remove()

        const newServiceGroup = this.serviceGroups.enter().append('g').attr('class', 'service');
        // newServiceGroup.append('rect')
        //     .attr("width", 100)
        //     .attr("height", 50)
        //     .attr("y", yAccessor)
        //     .attr("x", this.dimensions.boundedWidth - 100)
        //     .attr("fill", "white")

        newServiceGroup.append('text')
            //set the lavels in the initial position to prevent them from flying
            .attr("x", this.dimensions.boundedWidth - 10)
            .attr("y", d => this.dimensions.boundedHeight)

        this.serviceGroups = newServiceGroup.merge(this.serviceGroups)

        // const barRects = this.serviceGroups
        //     .select('rect')
        //     .transition(updateTransition)
        //     .attr('x', this.dimensions.boundedWidth - 100)
        //     .attr("y", d => this.dimensions.boundedHeight - d.getPosY())
        //     .attr('height', 50)
        //     .attr('width', 100)
        //     .attr('fill', 'white')

        const barText = this.serviceGroups
            .select('text')
            // Let's add a transition so that our text transitions with our bars
            // .transition(updateTransition) // IMPROVEMENT: Use our custom transition from above
            .attr('x', d => this.dimensions.boundedWidth - 10)
            .attr('y', yAccessor)
            .attr('text-anchor', 'end')
            .text(d => d.getName() || '')
            .style('fill', 'green')

    }

}

//FROM AN EVENT
//this is the URL that initiates all the requests
class Initiator {

    constructor(name, posY) {
        this.name = name;
        this.posY = posY;
        this.counter = 1;
        this.lifeTime = 1 * 1000;
    }

    addPosY() {
        this.posY += 20;
    }

    getName() {
        return this.name
    }
    getPosY() {
        return this.posY
    }
}

//FROM AN EVENT
//this is the service that is requested
class Service {
    constructor(name, posY) {
        this.name = name;
        this.lifeTime = 1 * 1000;
        this.posY = posY;
    }

    //add more time to its life 1 second in ml
    addLifeTime() {
        this.lifeTime += 1 * 1000
    }

    addPosY() {
        this.posY += 20;
    }

    getPosY() {
        return this.posY
    }


    getName() {
        return this.name
    }
}



