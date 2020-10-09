const package = {
    activeTab: true,

    //Type of event can be completed, initiated
    event: 'request_completed',
    request: {
        //the id is related to the event, you can identify who it belongs to
        frameId: 5424,
        fromCache: false,
        //The url who sends it
        initiator: 'https://docs.google.com',
        ip: '216.58.211.14',
        //Type of method GET or POST
        method: 'GET',
        parentFrameId: 5423,
        requestId: '198510',
        responseHeaders: [
            [Object], [Object],
            [Object], [Object],
            [Object], [Object],
            [Object], [Object],
            [Object], [Object],
            [Object], [Object]
        ],
        statusCode: 200,
        statusLine: 'HTTP/1.1 200',
        tabId: -1,
        //guess this is the time it was created
        timeStamp: 1600802378480.313,
        type: 'sub_frame',
        //URL that was used
        url: 'https://docs.google.com/offline/taskiframe?ouid=ud4b16b7d16ad0109',
        hostname: 'docs.google.com',
        //Service...ummm
        services: ['Google'],
        //ALL info related to the location
        location: {
            range: [Array],
            country: 'US',
            region: 'CA',
            eu: '0',
            timezone: 'America/Los_Angeles',
            city: 'Mountain View',
            ll: [Array],
            metro: 807,
            area: 1000
        }
    }
}

const options = {

    length: 400,
    fov: 90,

    installation: false,

    colors: {
        url: 0xee4035,
        service: 0x0a0a0a,
        package: 0x000000,
    },

    lightHelpers: true,
    angleStep: 30,

    countries: {
        color: 0xFFFFFF,
        transparent: false,
        opacityBaseLevel: 0.5
    }
}

const services = [
    {
        name: 'apple',
        id: 123,
    },
    {
        name: 'google',
        id: 12,
    },
    {
        name: 'amazon',
        id: 4,
    },
    {
        name: 'devour',
        id: 5,
    }, {
        name: 'alder',
        id: 6,
    }
]
let posS = 0;
function getService() {
    posS = posS + 1 >= services.length ? 0 : posS + 1;
    return services[posS]
}


const containerViz = document.getElementById("container-particles");
const myApp = new AppViz(containerViz, options);
myApp.init();

const service = getService();
myApp.addService(service.name, package.request.type, service.id);

const srv = getService();
myApp.addURL(srv.name, package.request.type, srv.id);

window.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }

    switch (event.key) {
        case "Down": // IE/Edge specific value
        case "ArrowDown":
            // Do something for "down arrow" key press.
            myApp.addPackage(package.request.method, package.request.type, package.request.requestId);

            break;
        case "Up": // IE/Edge specific value
        case "ArrowUp":
            // Do something for "up arrow" key press.
            break;
        case "Left": // IE/Edge specific value
        case "ArrowLeft":
            // Do something for "left arrow" key press.
            break;
        case "Right": // IE/Edge specific value
        case "ArrowRight":
            // Do something for "right arrow" key press.
            break;
        case "Enter":
            // Do something for "enter" or "return" key press.
            const service = getService();
            myApp.addService(service.name, package.request.type, service.id);

            break;
        case "Esc": // IE/Edge specific value
        case "Escape":
            const srv = getService();
            myApp.addURL(srv.name, package.request.type, srv.id);

            // Do something for "esc" key press.
            break;
        default:
            return; // Quit when this doesn't handle the key event.
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
}, true);