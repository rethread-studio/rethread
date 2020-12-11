const fs = require('fs'); 
const WebSocket = require('ws');
const cli = require("cli");
var ON_DEATH = require('death'); //this is intentionally ugly

let client;

var allCountries = new Set();
var allContinents = new Set();

var allObjects = [];
var startTs = Date.now();

function connectToServer() {
    client = new WebSocket('ws://nobel.durieux.me:1189');
    client.on('open', () => {
        console.log("Connected to server via websocket");
        // heartbeat(client);
    });

    client.on('ping', heartbeat);
    client.on('close', function clear() {
        // clearTimeout(this.pingTimeout);
        connectToServer();
    });

    client.on('message', (data) => {
        let internalData = JSON.parse(data);
        // console.log(internalData);
        let ts = Date.now() - startTs;
        internalData.ts = ts;
        allObjects.push(internalData);
    });
}
 
function heartbeat(ws) {
  clearTimeout(ws.pingTimeout);
 
  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  ws.pingTimeout = setTimeout(() => {
    ws.terminate();
  }, 30000 + 1000);
}

connectToServer();

ON_DEATH(function(signal, err) {
  //clean up code here
  var jsonContent = JSON.stringify(allObjects);
  
  fs.writeFile("output.json", jsonContent, 'utf8', function (err) {
      if (err) {
          console.log("An error occured while writing JSON Object to File.");
          console.log(err);
          process.exit();
      }
  
      console.log("JSON file has been saved.");
      process.exit();
  }); 
})