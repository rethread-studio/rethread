// The first main module

import * as tone_init from './tone_init.js';
import * as graphics from './graphics.js';
import * as fingerprint from './fingerprint.js';
import * as global from './globals.js';

tone_init.init_tone();
graphics.init_three();
graphics.animate();

// Get the data
$.ajax({
    type: "GET",
    url: "data/amiunique-fp.min.csv",
    dataType: "text",
    success: function(data) {
      const t = data.split("\n");
      global.data.headers = t[0].split(",");
      global.data.rawFingerprints = t.slice(1);
      for (let l of global.data.rawFingerprints) {
        const vs = l.split(",");
        for (let i in vs) {
          let v = global.data.headers[i] + "_" + vs[i];
          // Add some global information for that specific data point
        }
      }
      global.data.loadedData = true;
    }
  });