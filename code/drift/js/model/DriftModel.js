
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

class DriftModel {

    constructor() {
        this.menu = []; //menu is the list of views or list of sites
        this.data = {} //is the current sites or views to displa in the viz
        this.currentSection = this.menu[0];
        this.observers = [];
        this.visDimensions = {
            width: window.innerWidth,
            height: window.innerHeight,
            margin: {
                top: 50,
                right: 150,
                bottom: 100,
                left: 50
            }
        }
        this.visDimensions.boundedWidth = this.visDimensions.width - this.visDimensions.margin.right - this.visDimensions.margin.left;
        this.visDimensions.boundedHeight = this.visDimensions.height - this.visDimensions.margin.top - this.visDimensions.margin.bottom;
    }

    getVisDimensions() {
        return this.visDimensions;
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

    getData(type) {
        this.data = apiService.getData(type);
    }
    /*
    getMenu 
    type :  string with either SITES or VIEWS
    return a object array with the sections for the website
    */
    getMenu(type) {
        apiService.getMenu(type)
            .then(data => {
                this.menu = data;
                this.notifyObservers({ type: "newMenu", menu: this.menu });

            }).catch(error => {
                console.log('Get menu error:', error);
                this.notifyObservers({ type: "error", menu: this.menu });
            });

    }

    getPack() {
        return d3.pack()
            .size([this.visDimensions.boundedWidth, this.visDimensions.boundedHeight])
            .padding(10)
            (d3.hierarchy(this.data)
                .sum(hierarchySize)
                .sort(sortBySize))
    }


    selectDataItem(item) {

        //update the data
        const node = this.data.children.find(findByName(item.data.name))
        node.state = node.state == 0 ? 1 : 0;


        const percentageActive = 95;
        const percentageInactive = 100 - percentageActive;

        //get the amount of active
        //get the total
        const activeNodes = this.data.children.filter(filterByState(1)).length
        const activeSize = percentageActive / activeNodes;
        const inactiveSize = percentageInactive / (this.data.children.length - activeNodes)
        this.data.children = this.data.children.map(calculateSize(activeSize, inactiveSize))

        this.notifyObservers({ type: "selectItem" });
        //alert 
        // updateWebSites(data)
    }

}