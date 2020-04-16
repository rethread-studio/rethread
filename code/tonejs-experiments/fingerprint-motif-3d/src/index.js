// The first main module

import * as Synthesis from './synthesis.js';
import * as Graphics from './graphics.js';
import * as Fingerprint from './fingerprint.js';
import * as Global from './globals.js';


// Check if we're on a mobile device and set a global flag

Global.state.mobile = window.matchMedia("only screen and (max-width: 760px)").matches;

Synthesis.init_tone();
Graphics.init_three();
Graphics.animate();

// Get the data from the amiunique dataset
// $.ajax({
//     type: "GET",
//     url: "data/amiunique-fp.min.csv",
//     dataType: "text",
//     success: function(data) {
//       const t = data.split("\n");
//       Global.data.headers = t[0].split(",");
//       Global.data.rawFingerprintStrings = t.slice(1);
//       // Convert to the same format as we're using for the dedicated server fingerprints
//       Global.data.rawFingerprints = [];
//       for (let l of Global.data.rawFingerprintStrings) {
//         const vs = l.split(",");
//         let newArr = [];
//         for(let s of vs) {
//           newArr.push(Number(s));
//         }
//         Global.data.rawFingerprints.push(newArr);
//       }
//       for(let i = 0; i < 200; i++) {
//         let fingerprint = new Fingerprint.Fingerprint(Global.data.rawFingerprints[i], Fingerprint.FPrintTypes.old);
//         Global.data.fingerprints.push(fingerprint);
//       }
      
//       Global.data.loadedData = true;
//     }
//   });
let headers = [
  "host",
  "dnt",
  "user-agent",
  "accept",
  "accept-encoding",
  "accept-language",
  "ad",
  "canvas",
  "cookies",
  "font-flash",
  "font-js",
  "language-flash",
  "platform-flash",
  "languages-js",
  "platform",
  "plugins",
  "screen_width",
  "screen_height",
  "screen_depth",
  "storage_local",
  "storage_session",
  "timezone",
  "userAgent-js",
  "webGLVendor",
  "webGLRenderer",
];
Global.data.headers = headers;
console.log("num headers: " + headers.length);

// Get the fingerprint for the local user
getFingerPrint(function(data) {
  console.log("Current user:");
  
  if(data.random != true) {
    let normalizedArr = [];
    for(let h of headers) {
      normalizedArr.push(Number(data.normalized[h]));
    }
    console.log(normalizedArr);
    console.log("random_print: " + data.random);
    Global.data.localRawFingerprint = normalizedArr;
    Global.data.localFingerprint = new Fingerprint.Fingerprint(Global.data.localRawFingerprint, Fingerprint.FPrintTypes.local);
  }
  
  Global.data.loadedLocal = true;
});

  
getConnectedFingerPrints(function(data) {
  console.log("Connected users:");
  console.log(data);
  Global.data.rawConnectedFingerprintsObjects = data.normalized;
  Global.data.rawConnectedFingerprints = [];
  // Convert into arrays of numbers
  for (let datapoint of Global.data.rawConnectedFingerprintsObjects) {
    let newArr = [];
    for(let h of headers) {
      newArr.push(Number(datapoint[h]));
    }
    Global.data.rawConnectedFingerprints.push(newArr);
  }
  Global.data.connectedFingerprints = [];
  for(let rawFingerprint of Global.data.rawConnectedFingerprints) {
    Global.data.connectedFingerprints.push(new Fingerprint.Fingerprint(rawFingerprint, Fingerprint.FPrintTypes.connected));
  }
  Global.data.loadedConnected = true;
});

/// Function called repeatedly to add new and remove old connected users
function refreshConnectedFingerPrints() {
  getConnectedFingerPrints(function(data) {
    console.log("Refreshing connected");
    // console.log(data);
    Global.data.rawConnectedFingerprintsObjects = data.normalized;
    Global.data.rawConnectedFingerprints = [];
    // Convert into arrays of numbers
    for (let datapoint of Global.data.rawConnectedFingerprintsObjects) {
      let newArr = [];
      for(let h of headers) {
        newArr.push(Number(datapoint[h]));
      }
      Global.data.rawConnectedFingerprints.push(newArr);
    }
    // Remove any fingerprint that has disconnected
    for(let i = 0; i < Global.data.connectedFingerprints.length; i++) {
      if(Global.data.connectedFingerprints[i].isInRawFingerprintList(Global.data.rawConnectedFingerprints) != true) {
        let removed = Global.data.connectedFingerprints.splice(i, 1);
        Graphics.removeFingerprintFromRoom(removed[0]);
        i--;
      }
    }
    // Add any new fingerprints that may have connected
    for(let rawPrint of Global.data.rawConnectedFingerprints) {
      let printFound = false;
      for(let i = 0; i < Global.data.connectedFingerprints.length; i++) {
        if(rawPrint == Global.data.connectedFingerprints[i]) {
          printFound = true;
        }
      }
      if(!printFound) {
        // Create a new fingerprint
        Global.data.connectedFingerprints.push(new Fingerprint.Fingerprint(rawPrint, Fingerprint.FPrintTypes.connected));
      }
    }
  });
}
  


getAllNormalizedFingerPrints(function(data) {
  console.log(data);
  // The data is an array of objects with the following fields:
  // _id, host, dnt, user-agent, accept, accept-encoding, accept-language, 
  // ad, canvas, cookies, font-flash, font-js, language-flash, platform-flash, 
  // languages-js, platform, plugins, screen_width, screen_height, screen_depth, 
  // storage_local, storage_session, timezone, userAgent-js, webGLVendor, webGLRenderer
  
  
  Global.data.rawFingerprintsObjects = data;
  Global.data.rawFingerprints = [];
  // Convert into arrays of numbers
  for (let datapoint of Global.data.rawFingerprintsObjects) {
    let newArr = [];
    for(let h of headers) {
      newArr.push(Number(datapoint[h]));
    }
    Global.data.rawFingerprints.push(newArr);
  }
  // for(let i = 0; i < 200; i++) {
  //   Fingerprint.generateRandomFingerPrint();
  // }
  for(let i = 0; i < 200; i++) {
    let index = Global.data.rawFingerprints.length - 1 - i;
      let fingerprint = new Fingerprint.Fingerprint(Global.data.rawFingerprints[index], Fingerprint.FPrintTypes.old);
      Global.data.fingerprints.push(fingerprint);
  }
  console.log(JSON.stringify(Global.data.rawFingerprints[10]));
  console.log(JSON.stringify(Global.data.fingerprints[10]));
  Global.data.loadedData = true;
});



// Dot Menu

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
document.getElementById("dropdown-menu-button").onclick = function() {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function (event) {
  if (!event.target.matches('.dropbtn')) {
      var dropdowns = document.getElementsByClassName("dropdown-content");
      var i;
      for (i = 0; i < dropdowns.length; i++) {
          var openDropdown = dropdowns[i];
          if (openDropdown.classList.contains('show')) {
              openDropdown.classList.remove('show');
          }
      }
  }
}

export { refreshConnectedFingerPrints }