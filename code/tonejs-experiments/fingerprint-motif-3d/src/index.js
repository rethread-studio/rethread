// The first main module

import * as Synthesis from './synthesis.js';
import * as Graphics from './graphics.js';
import * as Fingerprint from './fingerprint.js';
import * as Global from './globals.js';

document.getElementById("pre-instructions-button-1").onclick = function() {
  document.getElementById("pre-instruction1").style.display = 'none';
  document.getElementById("pre-instruction2").style.display = '';
}
document.getElementById("pre-instructions-button-2").onclick = function() {
  document.getElementById("pre-instruction2").style.display = 'none';
  document.getElementById("pre-instruction3").style.display = '';
}
document.getElementById("pre-instructions-button-3").onclick = function() {
  document.getElementById("pre-instruction3").style.display = 'none';
  document.getElementById("pre-instruction4").style.display = '';
}
document.getElementById("pre-instructions-button-final").onclick = function() {
  document.getElementById("pre-instruction4").style.display = 'none';
  document.getElementById("blocker2").style.display = 'none';
}


// Check if we're on a mobile device and set a global flag
function isMobileDevice() {
  return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

// Global.state.mobile = window.matchMedia("only screen and (max-width: 960px)").matches;
Global.state.mobile = isMobileDevice();
if(Global.state.mobile) {
  Global.html.inactiveInstructions = `
  <span style="font-size:36px; letter-spacing: 1em;">TRACES OF ONLINE PRESENCE</span>
    <br/><br/><br/><br/><br/>
    <span style="font-size:24px">Tap to activate</span>
    <br /><br />
    Move: Touch<br/>
    Look: Rotate device<br/>
    <br/><br/>
    <span style="font-size:24px;">Explore browser fingerprints as sonic objects in space. In your presence each device will reveal its sonic identity.</span>
    <br/><br/>Mobile devices are currently not fully supported`;
} else {
  // Global.html.inactiveInstructions += "<br/>You are on a desktop device";
}

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
// Get the fingerprint for the local user
getFingerPrint(function(data) {
  // console.log("Current user:" + JSON.stringify(data));
  
  if(data.random != true) {
    let normalizedArr = [];
    for(let h of headers) {
      normalizedArr.push(Number(data.normalized[h]));
    }
    // console.log(normalizedArr);
    // console.log("random_print: " + data.random);
    Global.data.localRawFingerprint = normalizedArr;
    Global.data.localFingerprint = new Fingerprint.Fingerprint(Global.data.localRawFingerprint, Fingerprint.FPrintTypes.local);
  } else {
    Global.data.localFingerprint = undefined;
    Global.data.localRawFingerprint = undefined;
  }
  
  Global.data.loadedLocal = true;
});

  
getConnectedFingerPrints(function(data) {
  // console.log("Connected users:");
  // console.log(data);
  Global.data.rawConnectedFingerprintsObjects = data.normalized;
  Global.data.rawConnectedFingerprints = [];
  // Convert into arrays of numbers
  for (let datapoint of Global.data.rawConnectedFingerprintsObjects) {
    let newArr = [];
    for(let h of headers) {
      newArr.push(Number(datapoint[h]));
    }
    if(Global.data.localFingerprint == undefined || Global.data.localFingerprint.rawEquals(newArr) == false) {
      Global.data.rawConnectedFingerprints.push(newArr);
    }
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
    // console.log("Refreshing connected");
    // console.log(data);
    Global.data.rawConnectedFingerprintsObjects = data.normalized;
    Global.data.rawConnectedFingerprints = [];
    // Convert into arrays of numbers
    for (let datapoint of Global.data.rawConnectedFingerprintsObjects) {
      let newArr = [];
      for(let h of headers) {
        newArr.push(Number(datapoint[h]));
      }
      if(Global.data.localFingerprint == undefined || Global.data.localFingerprint.rawEquals(newArr) == false) {
        Global.data.rawConnectedFingerprints.push(newArr);
      }
      
    }
    // Remove any fingerprint that has disconnected
    for(let i = 0; i < Global.data.connectedFingerprints.length; i++) {
      if(Global.data.connectedFingerprints[i].isInRawFingerprintList(Global.data.rawConnectedFingerprints) != true) {
        console.log("Another fingerprint enters the archive!");
        let removed = Global.data.connectedFingerprints.splice(i, 1);
        Graphics.removeFingerprintFromRoom(removed[0]);
        i--;
      }
    }
    // Add any new fingerprints that may have connected
    for(let rawPrint of Global.data.rawConnectedFingerprints) {
      let printFound = false;
      for(let i = 0; i < Global.data.connectedFingerprints.length; i++) {
        let compPrint = Global.data.connectedFingerprints[i].rawFingerprint;
        if(compPrint.length === rawPrint.length && compPrint.every((value, index) => value === rawPrint[index])) {
          printFound = true;
        }
      }
      if(!printFound) {
        console.log("A new device has joined us!");

        // Create a new fingerprint
        let newFingerprint = new Fingerprint.Fingerprint(rawPrint, Fingerprint.FPrintTypes.connected);
        Global.data.connectedFingerprints.push(newFingerprint);
        // Add to space
        Graphics.addNewConnectedFingerprint(newFingerprint);
      }
    }
  });
}
  


getAllNormalizedFingerPrints(function(data) {
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
  for(let i = 0; i < 200 && i < Global.data.rawFingerprints.length; i++) {
    let index = Global.data.rawFingerprints.length - 1 - i;
      let fingerprint = new Fingerprint.Fingerprint(Global.data.rawFingerprints[index], Fingerprint.FPrintTypes.old);
      Global.data.fingerprints.push(fingerprint);
  }
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