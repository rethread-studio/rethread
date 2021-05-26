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

    getMenu(type) {
        return type == "views" ? viewsMenu : sitesMenu;
    }

    getData(type) {
        return dataTest;
    }


}




const dataTest = {
    value: 0,
    children: [
        {
            name: "bing",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.bing.png",

        },
        {
            name: "duckduckgo",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.duck.png",

        },
        {
            name: "google",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.google.png",

        },
        {
            name: "qwant",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.qwant.png",

        },
        {
            name: "spotify",
            state: 1,
            value: 90,
            image: "imgTest.png",
            logo: "logo.spotify.png",

        },
        {
            name: "wikipedia",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.wiki.png",

        },
        {
            name: "yahoo",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.yahoo.png",

        },
        {
            name: "kiddle",
            state: 0,
            value: 1.25,
            image: "imgTest.png",
            logo: "logo.kiddle.png",

        },
    ]
}
const viewsMenu = [{
    name: "Intro",
    state: 1,
},
{
    name: "Screenshot",
    state: 0,
},
{
    name: "Coverage",
    state: 0,
},
{
    name: "Profile",
    state: 0
},
{
    name: "Network",
    state: 0
}
]

const sitesMenu = [{
    name: "Intro",
    state: 1,
},
{
    name: "Bing",
    state: 0,
},
{
    name: "Duckduckgo",
    state: 0,
},
{
    name: "Google",
    state: 0
},
{
    name: "Kiddle",
    state: 0
},
{
    name: "Qwant",
    state: 0
},
{
    name: "Spotify",
    state: 0
},
{
    name: "Wikipedia",
    state: 0
},
{
    name: "Yahoo",
    state: 0
}
]
