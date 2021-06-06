
const apiService = new ApiService();

//HELPERS
const hierarchySize = (d) => d.value;
const sortBySize = (a, b) => hierarchySize(b) - hierarchySize(a);
const findByName = (name) => (d) => d.name == name;
const filterByState = (state) => (d) => d.state == state
const calculateSize = (active, inactive) => (d) => {
    d.value = d.state == 0 ? inactive : active;
    return d;
}
//update the state of the menu item 
const updateState = (_name) => {
    return (d) => {
        d.state = d.name == _name ? 1 : 0;
        return d;
    }
}

class DriftModel {

    constructor() {
        this.menu = []; //menu is the list of views or list of sites
        this.data = dataTest //is the current sites or views to displa in the viz
        this.currentSection = this.menu[0];
        this.observers = [];
        this.visDimensions = {
            width: window.innerWidth,
            height: window.innerHeight,
            margin: {
                top: 0,
                right: 150,
                bottom: 200,
                left: 20
            }
        }
        this.visDimensions.boundedWidth = this.visDimensions.width - this.visDimensions.margin.right - this.visDimensions.margin.left;
        this.visDimensions.boundedHeight = this.visDimensions.height - this.visDimensions.margin.top - this.visDimensions.margin.bottom;

        this.menuDimensions = {
            width: 150,
            height: window.innerHeight * 0.3,
            margin: {
                top: 10,
                right: 10,
                bottom: 10,
                left: 30
            }
        }
        this.menuDimensions.boundedWidth = this.menuDimensions.width - this.menuDimensions.margin.left - this.menuDimensions.margin.right;
        this.menuDimensions.boundedHeight = this.menuDimensions.height - this.menuDimensions.margin.top - this.menuDimensions.margin.bottom;

        this.rectDimensions = {
            height: 5,
            width: 1,
        }
        this.rectDimensions.sectionHeight = this.menuDimensions.height / this.menu.length;

        this.visits = [];

        this.timeLineDimensions = {
            width: window.innerWidth * 0.95,
            height: 150,
            margin: {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
            },
            rectDimensions: {
                height: 3,
                width: window.innerWidth * 0.8,
            },
            sliderDimensions: {
                height: 50,
                width: 5,
            }

        }
        this.timeLineDimensions.boundedWidth = this.timeLineDimensions.width - this.timeLineDimensions.margin.left - this.timeLineDimensions.margin.right;
        this.timeLineDimensions.boundedHeight = this.timeLineDimensions.height - this.timeLineDimensions.margin.top - this.timeLineDimensions.margin.bottom;

        this.currentVisitPos = 0;
        this.baseSpeed = 1000;
        this.currentSpeed = 0;
        this.playState = false;

        this.sliderSpeed = [
            {
                text: "Normal",
                speed: 1000
            },
            {
                text: "1.5",
                speed: this.baseSpeed / 2
            },
            {
                text: "2",
                speed: this.baseSpeed / 9
            },
        ]
        this.pack;

        this.menuVisible = false;
        this.mode = false;
    }

    init() {
        this.getData();
        this.loadMenu("views");
        this.getSitesVisits()

    }

    getMode() {
        return this.mode;
    }

    getMenuVisible() {
        return this.menuVisible;
    }

    getPack() {
        return this.pack;
    }

    getCurrentSpeed() {
        return this.sliderSpeed[this.currentSpeed].speed;
    }

    getPlayState() {
        return this.playState;
    }

    getChangePlayState() {
        this.playState = !this.playState;
        const type = this.playState ? "playTimeLine" : "pauseTimeLine"
        this.notifyObservers({ type: type });
    }

    getSliderSpeed() {
        return this.sliderSpeed;
    }

    getRectDimensions() {
        return this.rectDimensions;
    }

    getSideMenudimensions() {
        return this.menuDimensions;
    }

    getTimeLineDimensions() {
        return this.timeLineDimensions;
    }

    getVisDimensions() {
        return this.visDimensions;
    }

    getSliderHeight() {
        return this.timeLineDimensions.sliderDimensions;
    }

    getData(type) {
        apiService.getData(type)
            .then(data => data.map((site, i) => {
                return {
                    name: site,
                    state: i == 0 ? 1 : 0,
                    value: 0,
                    image: "https://drift.durieux.me/api/time/1619197200000/google/graph.png?width=300",
                    logo: `logo.${site}.png`
                }
            })
            )
            .then(children => {
                this.data = {
                    value: 0,
                    children: children
                }
                this.calculateDataValues();
                this.notifyObservers({ type: "updateData" });
            })
    }

    getCurrentTime() {
        return d3.timeFormat("%b %d %a %H:%M")(this.visits[this.currentVisitPos])
    }

    isSliderInMiddle() {
        return this.currentVisitPos > this.visits.length / 2 ? true : false;
    }

    loadMenu(type) {
        this.menu = apiService.getMenu(type)
        this.rectDimensions.sectionHeight = this.menuDimensions.height / this.menu.length;
        this.currentSection = this.menu[0];
        // apiService.getMenu(type)
        //     .then(data => {
        //         this.menu = data;
        //         this.notifyObservers({ type: "newMenu", menu: this.menu });

        //     }).catch(error => {
        //         console.log('Get menu error:', error);
        //         this.notifyObservers({ type: "error", menu: this.menu });
        //     });

    }
    /*
    getMenu 
    type :  string with either SITES or VIEWS
    return a object array with the sections for the website
    */
    getMenu(type) {
        return this.menu;
    }

    calculatePack() {
        this.pack = d3.pack()
            .size([this.visDimensions.boundedWidth, this.visDimensions.boundedHeight])
            .padding(30)
            (d3.hierarchy(this.data)
                .sum(hierarchySize)
                .sort(sortBySize))
        return this.pack;
    }



    //add observers to the model
    addObserver(observer) {
        this.observers.push(observer);

    }
    //remove observer from the observers list
    removeObserver(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }
    // USE this function to notify all observers the changes
    notifyObservers(changeDetails) {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i].update(changeDetails);
        }
    }

    getSectionPos() {
        return d3.scaleLinear()
            .rangeRound([0, this.menu.length - 1]);
    }

    isNewMenu(scrollY, windowHeight) {
        const sectionPos = this.getSectionPos()
        const nextSection = this.menu[sectionPos(scrollY / windowHeight)];

        //check if it is a different section
        const isDifferent = this.currentSection.name != nextSection.name;
        //diferent section update and update DATA
        if (isDifferent) {
            this.currentSection = nextSection;
            this.menu = this.menu.map(updateState(this.currentSection.name))
            this.updateDataImage();
            this.notifyObservers({ type: "updateSideMenu" });
        }

    }

    getSitesVisits() {
        const sites = this.data.children
            .filter((site) => site.state == 1)
            .map((site) => site.name)
        apiService.getTimes(sites)
            //strings to int
            .then(visits => visits.map(visit => new Date(parseInt(visit))))
            //set visits and notify
            .then(data => {
                this.visits = data;
                this.notifyObservers({ type: "updateTimeLine" });
            })

    }


    selectDataItem(item) {

        //update the data
        const node = this.data.children.find(findByName(item.data.name))
        node.state = node.state == 0 ? 1 : 0;

        this.calculateDataValues();

        this.notifyObservers({ type: "selectItem" });

    }

    calculateDataValues() {
        const percentageActive = 95;
        const percentageInactive = 100 - percentageActive;
        //get the amount of active
        //get the total
        const activeNodes = this.data.children.filter(filterByState(1)).length
        const activeSize = percentageActive / activeNodes;
        const inactiveSize = percentageInactive / (this.data.children.length - activeNodes)
        this.data.children = this.data.children.map(calculateSize(activeSize, inactiveSize))
    }

    calculateBottomAxis() {
        // Create scale
        const extent = d3.extent(this.visits)
        const scale = d3.scaleLinear()
            .domain(extent)
            .range([0, this.timeLineDimensions.rectDimensions.width]);
        // Add scales to axis 
        const formatHour = date => d3.timeFormat("%H:%M")(date)
        const formatDay = date => d3.timeFormat("%d %a")(date)
        const formatMonth = date => d3.timeFormat("%b")(date)
        const formatYear = date => d3.timeFormat("%Y")(date)
        const axis = d3.axisBottom()
            .scale(scale);

        const everyDay = d3.timeDay.every(7).range(extent[0], extent[1]).length;
        const everyHour = everyDay * 3;//d3.timeHour.every(144).range(extent[0], extent[1]).length;
        const everyMonth = d3.timeMonth.every(3).range(extent[0], extent[1]).length;
        const everyYear = d3.timeYear.every(1).range(extent[0], extent[1]).length;

        return [
            {
                format: formatHour,
                numTicks: everyHour,
                padding: [0],
                axis: axis,
            },
            {
                format: formatDay,
                numTicks: everyDay,
                padding: [-20],
                axis: axis,
            },
            {
                format: formatYear,
                numTicks: everyYear == 0 ? 1 : everyYear,
                padding: [-40],
                axis: axis,
            },
            {
                format: formatMonth,
                numTicks: everyMonth == 0 ? 1 : everyMonth,
                padding: [-30],
                axis: axis,
            },
        ]
    }

    advanceSliderPos() {
        const newPos = this.currentVisitPos + 1;
        this.currentVisitPos = newPos % this.visits.length == 0 ? 0 : newPos;
        this.updateDataImage();
        this.notifyObservers({ type: "updateCurrentVisit" });
        this.notifyObservers({ type: "updateImages" })
    }

    updateDataImage() {
        //if it is the intro skip
        if (this.currentSection == "Intro") return;
        // get time in unix timestamp
        const currentTime = this.visits[this.currentVisitPos].getTime();
        //get current VIEW from MENU
        const menuName = this.currentSection.name.toLowerCase();
        //change the images in the data
        this.data.children = this.data.children.map(site => {
            site.image = this.getApiImage(menuName, site.name, 800, currentTime)
            return site;
        })
    }

    getActiveNodes() {
        return this.pack.descendants()
            .splice(1)
            .filter(node => node.data.state == 1)
    }

    getApiImage(view, site, size, time) {
        switch (view) {
            case 'screenshot':
                return apiService.getSiteScreenshot(site, time, size);
            case 'graph':
                return apiService.getSiteGraph(site, time, size);
            case 'coverage':
                return apiService.getSiteCoverage(site, time, size);
            case 'network':
                return apiService.getSiteNetwork(site, time, size);
            case 'profile':
                return apiService.getSiteProfile(site, time, size);

            default:
                return apiService.getSiteScreenshot(site, time, size);
        }
    }

    calculateSliderPos() {
        const currentDate = this.visits[this.currentVisitPos]//this.visits.length - 1
        const extent = d3.extent(this.visits)
        const scale = d3.scaleLinear()
            .domain(extent)
            .range([0, this.timeLineDimensions.rectDimensions.width]);
        return scale(currentDate);
    }

    setSpeed(pos) {
        this.currentSpeed = pos;
        if (this.playState == true) this.notifyObservers({ type: "updateSpeed" });
    }

    resetSlider() {
        this.currentVisitPos = 0;
        this.currentSpeed = 0;
        this.playState = false;
    }

    //posX is the percentage of the posX with the Width
    updateSliderPos(percentage) {
        const pos = percentage < 0 ? 0 : percentage;
        const scale = d3.scaleLinear()
            .rangeRound([0, this.visits.length - 1]);
        this.currentVisitPos = scale(pos);
        this.updateDataImage();
        this.notifyObservers({ type: "updateCurrentVisit" });
        this.notifyObservers({ type: "updateImages" });

    }

    toggleMenu(toggle = undefined) {
        this.menuVisible = toggle == undefined ? !this.menuVisible : toggle;
        this.notifyObservers({ type: "toggleMenu" });
    }

    hideMenu() {
        this.menuVisible = false;
    }

    setMode(mode) {
        this.mode = mode;
        this.notifyObservers({ type: "toggleMode" });
    }
}