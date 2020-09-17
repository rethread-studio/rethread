// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

new WebSocketClient().onmessage = (data) => {
    // console.log(data)
    }
///////////////////////// GUI Element Global Variables///////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////// Global Variables///////////////////////////////////////

let windows = [];
windows.push({x: 2, y: 0, w: 36, h: 35});
windows.push({x: 86, y: 0, w: 36, h: 35});
windows.push({x: 170, y: 0, w: 36, h: 35});

windows.push({x: 2, y: 66, w: 36, h: 49});
windows.push({x: 86, y: 66, w: 36, h: 49});
windows.push({x: 170, y: 66, w: 36, h: 49});

windows.push({x: 2, y: 66, w: 36, h: 49});
windows.push({x: 86, y: 66, w: 36, h: 49});
windows.push({x: 170, y: 66, w: 36, h: 49});

windows.push({x: 2, y: 150, w: 36, h: 49});
windows.push({x: 86, y: 150, w: 36, h: 49});
windows.push({x: 170, y: 150, w: 36, h: 49});


windows.push({x: 2, y: 234, w: 36, h: 49});
windows.push({x: 86, y: 234, w: 36, h: 49});
windows.push({x: 170, y: 234, w: 36, h: 49});

windows.push({x: 2, y: 316, w: 36, h: 44});
windows.push({x: 86, y: 316, w: 36, h: 44});
windows.push({x: 170, y: 316, w: 36, h: 44});




/////////////////////////////////////////////////////////////////////////////////////////////

// Preload Function
    function preload() { 
 
    } // End Preload

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
    function setup() {

    	var canvasX = 208;
    	var canvasY = 360;

	    // Create canvas 
	    canvas = createCanvas(canvasX, canvasY);

	    // Send canvas to CSS class through HTML div
	    canvas.parent('sketch-holder');

	    // Set canvas framerate
	    // frameRate(25);

    } // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////

// Draw Function
	function draw() {

        // Clear if needed
        // clear();

        // Set canvas background
    	background('#000000');        

    	// Fill color
    	// fill(250,250,250);

    	// Stroke color
    	// stroke(55,55,55);
  
  		// Stroke weight
          // strokeWeight(1);
        fill(255);
        for(win of windows) {
            rect(win.x, win.y, win.w, win.h);
        }

	} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// End Script