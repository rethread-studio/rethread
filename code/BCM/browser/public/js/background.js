
//SERVICE PARTICLE VIZ OPTIONS
const options = {

    length: 400,
    fov: 90,

    width: 100,
    height: 100,

    installation: false,

    colors: {
        roadColor: 0x080808,
        islandColor: 0x0a0a0a,
        background: 0x000000,
        shoulderLines: 0x131318,
        brokenLines: 0x131318,
    }
}

const containerViz = document.getElementById("container-particles");
const myApp = new AppViz(containerViz, options);
myApp.init();



const geometry = {
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
    },
    event: 'request_created',
}

function addGeometry() {

    myApp.addGeometry(geometry.request.method, geometry.request.type, geometry.request.requestId);
}
setInterval(addGeometry, 400)

