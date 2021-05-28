
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
    }

    init() {
        this.getData();
        this.loadMenu("views");
        this.getSitesVisits()

    }

    getRectDimensions() {
        return this.rectDimensions;
    }

    getSideMenudimensions() {
        return this.menuDimensions;
    }

    getVisDimensions() {
        return this.visDimensions;
    }

    getData(type) {
        apiService.getData(type)
            .then(data => data.map((site, i) => {
                return {
                    name: site,
                    state: i == 0 ? 1 : 0,
                    value: 0,
                    image: "imgTest.png",
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
        return d3.pack()
            .size([this.visDimensions.boundedWidth, this.visDimensions.boundedHeight])
            .padding(10)
            (d3.hierarchy(this.data)
                .sum(hierarchySize)
                .sort(sortBySize))
    }



    //add observers to the model
    addObserver(observer) {
        this.observers.push(observer);
    }
    //remove observer from the observers list
    removeObserver(observer) {
        return this._boservers.filter(obs => obs !== observer);
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
            this.notifyObservers({ type: "updateSideMenu" });
        }

    }

    getSitesVisits() {
        const sites = this.data.children
            .filter((site) => site.state == 1)
            .map((site) => site.name)
        apiService.getVisitDates(sites)
            .then(data => {
                this.visits = d3.merge(data)
                    .sort((a, b) => a - b)
                this.notifyObservers({ type: "updateVisits" });
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

}