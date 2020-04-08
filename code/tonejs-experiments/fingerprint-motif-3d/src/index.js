// The first main module

import * as tone_init from './tone_init.js';
import * as Graphics from './graphics.js';
import * as Fingerprint from './fingerprint.js';
import * as Global from './globals.js';

tone_init.init_tone();
Graphics.init_three();
Graphics.animate();

// Get the data
$.ajax({
    type: "GET",
    url: "data/amiunique-fp.min.csv",
    dataType: "text",
    success: function(data) {
      const t = data.split("\n");
      Global.data.headers = t[0].split(",");
      Global.data.rawFingerprintStrings = t.slice(1);
      // Convert to the same format as we're using for the dedicated server fingerprints
      Global.data.rawFingerprints = [];
      for (let l of Global.data.rawFingerprintStrings) {
        const vs = l.split(",");
        let newArr = [];
        for(let s of vs) {
          newArr.push(Number(s));
        }
        Global.data.rawFingerprints.push(newArr);
      }
      for(let i = 0; i < 200; i++) {
        Fingerprint.generateRandomFingerPrint();
      }
      Global.data.loadedData = true;
    }
  });
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
    console.log("Current user:");
    
    let normalizedArr = [];
    for(let h of headers) {
      normalizedArr.push(Number(data.normalized[h]));
    }
    Global.data.localRawFingerprint = normalizedArr;
    console.log(Global.data.localRawFingerprint);
  });

  getConnectedFingerPrints(function(data) {
    console.log("Connected users:");
    console.log(data);
  })

// getAllNormalizedFingerPrints(function(data) {
//   console.log(data);
//   // The data is an array of objects with the following fields:
//   // _id, host, dnt, user-agent, accept, accept-encoding, accept-language, 
//   // ad, canvas, cookies, font-flash, font-js, language-flash, platform-flash, 
//   // languages-js, platform, plugins, screen_width, screen_height, screen_depth, 
//   // storage_local, storage_session, timezone, userAgent-js, webGLVendor, webGLRenderer
//   
//   
//   Global.data.rawFingerprintsObjects = data;
//   Global.data.rawFingerprints = [];
//   // Convert into arrays of numbers
//   for (let datapoint of Global.data.rawFingerprintsObjects) {
//     let newArr = [];
//     for(let h of headers) {
//       newArr.push(Number(datapoint[h]));
//     }
//     Global.data.rawFingerprints.push(newArr);
//   }
//   for(let i = 0; i < 200; i++) {
//     Fingerprint.generateRandomFingerPrint();
//   }
//   console.log(JSON.stringify(Global.data.rawFingerprints[10]));
//   console.log(JSON.stringify(Global.data.fingerprints[10]));
//   Global.data.loadedData = true;
// });

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