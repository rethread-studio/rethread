const JSONStream = require('JSONStream')
const sh = require('shelljs');
const through = require('through')
const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 54401})

function repairJsonString(data) {
    return data.replace(/Form item: "(.*)" = "(.*)""/, function(match, p1, p2, offset, string) {
      return `Form item: \\"${p1}\" = \\"${p2}\\""`
    })
    .replace(/"tcp_flags_tcp_flags_str": ".*?",/, '')
}
function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
    });
}
function capture(interface) {
    return new Promise(resolve => {
        // -e ip.src -e ip.dst -e ip.src_host -e ip.dst_host -e dns.qry.name -e frame.len -e http.host -e http.response
        const cmd = "tshark -V -N dnN -T ek -i " + interface + " -e ip.src -e ip.dst -e ip.src_host -e ip.dst_host -e dns.qry.name -e frame.len -e http.host -e http.response -e frame.protocols -e eth.dst -e eth.src 2> /dev/null"
        try {
            const child = sh.exec(cmd, {async: true, silent: true, maxBuffer: 30 * 1024 * 1024 * 1024})
            child.stdout
            .pipe(through(function write(data) {
                try {
                    data = repairJsonString(data)
                    this.queue(data)
                } catch (error) {
                    console.log(error)
                }
            }))
            .pipe(JSONStream.parse().on('error', (e) => {
                console.log('error')
            // retry
            //   capture()
            }))
            .on('error', (e) => {console.log('error')})
            .on('data', (d) => {
                try {
                    const json = d.layers;
                    if (json && json.ip_src) {
                        const data = {}
                        if (json.ip_dst[0].indexOf('192.168') == 0) {
                            data.remote_ip = json.ip_src[0]
                            data.local_ip = json.ip_dst[0]
                            data.remote_host = json.ip_src_host[0]
                            data.local_host = json.ip_dst_host[0]
                            data.remote_mac = json.eth_src[0]
                            data.local_mac = json.eth_dst[0]
                            data.out = false;
                        } else {
                            data.local_ip = json.ip_src[0]
                            data.remote_ip = json.ip_dst[0]
                            data.local_host = json.ip_src_host[0]
                            data.remote_host = json.ip_dst_host[0]
                            data.local_mac = json.eth_src[0]
                            data.remote_mac = json.eth_dst[0]
                            data.out = true;
                        }
                        data.timestamp = d.timestamp
                        data.len = parseInt(json.frame_len[0])
                        if (json.dns_qry_name) {
                            data.dns_query = json.dns_qry_name[0]
                        }
                        data.protocol = json.frame_protocols[0].split(':')[0]
                        broadcast(data);
                        return;
                    }
                } catch (error) {
                    console.log(error)
                }
            }).on('end', () => {
                console.log("Tshark process finished there is an error...")
                resolve()
            })
        } catch (error) {
            console.log(error)
        }
    })
}
(async () => {
    try {
        console.log('Start sniffing on ' + process.argv[2])
        capture(process.argv[2])
    } catch (error) {
        console.log(error)
    }
})()