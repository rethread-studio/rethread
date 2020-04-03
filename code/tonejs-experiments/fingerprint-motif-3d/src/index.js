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
      Global.data.rawFingerprints = t.slice(1);
      for (let l of Global.data.rawFingerprints) {
        const vs = l.split(",");
        for (let i in vs) {
          let v = Global.data.headers[i] + "_" + vs[i];
          // Add some global information for that specific data point
        }
      }
      for(let i = 0; i < 200; i++) {
        Fingerprint.generateRandomFingerPrint();
      }
      Global.data.loadedData = true;
    }
  });