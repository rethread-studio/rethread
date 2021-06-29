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
    }



    loadImage(url, type, callback) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.addEventListener('load', () => {
                callback()
                resolve({
                    img: img,
                    source: url
                })
            })
            img.addEventListener('error', (err) => {
                callback()
                resolve({
                    img: img,
                    source: `backup${type.charAt(0).toUpperCase() + type.slice(1)}`
                })
            });
            img.src = url;
        });
    }

    loadImages() {
        this.images = this.views.map(view => {
            return {
                url: getApiImage(view, this.site, 800, this.visit.getTime()),
                view: view
            }
        })
            .map(image => this.loadImage(image.url, image.view, this.loadHandler));
    }

    getImages() {
        return this.images;
    }

    getLoaded() {
        return this.loaded;
    }

    setLoaded(val) {
        this.loaded = val;
    }

    imageLoaded() {
        this.imagesLoaded++;
        if (this.imagesLoaded == this.images.length) {
            this.loaded = true;
        }
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

    getTotalImages() {
        //return num of all images
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

    posLoaded(pos) {
        return this.viewsImages[pos].isLoaded();
    }
}


class ImageSequence {
    constructor(visits, sites, views) {
        this.visitsLength = visits.length - 1;
        this.sites = sites.map(s => new SiteImages(s.name, visits, s.active, views));
        this.range = {
            min: 0,
            max: 20,
        }
        this.amount = 20;
        this.loadPos = 0;
    }

    setRange(pos) {
        this.loadPos = pos;
        this.range = {
            min: pos,
            max: Math.min((pos + 20), this.visitsLength)
        }
        this.step();
    }

    step() {
        //if it is already loaded then skip to next
        if (this.isStepLoaded(this.loadPos)) this.checkStep();
        const sites = this.getActiveSites();
        let imagePromises = [];
        sites.forEach(s => {
            imagePromises = [...imagePromises, s.loadImagesPos(this.loadPos)]
        })
        Promise.all(imagePromises).then((values) => {
            //update site group as loaded
            this.siteChangeLoadStatus(this.loadPos, true)
            //check if there is a next step
            this.checkStep()
        });

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

    getImagesInPos(pos) {
        //check if all images are loaded
        let activeSites = this.getActiveSites()
        if (!imagesLoadedAtPos(activeSites, pos)) return null;
        //return all the websites with their images from that date
        //if it is not loaded then return null
    }

    getActiveSites() {
        return this.sites.filter(s => s.active);
    }

    imagesLoadedAtPos(activeSites, pos) {
        return activeSites.every(e => e.posLoaded(pos))
    }
}

export default ImageSequence;