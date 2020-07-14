let protocol = "ws"
if (document.location.protocol == 'https:') {
    protocol += 's'
}
let host = document.location.hostname
if (document.location.port) {
    host += ":" + document.location.port
}
const ws = new WebSocket(protocol + '://' + host)

const services = {}
const servicesLen = {}
const hosts = {}
const hostsServices = {}
const hostsLen = {}
const hostsCountry = {}
const lastPackets = FixedQueue(100, [])

ws.onmessage = (data) => {
    const json = JSON.parse(data.data)
    lastPackets.push(json)
    const host = json.remote_host
    const country = json.remote_location
    for (let service of json.services) {
        if (!services[service]) {
            services[service] = {
                count: 0,
                len: 0
            }
        }
        services[service].count++
        services[service].len += json.len

        if (!hostsServices[host]) {
            hostsServices[host] = new Set()
        }
        hostsServices[host].add(service)
    }
    // if (json.http) {
    //     if (json.http.http_http_host) {
    //         host = json.http.http_http_host
    //     } else if (json.http.host) {
    //         host = json.http.host
    //     } else if (json.http.http_http_response_for_uri) {
    //         host = json.http.http_http_response_for_uri
    //     } else {
    //         console.log(json.http)
    //     }
    // }
    hostsCountry[host] = country
    hosts[host] = (hosts[host] || 0) +1
    hostsLen[host] = (hostsLen[host] || 0) + parseInt(json.len)
}

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}

function render() {
    let content = ''
    // for (let host in hosts) {
    //     let ser = ''
    //     if (hostsServices[host]) {
    //         for (let service of hostsServices[host]) {
    //             ser += service + ' '
    //         }
    //     }
    //     content += host + ' ' + hosts[host] + ' ' + ser + ' ' + humanFileSize(hostsLen[host], true) + ' ' + hostsCountry[host] +  '<br>'
    // }
    for (let i = lastPackets.length - 1; i >= 0; i--) {
        const packet = lastPackets[i]
        let ser = ''
        for (let service of packet.services) {
            ser += service + ' '
        }
        const host = packet.remote_host
        const country = packet.remote_location
        content += '<div class="packet"><span class="id">#' + packet.id + '</span> <span class="host">' + host + '</span> <span class="services">' + ser + '</span> <span class="size">' + humanFileSize(packet.len, true) + '</span> <span class="country">' + country +  '</span></div>'
    }
    document.getElementById('hosts').innerHTML = content;

    // content = ''
    // for (let service in services) {
    //     content += service + ' ' + services[service] + ' ' + humanFileSize(servicesLen[service], true) +  '<br>'
    // }
    // document.getElementById('services').innerHTML = content;
}

setInterval(() => {
    render()
}, 50);