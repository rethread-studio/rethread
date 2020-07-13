const fs = require('fs');
const forever = require('forever-monitor');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const getServices = require('./services')
const localDevices = require('./arp');
const osc = require("osc");
const bodyParser = require('body-parser')
const config = require('config')

const os = require('os');
const ifaces = os.networkInterfaces();



const geoip = require('geo-from-ip');

const app = express();
app.use(bodyParser.json())
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let network_interface = config.get("General.interface")
let oscConfig = {...config.get("OSC")}
let speakers = JSON.parse(JSON.stringify(config.get("Speakers")));
if (fs.existsSync(__dirname + '/data/speakers.json')) {
    speakers = JSON.parse(fs.readFileSync(__dirname + '/data/speakers.json'));
}
let samples = []
if (fs.existsSync(__dirname + '/data/samples.json')) {
    samples = JSON.parse(fs.readFileSync(__dirname + '/data/samples.json'));
}

if (ifaces[network_interface]) {
    console.log(ifaces[network_interface].filter((iface) => 'IPv4' === iface.family && iface.internal !== true))
}
function saveConfig() {
    const data = {
        "General": {
            interface: network_interface,
            sniffingAutoStart: status.sniffing,
            oscAutoStart: status.osc
        },
        "OSC": oscConfig
    }
    fs.writeFileSync(__dirname + '/config/local.json', JSON.stringify(data, null, 4))
    fs.writeFileSync(__dirname + '/data/speakers.json', JSON.stringify(speakers, null, 4))
    fs.writeFileSync(__dirname + '/data/samples.json', JSON.stringify(samples, null, 4))
}

const status = {
    "sniffing": false,
    "osc": false,
    "record": false,
    "play": false
}

const allUsers = {}

app.get('/api/status', function (req, res) {
    res.json(status)
})

app.post('/api/sniffing/stop', function (req, res) {
    if (status.sniffing == true) {
        stopSniffing(() => {
            res.send("ok")
        });
    } else {
        res.send("ko").status(500)
    }
})

app.post('/api/sniffing/start', function (req, res) {
    if (status.sniffing == false) {
        startSniffing();
        res.send("ok")
    } else {
        res.send("ko").status(500)
    }
})

let currentSample = null;
app.post('/api/sample/record', function (req, res) {
    if (status.record == false) {
        status.record = true;
        currentSample = {
            name: req.body.name,
            messages: []
        };
        res.send("ok")
    } else {
        res.send("ko").status(500)
    }
})

async function sendMessage(m, time) {
    return new Promise(resolve => {
        setTimeout(() => {
            broadcast(m);
            return resolve();
        }, time)
    })
}
let playingSample = null;
async function playSample() {
    if (playingSample == null) {
        return;
    }
    for (let i = 0; i < playingSample.messages.length; i++) {
        if (playingSample == null || status.play == false) {
            return;
        }
        const m = playingSample.messages[i]
        let diff = 10;
        if (i > 0) {
            diff = m.timestamp - playingSample.messages[i - 1].timestamp
        }
        await sendMessage(m, diff);
    }
    playSample();
}
function stopSample() {
    status.play = false;
    playingSample = null
}
app.post('/api/sample/stop', function (req, res) {
    stopSample();
    res.send("ok")
});
app.post('/api/sample/play', function (req, res) {
    status.play = true;
    try {
        const data = req.body;
        stopSniffing(async () => {
            try {
                playingSample = JSON.parse(fs.readFileSync(__dirname + '/data/samples/' + data.sample + '.json'))
                setTimeout(playSample, 100)
            } catch (error) {
                status.play = false;
                console.log(error);
            }
        });
    } catch (error) {
        status.play = false;
        console.log(error);
    }
    res.send("ok")
})


app.post('/api/sample/save', function (req, res) {
    if (status.record !== false) {
        status.record = false;
        __dirname + '/data/samples.json'
        fs.writeFileSync(__dirname + '/data/samples/' + currentSample.name + '.json', JSON.stringify(currentSample));
        samples.push(currentSample.name)
        currentSample = null;
        saveConfig();
        res.send("ok")
    } else {
        res.send("ko").status(500)
    }
})

app.post('/api/osc/stop', function (req, res) {
    if (status.osc == true) {
        stopOSC();
        res.send("ok")
    } else {
        res.send("ko").status(500)
    }
})

app.post('/api/osc/start', function (req, res) {
    if (status.osc == false) {
        startOSC();
        res.send("ok")
    } else {
        res.send("ko").status(500)
    }
})

app.get('/api/users', function (req, res) {
    localDevices({
        "interface": network_interface
    }).then(devices => {
        for (let device of devices) {
            if (!allUsers[device.mac]) {
                allUsers[device.mac] = {
                    name: device.name,
                    package: 0,
                    len: 0
                }
            }
            allUsers[device.mac].ip = device.ip;
            device.package = allUsers[device.mac].package;
            device.len = allUsers[device.mac].len;
        }
        res.json(devices)
    })
})


app.get('/api/samples', function (req, res) {
    res.json(samples)
})

app.get('/api/speakers', function (req, res) {
    res.json(speakers)
})

app.post('/api/speaker/:speaker/user/:user', function (req, res) {
    for (let speaker of speakers) {
        if (speaker.id == req.params.speaker) {
            speaker.user = req.params.user == 'null' ? null : req.params.user;
        }
    }
    saveConfig();
    res.send('ok')
})

app.delete('/api/speaker/:speaker', function (req, res) {
    for (let i in speakers) {
        const speaker = speakers[i]
        if (speaker.id == req.params.speaker) {
            speakers.splice(i, 1);
        }
    }
    saveConfig();
    res.send('ok')
})

app.post('/api/speaker/', function (req, res) {
    speakers.push(req.body)
    saveConfig();
    res.send('ok')
})

app.get('/api/interface', function (req, res) {
    res.send(network_interface)    
})

app.post('/api/interface', function (req, res) {
    network_interface = req.body.interface
    if (status.sniffing) {
        stopSniffing(() => {
            startSniffing();
        })
    }
    saveConfig();
    res.send("ok")
})

app.get('/api/osc', function (req, res) {
    res.json({config: oscConfig, values: oscValueOrder})
})

app.post('/api/osc', function (req, res) {
    if (req.body.ip && oscConfig.ip != req.body.ip) {
        oscConfig.ip = req.body.ip
    }
    if (req.body.port && oscConfig.port != req.body.port) {
        oscConfig.port = req.body.port
    }
    if (req.body.server_port && oscConfig.server_port != req.body.server_port) {
        oscConfig.server_port = req.body.server_port
        if (status.osc) {
            stopOSC()
            setTimeout(() => {
                startOSC()
            }, 1000)
        }
    }
    if (req.body.address && oscConfig.address != req.body.address) {
        oscConfig.address = req.body.address
    }
    saveConfig();
    res.send('ok')
})

server.on('upgrade', function (request, socket, head) {
    console.log('Parsing session from request...');

    wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
    });
});

const oscValueOrder = ['timestamp', 'local_ip', 'remote_ip', 'out', 'local_location', 'remote_location', 'len', 'protocol', 'services', 'speaker', 'local_mac']
function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            data.client_ip = client._socket.remoteAddress
            client.send(JSON.stringify(data));
        }
    });
    if (status.osc) {
        args = []
        for (let i of oscValueOrder) {
            const type = typeof data[i] == 'number' ? 'i' : 's'
            args.push({
                type,
                value: data[i]
            })
        }
        udpPort.send({
            address: oscConfig.address,
            args
        }, oscConfig.ip, oscConfig.port);
    }
}

wss.on('connection', function (ws, request) {
    ws.on('message', function (message) {
        //
        // Here we can now use session parameters.
        //
        console.log(`Received message ${message} from user`);
    });
});

const knownIPs = {}
function getLocation(ip) {
    if (!knownIPs[ip]) {
        try {
            knownIPs[ip] = geoip.allData(ip)
        } catch (error) {
            console.log(error)
        }
    }
    if (knownIPs[ip]) {
        return knownIPs[ip].country
    }
}
let count = 0
function wssConnection() {
    if (sniffing == null) {
        return;
    }
    sniffing.ws = new WebSocket('ws://localhost:54401', {
        perMessageDeflate: false
    });
    sniffing.ws.on('open', () => {
        console.log("WS connected to TShark process")
    })
    sniffing.ws.on('message', (data) => {
        count++
        const json = JSON.parse(data)
        if (!allUsers[json.local_mac]) {
            allUsers[json.local_mac] = {
                ip: json.local_ip,
                package: 0,
                len: 0
            }
        }

        allUsers[json.local_mac].package++
        allUsers[json.local_mac].len += json.len

        json.local_location = getLocation(json.local_ip)
        json.remote_location = getLocation(json.remote_ip)
        json.services = getServices(json)
        for (let speaker of speakers) {
            if (speaker.user == json.local_mac) {
                json.speaker = speaker.id
            }
        }
        if (!json.speaker) {
            json.speaker = 'null'
        }
        json.id = count
        if (status.record === true && currentSample) {
            currentSample.messages.push(json);
        }
        broadcast(json);
    })
    sniffing.ws.on('error', function (err) {
        console.log('error', err)
    })
    sniffing.ws.on('close', function () {
        console.log('close')
        if (sniffing != null) {
            setTimeout(wssConnection, 1000)
        }
    });
}

let sniffing = null;
function startSniffing() {
    sniffing = forever.start(['node', 'sharks.js', network_interface], { 'killTree': true, 'max': 10 })
    sniffing.on('start', function () {
        status.sniffing = true;
        saveConfig();
        setTimeout(wssConnection, 500)
    });
}
function stopSniffing(callback) {
    if (sniffing == null) {
        return callback();
    }
    sniffing.stop();
    sniffing.on('exit', function () {
        const ws = sniffing.ws;
        sniffing = null;
        status.sniffing = false;
        saveConfig();
        try {
            ws.terminate()
        } catch (error) {
            console.log(error);
        }
        if (callback) {
            callback()
        }
    });
}

let udpPort = null;
function startOSC() {
    udpPort = new osc.UDPPort({
        localAddress: "0.0.0.0",
        localPort: oscConfig.server_port,
        metadata: true
    });
    // Listen for incoming OSC messages.
    udpPort.on("message", function (oscMsg, timeTag, info) {
        console.log("An OSC message just arrived!", oscMsg);
        console.log("Remote info is: ", info);
    });
    udpPort.on("ready", function () {
        console.log("Start OSC server on port " + oscConfig.server_port)
        status.osc = true
        saveConfig();
    });
    // Open the socket.
    udpPort.open();
}

function stopOSC() {
    status.osc = false;
    udpPort.close()
    udpPort = null;
    saveConfig();
}
server.listen(config.get("General.port"), function () {
    console.log('Listening on ' + config.get("General.port"));
    if (config.get("General.sniffingAutoStart")) {
        startSniffing();
    }
    if (config.get("General.oscAutoStart")) {
        startOSC();
    }
});