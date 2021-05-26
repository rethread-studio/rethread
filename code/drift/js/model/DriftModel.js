
const apiService = new ApiService();

class DriftModel {

    constructor() {
        this.menu = []; //menu is the list of views or list of sites
        this.data = {} //is the current sites or views to displa in the viz
        this.currentSection = this.menu[0];
        this.observers = [];
    }

    //add observers to the model
    addObserver(observer) {
        this._observers.push(observer);
    }
    //remove observer from the observers list
    removeObserver(observer) {
        return this._boservers.filter(obs => obs !== observer);
    }
    // USE this function to notify all observers the changes
    notifyObservers(changeDetails) {
        for (var i = 0; i < this._observers.length; i++) {
            this._observers[i].update(this, changeDetails);
        }
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
                console.log(this.menu)
                this.notifyObservers({ type: "newMenu", menu: this.menu });

            }).catch(error => {
                console.log('Get menu error:', error);
                this.notifyObservers({ type: "error", menu: this.menu });
            });

    }

}