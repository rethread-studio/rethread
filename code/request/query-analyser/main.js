var fs = require('fs');
var http = require('http');
const axios = require('axios');
const crypto = require('crypto');

let filename = 'whyamisotired-20200108T113107.json';
var obj = JSON.parse(fs.readFileSync('traces/' + filename, 'utf8'));


var screenshots = [];
var user_events = [];
var rendering_events = [];
var painting_events = [];
var system_events = [];
var loading_events = [];
var scripting_events = [];
var parsed_scripting_events = [];

var script_url_set = new Set([]);


// Decoding base-64 image
// Source: http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
function decodeBase64Image(dataString) 
{
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  var response = {};

  if (matches == null || matches.length !== 3) 
  {
    return false;
  }

  response.type = matches[1];
  response.data = new Buffer.from(matches[2], 'base64');

  return response;
}

// save a base64 image to disk
// from: https://stackoverflow.com/questions/10037563/node-js-base64-image-decoding-and-writing-to-file
// Save base64 image to disk
function saveBase64Image(imageBuffer, filePath) {
  try
  {
      // Regular expression for image type:
      // This regular image extracts the "jpeg" from "image/jpeg"
      var imageTypeRegularExpression      = /\/(.*?)$/;

      // This variable is actually an array which has 5 values,
      // The [1] value is the real image extension
      var imageTypeDetected                = imageBuffer.type.match(imageTypeRegularExpression);
      
      // image type svg+xml should have file ending svg
      if(imageTypeDetected[1] === "svg+xml") {
        imageTypeDetected[1] = "svg";
      }
                                               
      var userUploadedImagePath            = filePath + '.' + imageTypeDetected[1];

      // Save decoded binary image to disk
      try
      {
      fs.writeFile(userUploadedImagePath, imageBuffer.data,  
                              function() 
                              {
                                console.log('DEBUG - feed:message: Saved to disk image attached by user:', userUploadedImagePath);
                              });
      }
      catch(error)
      {
          console.log('ERROR:', error);
      }

  }
  catch(error)
  {
      console.log('ERROR:', error);
  }
}


for (const object of obj) {
  
  // log stuff
  // LAYER 1: GUI screenshots
  if(object.name === "Screenshot") {
    // get the data that is encoded in base 64 for storage within the json
    let screenshot = object.args.snapshot;
    // decode the base 64 to get the binary format back
    let buff = new Buffer.from(screenshot, 'base64');
    
    fs.writeFile("screenshots/" + object.ts + ".jpg", 
    buff, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The screenshot was saved!");
    });
  }
  
  // LAYER 2: User input
  if(object.name === "EventDispatch") {
    let new_obj = {
      name: object.args.data.type,
      ts: object.ts,
    };
    user_events.push(new_obj);
  } 
  // LAYER 3: High level categories of events
  // loading, rendering, painting, system task
  // *** RENDERING
  else if(object.name === "UpdateLayerTree") {
    // rendering event
    let new_obj = {
      name: object.name,
      dur: object.dur,
      ts: object.ts,
    };
    rendering_events.push(new_obj);
  } else if(object.name === "ScheduleStyleRecalculation" 
    || object.name === "InvalidateLayout") {
    let new_obj = {
      name: object.name,
      ts: object.ts,
    };
    rendering_events.push(new_obj);
  } else if(object.name === "Layout") {
    // beginning and end events, stored as B or E in the ph member
    if(object.ph === "B") {
      // add a new object to the list
      // Layout begin events sometimes have a stackTrace with a javascript function:
      // object.args.beginData.stackTrace: [{functionName, scriptId, url, lineNumber, columnNumber}]
      let new_obj = {
        name: object.name,
        ts: object.ts,
        dirtyObjects: object.args.beginData.dirtyObjects,
        dur: 0,
        hasStackTrace: false,
        stackTrace: []
      };
      if('stackTrace' in object.args.beginData) {
        new_obj.stackTrace = object.args.beginData.stackTrace;
        new_obj.hasStackTrace = true;
      }
      rendering_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last Layout event begun
      for(let i = rendering_events.length-1; i >= 0; i--) {
        if(rendering_events[i].name === "Layout") {
          rendering_events[i].dur = object.ts - rendering_events[i].ts;
          break;
        }
      }
    }
  } // end Layout events
  else if(object.name === "HitTest") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      // Layout begin events sometimes have a stackTrace with a javascript function:
      // object.args.beginData.stackTrace: [{functionName, scriptId, url, lineNumber, columnNumber}]
      let new_obj = {
        name: object.name,
        ts: object.ts,
        // the following will be added by the end event
        dur: 0,
        x: 0,
        y: 0,
        nodeName: "",
        move: false,
      };
      
      rendering_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last Layout event begun
      for(let i = rendering_events.length-1; i >= 0; i--) {
        if(rendering_events[i].name === "HitTest") {
          rendering_events[i].dur = object.ts - rendering_events[i].ts;
          rendering_events[i].x = object.args.endData.x;
          rendering_events[i].y = object.args.endData.y;
          rendering_events[i].nodeName = object.args.endData.nodeName;
          if('move' in object.args.endData) {
            rendering_events[i].move = true;
          }
          break;
        }
      }
    }
  } // end HitTest events
  // *** PAINTING
  else if (object.name === "Paint") {
    // could be added: nodeId, layerId, clip coordinates
    let new_obj = {
      name: object.name,
      ts: object.ts,
      dur: object.dur,
    };
    painting_events.push(new_obj);
  } else if (object.name === "PaintImage") {
    // sometimes does not have a url
    let new_obj = {
      name: object.name,
      ts: object.ts,
      dur: object.dur,
      url: object.args.data.url,
      rendered_image: false,
      x: object.args.data.x,
      y: object.args.data.y,
      width: object.args.data.width,
      height: object.args.data.height,
      srcWidth: object.args.data.srcWidth,
      srcHeight: object.args.data.srcHeight,
    };
    // the url sometimes contains the entire image in base64
    if(new_obj.url != undefined) {
      let imageBuffer = decodeBase64Image(new_obj.url);
      if(imageBuffer != false) {
        saveBase64Image(imageBuffer, "paint_images/" + new_obj.ts)
        new_obj.rendered_image = true;
      }
    }
    painting_events.push(new_obj);
  }
  else if(object.name === "CompositeLayers") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      let new_obj = {
        name: object.name,
        ts: object.ts,
        // the following will be added by the end event
        dur: 0,
      };
      
      painting_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last CompositeLayers event begun
      for(let i = painting_events.length-1; i >= 0; i--) {
        if(painting_events[i].name === "CompositeLayers") {
          painting_events[i].dur = object.ts - painting_events[i].ts;
          break;
        }
      }
    }
  } // end CompositeLayers events
  else if(object.name === "DrawFrame" || object.name === "Draw LazyPixelRef") {
    let new_obj = {
      name: object.name,
      ts: object.ts,
    };
    painting_events.push(new_obj);
  }
  // *** LOADING
  else if(object.name === "ParseHTML") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      let new_obj = {
        name: object.name,
        ts: object.ts,
        startLine: object.args.beginData.startLine,
        url: object.args.beginData.url,
        stackTrace: object.args.beginData.stackTrace,
        // the following will be added by the end event
        dur: 0,
      };
      
      loading_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last ParseHTML event begun
      for(let i = loading_events.length-1; i >= 0; i--) {
        if(loading_events[i].name === "ParseHTML") {
          loading_events[i].dur = object.ts - loading_events[i].ts;
          break;
        }
      }
    }
  } // end ParseHTML events
  // *** SYSTEM
  else if(object.name === "RunTask" || object.name === "GPUTask") {
    let new_obj = {
      name: object.name,
      ts: object.ts,
      dur: object.dur,
    };
    system_events.push(new_obj);
  }
  else if(object.name === "ImageDecodeTask") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      let new_obj = {
        name: object.name,
        ts: object.ts,
        // the following will be added by the end event
        dur: 0,
      };
      
      system_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last ImageDecodeTask event begun
      for(let i = system_events.length-1; i >= 0; i--) {
        if(system_events[i].name === "ImageDecodeTask") {
          system_events[i].dur = object.ts - system_events[i].ts;
          break;
        }
      }
    }
  } // end ImageDecodeTask events
  else if(object.name === "RasterTask") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      let new_obj = {
        name: object.name,
        ts: object.ts,
        sourceFrameNumber: object.args.tileData.sourceFrameNumber,
        // the following will be added by the end event
        dur: 0,
      };
      
      system_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last RasterTask event begun
      for(let i = system_events.length-1; i >= 0; i--) {
        if(system_events[i].name === "RasterTask") {
          system_events[i].dur = object.ts - system_events[i].ts;
          break;
        }
      }
    }
  } // end RasterTask events
  
  // *** SCRIPTING 
  else if(object.name === "FunctionCall") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      let new_obj = {
        name: object.name,
        ts: object.ts,
        functionName: object.args.data.functionName,
        scriptId: object.args.data.scriptId,
        lineNumber: object.args.data.lineNumber,
        columnNumber: object.args.data.columnNumber,
        // the following will be added by the end event
        dur: 0,
      };
      
      scripting_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last FunctionCall event begun
      for(let i = scripting_events.length-1; i >= 0; i--) {
        if(scripting_events[i].name === "FunctionCall") {
          scripting_events[i].dur = object.ts - scripting_events[i].ts;
          break;
        }
      }
    }
  } // end FunctionCall events
  else if (object.name === "TimerInstall") {
    let new_obj = {
      name: object.name,
      ts: object.ts,
      timerId: object.args.data.timerId,
      singleShot: object.args.data.singleShot,
      stackTrace: object.args.data.stackTrace,
    };
    scripting_events.push(new_obj);
  }
  else if (object.name === "TimerRemove") {
    let new_obj = {
      name: object.name,
      ts: object.ts,
      timerId: object.args.data.timerId,
      stackTrace: object.args.data.stackTrace,
    };
    scripting_events.push(new_obj);
  }
  else if(object.name === "RunMicrotasks") {
    // has begin and end events
    if(object.ph === "B") {
      // add a new object to the list
      let new_obj = {
        name: object.name,
        ts: object.ts,
        // the following will be added by the end event
        dur: 0,
      };
      scripting_events.push(new_obj);
    } else if (object.ph === "E") {
      // calculate the duration of the event
      // assume the matching event is the last RunMicrotasks event begun
      for(let i = scripting_events.length-1; i >= 0; i--) {
        if(scripting_events[i].name === "RunMicrotasks") {
          scripting_events[i].dur = object.ts - scripting_events[i].ts;
          break;
        }
      }
    }
  } // end RunMicrotasks events
  else if (object.name === "ProfileChunk") {
    // there are two versions of this, the ones with nodes and the ones without nodes
    let new_obj = {
      name: object.name,
      ts: object.ts,
      hasNodes: false,
      nodes: [],
      samples: object.args.data.cpuProfile.samples,
      timeDeltas: object.args.data.timeDeltas,
    };
    if('nodes' in object.args.data.cpuProfile) {
      new_obj.hasNodes = true;
      new_obj.nodes = object.args.data.cpuProfile.nodes;
      new_obj.lines = object.args.data.lines;
    }
    scripting_events.push(new_obj);
  }
}

// parse all the ProfileChunks again to make more sense
let num_parsed_scripting_events = 0;
let finished_parsing = false;

function handleFinishedCodeGetter() {
  
  // if(finished_parsing
  // && parsed_scripting_events.length == num_parsed_scripting_events) {
    // Write data to files
    fs.writeFile("scores/parsed_scripting_events.json", 
    JSON.stringify(parsed_scripting_events), function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file with parsed scripting events was saved!");
    });
    console.log("Parsed scripting events: " + parsed_scripting_events.length);

  // }
}

for(e of scripting_events) {
  if(e.name === "ProfileChunk") {
    const totalTime = e.timeDeltas.reduce((a, b) => a + b); // sum the timeDeltas
    
    if(e.hasNodes == true) {
      for(n of e.nodes) {
        
        let obj = {
          type: "js_function",
          ts: e.ts,
          functionName: n.callFrame.functionName,
          url: n.callFrame.url,
          lineNumber: parseInt(n.callFrame.lineNumber),
          columnNumber: parseInt(n.callFrame.columnNumber),
          code: "", 
          id: parseInt(n.id),
          parent: parseInt(n.parent),
          totalChunkTime: totalTime,
        };
        parsed_scripting_events.push(obj);
        let code = "";
        // grab the code that the trace points to
        // Simple approach: grab the code on the line number listed
        if(obj.url != undefined) {
          if(script_url_set.has(obj.url) == false) {
            script_url_set.add(obj.url);
            const url = obj.url;
            
            axios.get(url)
              .then(response => {
                //console.log(response);
                let all_code = response.data;
                // create hash of the url for the filename
                let hash = crypto.createHash('sha1');
                hash.setEncoding('hex');
                hash.write(url);   // the text that you want to hash
                // very important! You cannot read from the stream until you have called end()
                hash.end();
                let filename = hash.read();
                fs.writeFile("downloaded_js/" + filename, 
                all_code, function(err) {
                    if(err) {
                        console.log("File writing error");
                        return console.log(err);
                    }

                    console.log("url " + url + " was saved!");
                });
                
                // let lines = all_code.split(/\r\n|\r|\n/);
                // //console.log("lines: " + lines);
                // if(obj.lineNumber >= lines.length) {
                //   console.log("line number " + obj.lineNumber + " is higher than the available number of lines " + lines.length + " !");
                //   console.log("Offending url: " + obj.url);
                //   code = all_code;
                // } else {
                //   code = lines[obj.lineNumber];
                //   code = code.slice(obj.columnNumber, code.length);
                //   obj.code = code;
                // }
              })
              .catch(error => {
                //console.log(error);
                console.log("Could not get the code");
              });
          }
          
        }
        num_parsed_scripting_events += 1; // use a counter to make sure we know how many there should be
      }
    }
  }
}
finished_parsing = true;
handleFinishedCodeGetter();


let user_events_obj = {events: []};
user_events_obj.events = user_events;

let rendering_events_obj = {events: rendering_events};
let painting_events_obj = {events: painting_events};
let scripting_events_obj = {events: scripting_events};
let system_events_obj = {events: system_events};
let loading_events_obj = {events: loading_events};

console.log("User events: " + user_events.length);
console.log("Rendering events: " + rendering_events.length);
console.log("Painting events: " + painting_events.length);
console.log("System events: " + system_events.length);
console.log("Scripting events: " + scripting_events.length);
console.log("Loading events: " + loading_events.length);

// Write data to files
fs.writeFile("scores/user_events.json", 
JSON.stringify(user_events_obj), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file with user events was saved!");
});
fs.writeFile("scores/scripting_events.json", 
JSON.stringify(scripting_events_obj), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file with scripting events was saved!");
});
fs.writeFile("scores/painting_events.json", 
JSON.stringify(painting_events_obj), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file with painting events was saved!");
});
fs.writeFile("scores/rendering_events.json", 
JSON.stringify(rendering_events_obj), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file with rendering events was saved!");
});
fs.writeFile("scores/system_events.json", 
JSON.stringify(system_events_obj), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file with system events was saved!");
});
fs.writeFile("scores/loading_events.json", 
JSON.stringify(loading_events_obj), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file with loading events was saved!");
});