p5.disableFriendlyErrors = true;

// GLOBAL GENERAL STATE
let drawWindows = false; // Set this to false for the real event, we don't need to waste GPU resources on drawing the windows when they're real
var drawFPS = false;
var fps = 0;
var doGlitch = true;

// This section contains state that is shared between many or all scenes
// or is used by the main functions within this file

var subsampling = 1;
var canvasX = 208 * subsampling;
var canvasY = 360 * subsampling;

let antonFont; // The main font we are using (we only need one instance of it in memory)

let lastNow = 0;
let firstNow = 0;
var now = 0;

let windows = [];
windows.push({
  x: 2,
  y: 0,
  w: 36,
  h: 35,
});
windows.push({
  x: 86,
  y: 0,
  w: 36,
  h: 35,
});
windows.push({
  x: 170,
  y: 0,
  w: 36,
  h: 35,
});

windows.push({
  x: 2,
  y: 66,
  w: 36,
  h: 49,
});
windows.push({
  x: 86,
  y: 66,
  w: 36,
  h: 49,
});
windows.push({
  x: 170,
  y: 66,
  w: 36,
  h: 49,
});

windows.push({
  x: 2,
  y: 150,
  w: 36,
  h: 49,
});
windows.push({
  x: 86,
  y: 150,
  w: 36,
  h: 49,
});
windows.push({
  x: 170,
  y: 150,
  w: 36,
  h: 49,
});

windows.push({
  x: 2,
  y: 234,
  w: 36,
  h: 49,
});
windows.push({
  x: 86,
  y: 234,
  w: 36,
  h: 49,
});
windows.push({
  x: 170,
  y: 234,
  w: 36,
  h: 49,
});

windows.push({
  x: 2,
  y: 316,
  w: 36,
  h: 44,
});
windows.push({
  x: 86,
  y: 316,
  w: 36,
  h: 44,
});
windows.push({
  x: 170,
  y: 316,
  w: 36,
  h: 44,
});
let centerWindow = windows[7];

let metrics;
let metricsPerUpdate;
// a number of datapoints, every datapoint having a timestamp
let metricsDatapoints;

function resetMetrics() {
  metrics = {
    countries: new Map(),
    continents: new Map(),
    ports: new Map(),
    numPackets: 0,
    numInPackets: 0,
    numOutPackets: 0,
    totalLen: 0,
    rollingTotalLen: 0,
    rollingNumPackets: 0,
  };
  metricsPerUpdate = {
    numPackets: 0.0,
    numInPackets: 0.0,
    numOutPackets: 0.0,
    totalLen: 0.0,
  };
  metricsDatapoints = {
    numPackets: [],
    totalLen: [],
  };
}
resetMetrics();

// Stores scenes in a Map to retrieve them easily by name
let scenes = new Map();

scenes.set("default_scene", new Scene());
scenes.set("numbers", new NumbersScene());
scenes.set("drops", new DropsScene());
scenes.set("ports", new PortsScene());
scenes.set("intro", new IntroScene());
scenes.set("world", new WorldScene());
scenes.set("outro", new OutroScene());

let currentScene;
let playhead = {
  scoreIndex: 0,
  state: "before start", // "before start", "playing", "crossfade", "end of score"
  currentScene: undefined,
  currentSceneName: "",
  fadingInScene: undefined,
  fadingInSceneName: undefined,
  score: score,
  reset: function () {
    this.scoreIndex = 0;
    this.state = "before start";
    this.currentScene = undefined;
    this.currentSceneName = "";
    this.fadingInScene = undefined;
    this.fadingInSceneName = undefined;
  },
};

var allSceneImages = [];
var glitchProb = 0.99;
var glitchAlpha = 0.3;

/// P5 functions

function preload() {
  antonFont = loadFont("assets/fonts/Anton-Regular.ttf");
  for (let scene of scenes.values()) {
    scene.preload();
  }
  allSceneImages.push(loadImage("assets/img/scenes/numbers1.png"))
  allSceneImages.push(loadImage("assets/img/scenes/numbers2.png"))
  allSceneImages.push(loadImage("assets/img/scenes/numbers3.png"))
  allSceneImages.push(loadImage("assets/img/scenes/numbers4.png"))
  allSceneImages.push(loadImage("assets/img/scenes/numbers5.png"))
  allSceneImages.push(loadImage("assets/img/scenes/numbers6.png"))
  allSceneImages.push(loadImage("assets/img/scenes/ports1.png"))
  allSceneImages.push(loadImage("assets/img/scenes/ports2.png"))
  allSceneImages.push(loadImage("assets/img/scenes/ports3.png"))
  allSceneImages.push(loadImage("assets/img/scenes/ports4.png"))
  allSceneImages.push(loadImage("assets/img/scenes/world1.png"))
  allSceneImages.push(loadImage("assets/img/scenes/world2.png"))
  allSceneImages.push(loadImage("assets/img/scenes/drops1.png"))
  allSceneImages.push(loadImage("assets/img/scenes/drops2.png"))
  allSceneImages.push(loadImage("assets/img/scenes/drops3.png"))
} // End Preload

function setup() {
  // Create canvas
  // The main canvas cannot be a WEBGL canvas
  canvas = createCanvas(canvasX, canvasY);

  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");

  // Calculate additional window parameters
  for (w of windows) {
    w.x *= subsampling;
    w.y *= subsampling;
    w.w *= subsampling;
    w.h *= subsampling;
    w.center = createVector(w.x + w.w / 2, w.y + w.h / 2);
    w.halfWidthSq = Math.pow(w.w / 2, 2);
    w.halfHeightSq = Math.pow(w.h / 2, 2);
    w.activity = 0;
  }

  textAlign(CENTER, CENTER);
  textFont(antonFont);

  for (let scene of scenes.values()) {
    scene.setup();
  }
} // End setup

let isStarted = false;
function BroadSignPlay() {
  isStarted = true;
  playhead.reset();
}
if (typeof BroadSignObject === "undefined") {
  BroadSignPlay();
}

function draw() {
  if (!isStarted) {
    return;
  }
  // Update time
  now = Date.now() * 0.001; // current time in seconds
  if (lastNow == 0) {
    lastNow = now;
  }
  if (firstNow == 0) {
    firstNow = now;
  }
  let dt = now - lastNow;

  // Update score
  if (playhead.state == "before start") {
    playhead.currentSceneName = playhead.score[playhead.scoreIndex].name;
    playhead.currentScene = scenes.get(playhead.currentSceneName);
    playhead.currentScene.reset(playhead.score[playhead.scoreIndex].sections);
    playhead.currentScene.play();
    playhead.countdown = playhead.score[playhead.scoreIndex].totalDuration;
    playhead.state = "playing";
  } else if (playhead.state == "playing") {
    playhead.countdown -= dt;
    if (
      playhead.countdown <= playhead.score[playhead.scoreIndex].fadeOutDuration
    ) {
      playhead.scoreIndex += 1;
      if (playhead.scoreIndex >= playhead.score.length) {
        // Loop around
        playhead.scoreIndex = 0;
      }
      if (playhead.scoreIndex < playhead.score.length) {
        if (playhead.score[playhead.scoreIndex].name == "settings") {
          // Change some settings
          if ("subsampling" in playhead.score[playhead.scoreIndex]) {
            subsampling = playhead.score[playhead.scoreIndex].subsampling;
            console.log("Set subsampling to " + subsampling);
            canvasX = 208 * subsampling;
            canvasY = 360 * subsampling;
            // Recreate every canvas
            resizeCanvas(canvasX, canvasY, true);
            for (let scene of scenes.values()) {
              scene.setup();
            }
          }
          playhead.scoreIndex += 1;
        }

        playhead.fadingInSceneName = playhead.score[playhead.scoreIndex].name;
        playhead.fadingInScene = scenes.get(playhead.fadingInSceneName);
        playhead.fadingInScene.reset(
          playhead.score[playhead.scoreIndex].sections
        );
        playhead.fadingInScene.fadeIn(playhead.countdown);
      } else {
        playhead.fadingInScene = undefined;
        playhead.fadingInSceneName = "";
      }
      playhead.state = "crossfade";
    }
  } else if (playhead.state == "crossfade") {
    playhead.countdown -= dt;
    if (playhead.countdown <= 0) {
      if (playhead.fadingInScene != undefined) {
        playhead.fadingInScene.play();
        playhead.currentScene = playhead.fadingInScene;
        playhead.currentSceneName = playhead.fadingInSceneName;
        playhead.countdown = playhead.score[playhead.scoreIndex].totalDuration;
        playhead.state = "playing";
      } else {
        playhead.state = "end of score";
      }
    }
  }

  if (playhead.state == "end of score") {
    // Reset the playhead to ths start to loop
    playhead.reset();
  }

  // Update metrics
  metricsDatapoints.numPackets = metricsDatapoints.numPackets.filter((e) => {
    return now - e.ts < 1;
  });
  metricsDatapoints.totalLen = metricsDatapoints.totalLen.filter((e) => {
    return now - e.ts < 1;
  });

  metricsDatapoints.numPackets.push({
    value: metricsPerUpdate.numPackets,
    ts: now,
  });
  metricsDatapoints.totalLen.push({
    value: metricsPerUpdate.totalLen,
    ts: now,
  });

  metricsPerUpdate.totalLen = 0;
  metricsPerUpdate.numInPackets = 0;
  metricsPerUpdate.numOutPackets = 0;
  metricsPerUpdate.numPackets = 0;

  metrics.rollingTotalLen = metricsDatapoints.totalLen.reduce((a, b) => {
    return a + b.value;
  }, 0);

  metrics.rollingNumPackets = 0;
  for (let d of metricsDatapoints.numPackets) {
    metrics.rollingNumPackets += d.value;
  }

  if(Math.random() > 0.995) {
    glitchProb = [0.85, 0.9, 0.97, 0.96, 0.98, 0.99, 0.995][Math.floor(Math.random() * 7)];
  }

  // Draw the scene(s)
  if (playhead.state == "before start") {
  } else if (playhead.state == "playing") {
    playhead.currentScene.draw(dt);

    if(doGlitch && Math.random() > glitchProb) {
      let img = allSceneImages[Math.floor(Math.random() * allSceneImages.length)];
      drawingContext.globalAlpha = glitchAlpha;
      image(img, 0, 0);
      drawingContext.globalAlpha = 1.0;
    }
  } else if (playhead.state == "crossfade") {
    if (playhead.fadingInScene != undefined) {
      if (playhead.currentScene.zIndex() > playhead.fadingInScene.zIndex()) {
        if (playhead.fadingInScene != undefined) {
          playhead.fadingInScene.draw(dt);
        }
        playhead.currentScene.draw(dt);
      } else {
        playhead.currentScene.draw(dt);
        if (playhead.fadingInScene != undefined) {
          playhead.fadingInScene.draw(dt);
        }
      }
    } else {
      playhead.currentScene.draw(dt);
    }
  } else if (playhead.state == "end of score") {
  }

  // Draw the windows
  if (drawWindows) {
    colorMode(HSL, 100);
    fill(50, 100);
    noStroke();
    for (win of windows) {
      fill(0, 100);
      rect(win.x, win.y, win.w, win.h);
      let inset = subsampling;
      fill(15, 100);
      rect(win.x + inset, win.y + inset, win.w - inset * 2, win.h - inset * 2);
      fill(30, 100);
      let crossSize = 2 * subsampling;
      rect(
        win.x + win.w / 2 - crossSize / 2,
        win.y + inset,
        crossSize,
        win.h - inset * 2
      );
    }
  }

  lastNow = now; // Set the timestamp for this update to get time between frames

  if (drawFPS) {
    textSize(12 * subsampling);
    textAlign(CENTER, CENTER);
    fill(30, 100, 50, 100);
    noStroke();
    let thisFps = frameRate();
    fps = fps * 0.95 + thisFps * 0.05;
    text(thisFps.toFixed(1), windows[12].center.x, windows[12].center.y);
    text(fps.toFixed(1), windows[13].center.x, windows[13].center.y);
  }
} // End draw

// WEBSOCKET RECEIVE PACKETS

new WebSocketClient().onmessage = (data) => {
  let internalData = JSON.parse(data.data);
  // Send the data to the current scene or to all of them?

  let continent;
  let country;
  if (
    internalData.remote_location.country != "Sweden" &&
    internalData.remote_location.country != undefined
  ) {
    country = internalData.remote_location.country;
    continent = internalData.remote_location.continent;
  } else if (internalData.local_location.country != undefined) {
    country = internalData.local_location.country;
    continent = internalData.local_location.continent;
  }

  if (playhead.state == "playing") {
    playhead.currentScene.registerPacket(internalData, country, continent);
  } else if (playhead.state == "crossfade") {
    playhead.currentScene.registerPacket(internalData, country, continent);
    if (playhead.fadingInScene != undefined) {
      playhead.fadingInScene.registerPacket(internalData, country, continent);
    }
  }

  registerMetric(internalData, country, continent);
};

// GLOBAL FUNCTIONS

function registerMetric(d, country, continent) {
  metrics.numPackets += 1;
  metrics.totalLen += d.len;
  metricsPerUpdate.numPackets += 1;
  metricsPerUpdate.totalLen += d.len;

  let countryObj;
  if (metrics.countries.has(country)) {
    countryObj = metrics.countries.get(country);
    // metrics.countries.set(country, metrics.countries.get(country) + 1);
  } else {
    countryObj = {
      in: 0,
      out: 0,
      totalLen: 0,
      numPackets: 0,
    };
    metrics.countries.set(country, countryObj);
  }
  countryObj.totalLen += d.len;
  countryObj.numPackets += 1;

  let continentObj;
  if (metrics.continents.has(continent)) {
    continentObj = metrics.continents.get(continent);
  } else {
    continentObj = {
      in: 0,
      out: 0,
      totalLen: 0,
      numPackets: 0,
    };
    metrics.continents.set(continent, continentObj);
  }
  continentObj.totalLen += d.len;
  continentObj.numPackets += 1;

  if (d.out) {
    metrics.numOutPackets += 1;
    metricsPerUpdate.numOutPackets += 1;
    countryObj.in += 1;
    continentObj.in += 1;
  } else {
    metrics.numInPackets += 1;
    metricsPerUpdate.numInPackets += 1;
    countryObj.out += 1;
    continentObj.out += 1;
  }

  let port = d.remove_port;
  if (metrics.ports.has(port)) {
    metrics.ports.set(port, metrics.ports.get(port) + 1);
  } else {
    metrics.ports.set(port, 1);
  }
  port = d.local_port;
  if (metrics.ports.has(port)) {
    metrics.ports.set(port, metrics.ports.get(port) + 1);
  } else {
    metrics.ports.set(port, 1);
  }
}
