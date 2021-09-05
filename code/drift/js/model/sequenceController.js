import { apiService } from '../app.js'

const getApiImage = (view, site, size, time) => {
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

const getImageBackup = (view) => {
    return `./img/backup${view.charAt(0).toUpperCase() + view.slice(1)}.jpg`;
}


class SequenceController {

    //dates : sequence of dates to load the images
    constructor(total_steps) {
        this.imagesArr = Array.apply(null, Array(total_steps))
    }


    //active views can be one or more
    //active sites can be one or more
    selectGroupDates(dates, activeViews, activeSites, notify = false, callBack = null) {
        // console.log(this.imagesArr.length, this.imagesArr, dates, activeViews)
        //load the dates in the images
        this.imagesArr.forEach((e, i) => {
            this.imagesArr[i] = dates[i] != null && dates[i] != undefined ? new imageGroup(dates[i], activeViews, activeSites) : null;
        })
        this.loadImages(notify, callBack);
    }

    loadImages(makeCall = false, callBack) {
        //get all the images whose status is IDDLE
        const toLoadArr = this.getAllImages()
            .filter(i => i.status == IDDLE)
            .map(i => {
                i.status = LOADING;
                return i;
            })
            .map(i => new Promise((resolve) => {
                if (this.status == LOADED) {
                    return resolve();
                }
                i.img.addEventListener('load', resolve);
                i.img.addEventListener('error', resolve)
            }))
        //Create a promise all and load them
        Promise.all(toLoadArr)
            .then(d => {
                //CALL THE CALLBACK TO NOTIFY IS LOADED
                if (makeCall) {
                    callBack({ type: "reRender" });
                    callBack({ type: "sitesUpdated" });
                    callBack({ type: "updateImages" });

                }

            })
            .catch(error => {
                console.error(error.message)
            });
    }

    getAllImages() {
        let images = [];
        this.imagesArr.forEach(s => {
            images = [...images, ...s.getImages()]
        })

        return images
    }

    //add new date to the array  at the end
    //remove the first and delete all the objects
    step(nextDate, activeViews, activeSites) {
        //if NEXT STEP is not loaded then make it wait or return 
        // console.log("ORIGINAL", this.imagesArr)
        const tmp = [...this.imagesArr];
        tmp.shift();
        tmp.push(new imageGroup(nextDate, activeViews, activeSites))
        this.imagesArr = tmp;
        this.loadImages();
    }

    //check if current step is loaded
    isStepLoaded(nextPos = 1) {
        const imageGroup = this.imagesArr[nextPos].getImages();
        return imageGroup.every(s => s.isPosLoaded() == true)
    }

    //get all the images in a given position
    getImagesInPos(pos = 0) {
        return this.imagesArr[pos].getImages();
    }

    //get all the images from a specific site
    getSitesImagesInPos(pos = 0, site) {
        return this.imagesArr[pos].getImagesFromSite(site)
    }

    getScreenShotInPos(pos) {
        return this.imagesArr[pos].getScreenShotView()
    }

    deActivateSites(sites, status) {
        this.imagesArr = this.imagesArr.map(g => g.removeSites(sites))
    }


}

class imageGroup {

    constructor(dates, views, sites) {
        //get images
        this.sites = sites;
        this.images = this.setImages(dates, views, sites)
    }

    removeSites(sites) {
        this.images = this.images.filter(i => sites.include(i.getSite()) == false)
        return this;
    }

    setImages(dates, views, sites) {
        let imagesArr = [];
        sites.forEach(s => {
            views.forEach(v => {
                imagesArr = [...imagesArr, new SimpleImage(v, dates, s)]
            })
        })

        return imagesArr;
    }

    getImages() {
        return this.images;
    }

    getImagesFromSite(site) {
        return this.images.filter(i => i.site == site)
    }

    getScreenShotView() {
        return this.images.filter(i => i.view == "SCREENSHOT")
    }
}


const IDDLE = 0;
const LOADING = 1;
const LOADED = 2;
const ERROR = 3;

class SimpleImage {
    constructor(view, date, site) {
        this.view = view;
        // this.type = view;
        this.status = IDDLE;
        this.site = site;
        this.date = date;
        this.url = getApiImage(view, site, 800, date);
        this.backUp = getImageBackup(view)
        // this.src = ;
        this.img = this.createImage(this.url)

    }

    getSite() {
        return this.site
    }

    createImage(url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.addEventListener('load', () => {
            this.status = LOADED;
        })
        img.addEventListener('error', (err) => {
            this.status = LOADED;
            img.src = this.backUp;
            this.url = this.backUp;
        });
        img.src = url;

        return img;
    }

    isPosLoaded() {
        return this.status == LOADED;
    }
}


export default SequenceController;