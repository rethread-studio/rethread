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



class ImageGroup {

    constructor(visit, views, site) {
        this.site = site;
        this.visit = visit;
        this.images = [];
        this.views = views;
        this.loaded = false;
        this.imagesLoaded = 0;
        this.loadHandler = this.imageLoaded.bind(this);
        this.urls = [];
        this.initUrls();
    }

    initUrls() {
        this.urls = this.views.map(view => {
            return {
                type: view,
                url: getApiImage(view, this.site, 300, this.visit.getTime())
            }
        })
    }

    getUrls() {
        return this.urls;
    }

    loadImage(image, callback) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        image.img = img;
        image.type = image.view;
        img.addEventListener('load', () => {
            callback(image.url, image.view)
            image.imgGroup = this;
        })
        img.addEventListener('error', (err) => {
            const backup = `./img/backup${image.view.charAt(0).toUpperCase() + image.view.slice(1)}.jpg`;
            callback(backup, image.view)
            image.imgGroup = this;
            image.url = backup;
            img.src = backup;
        });
        img.src = image.url;
        return image
    }

    loadImages() {
        // dont load when the images are already loaded
        if (this.images.length > 0) return;
        this.images = this.views.map(view => {
            return {
                site: this.site,
                url: getApiImage(view, this.site, 300, this.visit.getTime()),
                view: view
            }
        })
            .map(image => this.loadImage(image, this.loadHandler));
    }

    getImages() {
        return this.images;
    }

    getActiveImages(imageList) {
        return this.images.filter(e => imageList.includes(e.view));
    }

    getImagesSolved() {
        console.log(this.images)
        return this.images
    }

    getLoaded() {
        return this.loaded;
    }

    setLoaded(val) {
        this.loaded = val;
    }

    imageLoaded(url, type) {
        this.imagesLoaded++;
        if (this.imagesLoaded >= this.images.length) {
            this.loaded = true;
        }
        const image = this.urls.find(u => u.type == type)
        image.url = url;
    }

}


class SiteImages {

    constructor(name, visits, active, views) {
        this.name = name;
        this.viewsImages = visits.map(v => new ImageGroup(v, views, this.name)); //has all the images
        this.isLoaded = false;
        this.active = active;
    }

    setGroupAsLoaded(pos, val) {
        this.viewsImages[pos].setLoaded(val);
    }

    getImagesVisit(visit) {
        return this.images.find(s => s.visit == visit);
    }

    getIsLoaded() {
        return this.isLoaded;
    }

    getName() {
        return this.name;
    }

    isPosLoaded(pos) {
        if (this.viewsImages[pos] == undefined) return false;
        return this.viewsImages[pos].getLoaded();
    }

    loadImagesPos(pos) {
        //if it is undefined error?
        this.viewsImages[pos].loadImages();
        return this.viewsImages[pos].getImages();
    }

    getImagesFromPos(pos) {
        return this.viewsImages[pos].getUrls();
    }

    getScreenShotFromPos(pos) {
        return this.viewsImages[pos].getUrls().find(s => s.type == "screenshot")
    }

    posLoaded(pos) {
        return this.viewsImages[pos].getLoaded();
    }
}


class ImageSequence {
    constructor(visits, sites, views) {
        this.visitsLength = visits.length - 1;
        this.NUMCALLS = 7
        this.sites = sites.map(s => new SiteImages(s.name, visits, s.active, views));
        this.range = {
            min: 0,
            max: this.NUMCALLS,
        }
        this.amount = this.NUMCALLS;
        this.loadPos = 0;
    }

    setRange(pos) {
        this.loadPos = pos;
        this.range = {
            min: pos,
            max: Math.min((pos + this.NUMCALLS), this.visitsLength)
        }
        this.step();
    }

    step() {
        //if it is already loaded then skip to next
        if (this.isStepLoaded(this.loadPos)) return this.checkStep();
        const sites = this.getActiveSites();
        let imagePromises = [];
        sites.forEach(s => {
            imagePromises = [...imagePromises, ...s.loadImagesPos(this.loadPos)]
        })
        Promise.all(imagePromises.map(i => new Promise((resolve) => { if (i.imgGroup) return resolve(); i.img.addEventListener('load', resolve); i.img.addEventListener('error', resolve) })))
            .then((value) => {
                //update site group as loaded
                this.siteChangeLoadStatus(this.loadPos, true)
                //check if there is a next step
                this.checkStep()
            })
        // .catch(error => {
        //     // console.error(error.message)
        // });

    }



    checkStep() {
        const nextStep = this.loadPos + 1;
        if (nextStep < this.range.max) {
            this.loadPos = nextStep;
            this.step()
        }
    }

    siteChangeLoadStatus(pos, val) {
        const sites = this.getActiveSites();
        sites.forEach(s => {
            s.setGroupAsLoaded(pos, val)
        })
    }


    isStepLoaded(newPos) {
        const activeSites = this.getActiveSites();
        return activeSites.every(s => s.isPosLoaded(newPos) == true)
    }

    //siteList string array with the names of active sites
    activateOrDeactivateSite(siteList, status) {
        //update active state
        this.sites = this.sites.map(s => {
            s.active = siteList.includes(s.getName()) ? status : 0;
            return s;
        })
        //load everything from start
        this.loadPos = this.range.min;
        this.step();
    }

    getAverage() {
        //return average loaded
        let loaded = 0;
        let total = 0;
        this.sites.forEach(s => {
            //get s
        });
        return average / total;
    }

    getScreenShotInPos(pos) {
        const activeSite = this.getActiveSites()[0];
        const image = activeSite.getScreenShotFromPos(pos);
        return image;
    }

    getImagesInPos(pos, activeIndex) {
        //check if all images are loaded
        let activeSites = this.getActiveSites()
        // if (!this.imagesLoadedAtPos(activeSites, pos)) return null;
        let images = [];
        activeSites.forEach(s => {
            const d = s.loadImagesPos(pos)
            images = [...images, ...d]
        })

        images = this.sortByIndex(images, activeIndex)

        return images;
        //return all the websites with their images from that date
        //if it is not loaded then return null
    }

    getSitesImagesInPos(pos, activeItems) {
        //check if all images are loaded
        return this.getActiveSites().map(s => {
            //get images
            let images = s.loadImagesPos(pos);
            return {
                images: images,
                name: s.name
            }
        })
    }



    sortByIndex(images, activeIndex) {
        if (activeIndex > 0) {
            const removed = images.splice(0, activeIndex)
            images = [...images, ...removed]
            return images;
        }
        return images;
    }

    getActiveSites() {
        return this.sites.filter(s => s.active);
    }

    imagesLoadedAtPos(activeSites, pos) {
        return activeSites.every(e => e.posLoaded(pos))
    }


}

export default ImageSequence;