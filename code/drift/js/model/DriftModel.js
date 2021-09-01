
import { apiService, currentView } from '../app.js'
import { dataTest, mainMenu } from '../apiService.js';
import { formatMonth, formatDay, formatHour } from '../helpers.js';
import ImageSequence from './imageSequence.js'

//HELPERS
const hierarchySize = (d) => d.value;
const sortBySize = (a, b) => hierarchySize(b) - hierarchySize(a);
const findByName = (name) => (d) => d.name == name;
const filterByState = (state) => (d) => d.state == state
const calculateSize = (active, inactive) => (d) => {
    d.value = d.state == 0 ? inactive : active;
    return d;
}
const splitString = (n) => {
    let arr = n.split(" ")
    arr.splice(1, 0, `<br class="hidden sm:block">`)
    arr = arr.join(" ")
    return arr
}
//update the state of the menu item 
const updateState = (_name) => {
    return (d) => {
        d.state = d.name == _name ? 1 : 0;
        return d;
    }
}

const updateDataState = (_name, _state) => {
    return (i) => {
        if (i.name == _name) i.state = _state;
        return i;
    }
}

export default class DriftModel {

    constructor() {
        this.interaction = window.interaction;
        this.menu = []; //menu is the list of views or list of sites
        this.data = dataTest //is the current sites or views to display in the viz
        this.firstItemSelected = dataTest.children[0].name;
        this.voteWebsites = []; // the list of website that can be visited by the robot
        this.currentSection = this.menu[0];
        this.observers = [];
        this.layerSpeed = 4000;
        this.visDimensions = {
            width: window.innerWidth,
            height: window.innerHeight,
            margin: {
                top: 0,
                right: 150,
                bottom: 100,
                left: 0
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
            width: window.innerWidth,
            height: 85,
            margin: {
                top: 0,
                right: 40,
                bottom: 0,
                left: 20
            },
            rectDimensions: {
                height: 25,
                width: window.innerWidth,
            },
            sliderDimensions: {
                height: 50,
                width: 2,
            },
            tickDimensions: {
                height: 15,
                width: 2,
            }

        }
        this.timeLineDimensions.boundedWidth = this.timeLineDimensions.width - this.timeLineDimensions.margin.left - this.timeLineDimensions.margin.right;
        this.timeLineDimensions.boundedHeight = this.timeLineDimensions.height - this.timeLineDimensions.margin.top - this.timeLineDimensions.margin.bottom;

        this.currentVisit = 0;
        this.baseSpeed = 1000;
        this.currentSpeed = 0;
        this.playState = false;

        this.sliderSpeed = [
            {
                text: "Normal",
                speed: this.baseSpeed / 9
            },
            {
                text: "Ludicrous",
                speed: this.baseSpeed / 14
            },

        ]
        this.pack;

        this.menuVisible = false;
        this.mode = false;
        this.mainMenu = mainMenu;
        this.chatvisible = false;
        this.stack = true;
        this.stackDisabled = true;
        this.timeInterval = null;
        this.layerStepInterval = null;
        this.intervalHandler = this.advanceSliderPos.bind(this);
        this.layerIntervalHandler = this.stepView.bind(this);
        this.keyEventHandler = this.keyEvent.bind(this);

        this.viewModeBtn = false;

        this.imageSequence;
    }

    async init() {
        await this.getData();
        this.loadMenu("views");
        await this.getSitesVisits();
        await this.getVoteWebsites();
    }

    getViewMode() {
        return this.viewModeBtn;
    }

    toggleViewModeBtn(view = undefined) {
        this.viewModeBtn = view == undefined ? !this.viewModeBtn : view;
    }

    getStack() {
        return this.stack;
    }

    getcurrentSection() {
        this.currentSection;
    }

    getChatVisible() {
        return this.chatvisible;
    }

    getMainMenu(splitName = true) {
        const val = "human";
        return this.mainMenu.map(i => {
            let name = i[val];
            let arr = splitName ? splitString(name) : [];
            return {
                name: splitName ? arr : name,
                value: i.value,
            }
        })
    }

    getMode() {
        return this.mode;
    }

    getModeText() {
        return !this.mode ? 'human' : 'nerd';
    }

    getMenuVisible() {
        return this.menuVisible;
    }

    getModeAccessor() {
        const humanAccessor = (d) => d.human;
        const nerdAccessor = (d) => d.nerd;
        return this.mode ? humanAccessor : nerdAccessor;
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

    getChangePlayState(play = null) {
        this.playState = play != null ? play : !this.playState;
        const type = this.playState ? "playTimeLine" : "pauseTimeLine"
        type == "playTimeLine" ? this.setTimeInterval() : this.removeTimeInterval();
        this.notifyObservers({ type: type });
    }

    setSpeed(pos) {
        this.currentSpeed = pos;
        if (this.playState) {
            this.removeTimeInterval();
            this.setTimeInterval()
        }
    }

    addKeyEventListener() {
        document.addEventListener('keydown', this.keyEventHandler)
    }

    removeKeyEventListener() {

        document.removeEventListener('keydown', this.keyEventHandler)

    }

    setTimeInterval() {
        if (this.timeInterval != null) return;
        const speed = this.getCurrentSpeed()
        this.timeInterval = window.setInterval(this.intervalHandler, speed)
    }

    removeTimeInterval() {
        if (this.timeInterval != null && this.timeInterval != undefined) clearInterval(this.timeInterval);
        this.timeInterval = null;
    }

    setLayerStepInterval() {
        if (this.layerStepInterval != null) return;
        const speed = this.layerSpeed;
        this.layerStepInterval = window.setInterval(this.layerIntervalHandler, speed)
    }

    removeLayerStepInterval() {
        if (this.layerStepInterval != null && this.layerStepInterval != undefined) clearInterval(this.layerStepInterval);
        this.layerStepInterval = null;
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

        return apiService.getData(type)
            .then(data => data.map((site, i) => {
                return {
                    name: site,
                    state: site == "qwant" ? 1 : 0,
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
                this.firstItemSelected = this.data.children.find(s => s.state == 1).name
                this.calculateDataValues();
                this.notifyObservers({ type: "updateData" });
            })

    }

    getCurrentTime(format = true) {
        return format ? d3.timeFormat("%b %d %a %H:%M")(this.visits[this.currentVisit]) : this.visits[this.currentVisit];
    }

    updateTimelineDimensions() {
        this.timeLineDimensions = {
            width: window.innerWidth,
            height: 85,
            margin: {
                top: 0,
                right: 40,
                bottom: 0,
                left: 20
            },
            rectDimensions: {
                height: 25,
                width: window.innerWidth,
            },
            sliderDimensions: {
                height: 50,
                width: 2,
            },
            tickDimensions: {
                height: 15,
                width: 2,
            }

        }
        this.timeLineDimensions.boundedWidth = this.timeLineDimensions.width - this.timeLineDimensions.margin.left - this.timeLineDimensions.margin.right;
        this.timeLineDimensions.boundedHeight = this.timeLineDimensions.height - this.timeLineDimensions.margin.top - this.timeLineDimensions.margin.bottom;

    }


    isSliderInMiddle(pos = null) {
        const pCompare = pos == null ? this.currentVisit : pos;
        return pCompare > this.visits.length / 2 ? true : false;
    }

    loadMenu(type) {
        this.menu = apiService.getMenu(type)
        this.rectDimensions.sectionHeight = this.menuDimensions.height / this.menu.length;
        this.currentSection = this.menu[0];
    }
    /*
    getMenu 
    type :  string with either SITES or VIEWS
    return a object array with the sections for the website
    */
    getMenu() {
        return this.menu;
    }

    getActiveMenuItems() {
        return this.menu.filter(i => i.state == 1)
            .map(i => i.value)
    }

    getDataChildren() {
        return this.data.children//.sort((a, b) => b.name > a.name ? -1 : b.name < a.name ? 1 : 0);
    }

    calculatePack() {
        const data = {
            children: this.data.children.filter(filterByState(1))
        }
        const activeNum = data.children.length;
        data.children = data.children.map((n) => {
            n.value = 100 / activeNum;
            return n
        })

        this.pack = d3.treemap()
            .tile(d3.treemapBinary)
            .size([this.visDimensions.boundedWidth, this.visDimensions.boundedHeight])
            .padding(30)
            .round(true)
            (d3.hierarchy(data)
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
            this.notifyObservers({ type: "updateSideMenu" });
            this.notifyObservers({ type: "updateImages" });
        }

    }

    async getSitesVisits() {
        const sites = this.data.children
            .filter((site) => site.state == 1)
            .map((site) => site.name)
        await apiService.getTimes(sites)
            //strings to int
            .then(visits => visits.map(visit => parseInt(visit)))
            .then(visits => visits.filter(visit => visit > 1619820000000)) // filter out early visits
            .then(visits => visits.map(visit => new Date(visit)))
            //set visits and notify
            .then(data => {
                this.visits = data;
                const sitesName = dataTest.children.map(s => {
                    return {
                        name: s.name,
                        active: s.state
                    }
                });
                const views = this.menu.map(v => v.value)
                this.imageSequence = new ImageSequence(data, sitesName, views)
                this.imageSequence.step();
                this.notifyObservers({ type: "updateTimeLine" });
            })
    }

    getVoteWebsites() {
        return apiService.getVoteWebsites()
            //strings to int
            .then(websites => {
                this.voteWebsites = websites
            })
    }


    selectDataItem(item) {

        //update the data
        const node = this.data.children.find(findByName(item.data.name))
        node.state = node.state == 0 ? 1 : 0;

        this.calculateDataValues();

        this.notifyObservers({ type: "selectItem" });

    }

    selectView(viewVal) {
        if (viewVal == "screenshot") return;

        this.menu = this.menu.map(e => {
            if (e.value == "screenshot") return e;
            e.state = e.value == viewVal ? e.state == 1 ? 0 : 1 : 0;
            return e;
        })
        if (this.layerStepInterval != null && this.layerStepInterval != undefined) this.removeLayerStepInterval()

        this.notifyObservers({ type: "updateViewSideMenu" });
        this.notifyObservers({ type: "updateImages" });

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

    getDateFormated(index = 0) {
        const date = this.visits[index];
        return date == undefined ? "" : d3.timeFormat("%d %b %Y")(date)
    }

    getLastDateFormated() {
        const date = this.visits[this.visits.length - 1];
        return date == undefined ? "" : d3.timeFormat("%d %b %Y")(date)
    }



    advanceSliderPos(direction = 1) {
        let newPos = 0;
        if (direction == 1) {
            newPos = this.currentVisit + 1;
        } else {
            newPos = this.currentVisit - 1 < 0 ? 0 : this.currentVisit - 1;
        }
        //check if it reached the limit and pause it
        if (newPos >= this.visits.length - 1) this.getChangePlayState(false);
        //advance only if next position is loaded
        if (this.imageSequence.isStepLoaded(newPos) == false) return;

        this.currentVisit = newPos;
        //Check stepping backwards 

        //if next position loaded update

        //UPLOAD RANGE
        this.updateSequenceLoaderPos()
        //ask for the image 
        this.notifyObservers({ type: "updateCurrentVisit" });
        this.notifyObservers({ type: "updateImages" })
    }

    // change the layer to view on each step
    stepView(direction = 1) {
        const currentPos = this.menu.findIndex(v => v.value !== "screenshot" && v.state == 1);
        let nextStep = 0;
        if (direction == 1) {
            nextStep = currentPos + 1 > this.menu.length - 1 ? 1 : currentPos + 1;
        } else {
            nextStep = currentPos - 1 < 1 ? this.menu.length - 1 : currentPos - 1;
        }
        this.menu = this.menu.map((v, i) => {
            v.state = i == currentPos ? 0 : i == nextStep ? 1 : i == 0 ? 1 : 0;
            return v;
        })
        this.notifyObservers({ type: "updateViewSideMenu" });
        this.notifyObservers({ type: "updateImages" })
    }

    keyEvent(event) {
        const keyName = event.key;
        switch (keyName) {

            case 'Right':
            case 'ArrowRight':
                this.advanceSliderPos()
                break;
            case 'Left':
            case 'ArrowLeft':
                this.advanceSliderPos(-1)
                break;
            case 'Up':
            case 'ArrowUp':
                this.stepView(-1)
                break;
            case 'Down':
            case 'ArrowDown':
                this.stepView(1)
                break;
            case ' ':
                this.getChangePlayState();
                break;

            default:
                break;
        }
        // Cancel the default action to avoid it being handled twice
        // event.preventDefault();
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

    getImagesFromSite() {
        //get images at current pos from image sequence
        const activeItems = this.menu.findIndex(e => e.state == 1);
        let images = [...this.imageSequence.getImagesInPos(this.currentVisit, activeItems)]
        images = images == null ? this.imageSequence.getBackUpImages() : images;
        //SORT IMAGES ACCORDING TO MENU
        return images;
    }

    getSitesImages() {
        const activeItems = this.getActiveMenuItems();
        const sitesImg = this.imageSequence.getSitesImagesInPos(this.currentVisit, activeItems)
        //filter only the selected views
        sitesImg.forEach(s => {
            s.images = s.images.filter(i => activeItems.includes(i.type))
        });
        return [...sitesImg]
    }

    getNumActiveSites() {
        return this.data.children.filter(e => e.state == 1).length;
    }

    getScreenShotFromSite() {
        let images = this.imageSequence.getScreenShotInPos(this.currentVisit)
        images = images == null ? this.imageSequence.getBackUpImages() : images;
        return images;
    }

    calculateSliderPos(pos = null) {
        const percent = (pos == null ? this.currentVisit : pos) / this.visits.length;
        const scale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.timeLineDimensions.boundedWidth]);
        return scale(percent);
    }



    resetSlider() {
        this.currentVisit = 0;
        this.currentSpeed = 0;
        this.playState = false;
    }

    //posX is the percentage of the posX with the Width
    updateSliderPos(percentage) {
        const pos = percentage < 0 ? 0 : percentage;
        const scale = d3.scaleLinear()
            .rangeRound([0, this.visits.length - 1]);
        this.currentVisit = scale(pos);
        this.updateSequenceLoaderPos()
        this.notifyObservers({ type: "updateCurrentVisit" });
        this.notifyObservers({ type: "updateImages" });
    }

    updateSequenceLoaderPos() {
        this.imageSequence.setRange(this.currentVisit);
    }

    //posX is the percentage of the posX with the Width
    getDatebyPosX(percentage) {

        const pos = percentage < 0 ? 0 : percentage;
        const scale = d3.scaleLinear()
            .rangeRound([0, this.visits.length - 1]);
        return scale(pos);
    }

    getDateByPos(pos) {
        return this.visits[pos];
    }

    formatDateString(date) {
        return `${formatMonth(date)} ${formatDay(date)} ${formatHour(date)} `
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
        this.notifyObservers({ type: "changeMode" });
    }

    toggleChatVisible(visible = null) {
        this.chatvisible = visible != null ? visible : !this.chatvisible;
        this.notifyObservers({ type: "toggleChat" });
    }

    selectSite(name) {

        const activeItems = this.data.children.filter(i => i.state == 1);
        const activeNames = activeItems.map(i => i.name)
        if (activeItems.length == 1 && activeItems[0].name == name) {
            this.notifyObservers({ type: "sitesUpdated" });
            return;
        } else if (activeItems.length == 2 && !activeNames.includes(name)) {
            //change the state of the last one
            this.data.children.map(updateDataState(this.firstItemSelected, 0))
            //change the last one to the new active
            this.firstItemSelected = activeItems.filter((i) => i.name != this.firstItemSelected)[0].name;
        } else if (activeItems.length == 2 && activeNames.includes(name)) {
            this.firstItemSelected = activeItems.filter((i) => i.name != name)[0].name;
        }

        //update the item that matches the name
        this.data.children = this.data.children.map(i => {
            if (i.name == name) i.state = i.state == 1 ? 0 : 1;
            return i;
        })
        // .sort((a, b) => b.name > a.name)

        this.updateSequenceSites();
        this.notifyObservers({ type: "sitesUpdated" });
        this.notifyObservers({ type: "updateImages" });
    }

    selectFirstSite() {
        this.data.children = this.data.children.map((item, i) => {
            item.state = i == 0 ? 1 : 0;
            return item;
        })
        // .sort((a, b) => b.name > a.name)

        this.firstItemSelected = this.data.children[0].name;
        this.updateSequenceSites();
        this.notifyObservers({ type: "sitesUpdated" });
        this.notifyObservers({ type: "updateImages" });
    }

    selectSiteByName(name) {
        this.data.children = this.data.children.map((item, i) => {
            if (item.name == name) this.firstItemSelected = item.name;
            item.state = item.name == name ? 1 : 0;
            return item;
        })
        // .sort((a, b) => b.name > a.name)

        this.updateSequenceSites();
        this.notifyObservers({ type: "sitesUpdated" });
        this.notifyObservers({ type: "updateImages" });
    }

    selectRadialSite(name) {
        this.data.children = this.data.children
            .map(i => {
                i.state = i.name == name ? 1 : 0;
                return i;
            })
        // .sort((a, b) => b.name > a.name)
        this.firstItemSelected = this.data.children.find(i => i.state == 1).name;
        this.updateSequenceSites();
        this.notifyObservers({ type: "sitesUpdated" });
        this.notifyObservers({ type: "updateImages" });
    }
    cleanSites() {
        let active = 0;
        this.data.children = this.data.children.map(e => {
            e.state = active == 0 && e.state == 1 ? 1 : 0;
            active += active == 0 && e.state == 1 ? 1 : 0;
            return e;
        })
        this.updateSequenceSites();
        this.notifyObservers({ type: "sitesUpdated" });
    }


    updateSequenceSites() {
        const activeSites = this.data.children.filter(s => s.state == 1)
            .map(s => s.name)
        this.imageSequence.activateOrDeactivateSite(activeSites, 1);
    }

    toggleDisplay(spread = null) {
        this.stack = spread == null ? !this.stack : spread;
        this.stack ? this.cleanSites() : "";
        this.notifyObservers({ type: "displayUpdate" });
    }

    toggleNoNotification(toggleTo) {
        this.stack = toggleTo;
        // this.notifyObservers({ type: "updateToggle" });
    }

    getStackDisabled() {
        return this.stackDisabled;
    }

    setStackDisabled(disabled) {
        this.stackDisabled = disabled
    }

    updateURL(url, title) {
        window.history.pushState(null, title || window.document.title, url)
    }

    getScreenSize() {
        return Math.max(document.documentElement.clientWidth, window.innerWidth);
    }

}