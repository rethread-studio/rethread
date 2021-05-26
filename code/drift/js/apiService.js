const BASE_URL = "https://drift.durieux.me";
const requestService = new RequestService();

class ApiService {

    //return an array with all the available sites
    getSites() {
        var url = `${BASE_URL}/api/sites`;
        return requestService.getRequest(url)
    }

    getVisitDates(site) {
        var url = `${BASE_URL}/api/site/${site}/visits`;
        return requestService.getRequest(url);
    }


}