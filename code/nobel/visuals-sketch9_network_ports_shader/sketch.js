// Get p5 autocompletions
/// <reference path="node_modules/@types/p5/global.d.ts" />

// Performance - Disables FES
// p5.disableFriendlyErrors = true;

/* Display some of the most used ports in a network visualisation using nodes and edges */

/// NODES AND EDGES

let selectedHue = 50;
let drawNetwork = false;
let drawParticles = false;

class Edge {
  constructor() {
    this.activity = 0.0;
    this.falloff = 0.5;
  }
  update(dt) {
    this.activity -= this.falloff * dt * 0.001;
    if (this.activity < 0) {
      this.activity = 0;
    }
  }
  draw(g, p1, p2) {
    if (drawNetwork) {
      g.stroke(this.activity * 9, 100, this.activity * 50 + 50, 100);
      g.strokeWeight(subsampling);
      g.line(p1.x, p1.y, p2.x, p2.y);
    }
  }
}

class Node {
  constructor(label, ports, pos, isWindow, windowIndex) {
    this.label = label;
    this.ports = ports;
    this.pos = pos;
    this.offsetPos = createVector(0, 0);
    this.vel = createVector(0, 0);
    this.isWindow = isWindow;
    this.windowIndex = windowIndex;
    this.activity = 0.0;
    this.falloff = 0.45;
    this.connections = [];
    this.selected = false;

    if (isWindow == true) {
      this.pos = createVector(
        windows[windowIndex].x + windows[windowIndex].w / 2,
        windows[windowIndex].y + windows[windowIndex].h / 2
      );
    }
  }
  update(dt) {
    this.activity -= this.falloff * dt * 0.001;
    if (this.activity < 0) {
      this.activity = 0;
    }
    if (this.isWindow == false) {
      let pullBack = this.offsetPos.copy().mult(-1).normalize().mult(0.001); // mult of 0.001 keeps it in check
      this.vel.add(pullBack);
      this.offsetPos.add(this.vel.copy().mult(dt));
    } else {
      windows[this.windowIndex].activity = Math.pow(this.activity, 2.0);
    }
    for (let c of this.connections) {
      c.update(dt, this.pos);
    }
  }
  drawNodes(g) {
    g.fill(
      this.activity * 9,
      70,
      (1.0 - Math.pow(1.0 - this.activity, 2.0)) * 80,
      100
    );
    g.noStroke();
    if (this.isWindow == false && drawNetwork) {
      // g.ellipse(
      //   this.pos.x + this.offsetPos.x,
      //   this.pos.y + this.offsetPos.y,
      //   10 * subsampling,
      //   10 * subsampling
      // );
    } else {
      let w = windows[this.windowIndex];
      let size = 8 * subsampling * this.activity;
      // g.rect(w.x-size, w.y-size, w.w + size + size, w.h + size + size);
      if (this.selected) {
        let size = 2 * subsampling;
        g.stroke(selectedHue + 2, 50, 60, 100);
        g.strokeWeight(subsampling * 4);
        g.noFill();
        g.rect(w.x - size, w.y - size, w.w + size + size, w.h + size + size);
      }
    }

    for (let c of this.connections) {
      c.drawNodes(g);
    }
  }
  drawEdges(g) {
    let pos = this.pos;
    if (this.isWindow == false) {
      pos = this.pos.copy().add(this.offsetPos);
    }
    for (let c of this.connections) {
      c.drawEdges(g, pos);
    }
  }
  hasPort(port) {
    for (let p of this.ports) {
      if (p == port) {
        return true;
      }
    }
    return false;
  }
  registerPort(port, previousPos) {
    // New activity on this port, let it flow through the network
    // console.log("register port " + port + " activity: " + this.activity);
    this.activity = Math.min(this.activity + (1.0 - this.activity) * 0.2, 1.0);
    if (this.isWindow == false) {
      let distSqFromOriginal =
        Math.pow(this.offsetPos.x, 2.0) + Math.pow(this.offsetPos.y, 2.0);
      let pull = this.pos
        .copy()
        .add(this.offsetPos)
        .sub(previousPos)
        .normalize()
        .mult(
          Math.max(
            Math.random() * -0.005 - distSqFromOriginal * 0.00000001,
            0.0
          )
        );
      pull.add(
        createVector(Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01)
      );
      this.vel.add(pull);
      this.vel.limit(0.05);
    }
    for (let c of this.connections) {
      if (c.hasPort(port)) {
        c.registerPort(port, this.pos);
      }
    }
  }
  createConnection(destinationNode) {
    let connection = new Connection(destinationNode, new Edge());
    this.connections.push(connection);
  }
  passParticleOn(particle) {
    let matchFound = false;
    for (let c of this.connections) {
      if (c.hasPort(particle.port)) {
        c.addParticle(particle, this.pos);
        matchFound = true;
        break;
      }
    }
    if (matchFound == false) {
      particle.connectionId = -1;
    }
  }
}

class Connection {
  static counter = 0;
  static getNewId() {
    let oldCount = Connection.counter;
    Connection.counter += 1;
    return oldCount;
  }
  constructor(node, edge) {
    this.node = node; // the destination node
    this.edge = edge;
    this.particles = [];
    this.id = Connection.getNewId();
  }
  hasPort(port) {
    return this.node.hasPort(port);
  }
  addParticle(particle, previousNodePos) {
    particle.moveToConection(this);
    this.particles.push(particle);
    // this.node.registerPort(particle.port, previousNodePos);
  }
  update(dt, previousNodePos) {
    for (let p of this.particles) {
      p.update(dt);
      if (p.pos >= 1.0) {
        this.node.registerPort(p.port, previousNodePos);
        this.node.passParticleOn(p);
      }
    }
    this.particles = this.particles.filter((p) => p.connectionId == this.id);
    this.node.update(dt);
    this.edge.update(dt);
  }
  drawNodes(g) {
    this.node.drawNodes(g);
  }
  drawEdges(g, sourceNodePos) {
    let pos = this.node.pos;
    if (this.node.isWindow == false) {
      pos = this.node.pos.copy().add(this.node.offsetPos);
    }
    this.edge.draw(g, sourceNodePos, pos);
    for (let p of this.particles) {
      p.draw(g, sourceNodePos, pos);
    }
    this.node.drawEdges(g);
  }
  registerPort(port, previousPos) {
    this.edge.activity = Math.min(this.edge.activity + 0.2, 1.0);
    // this.node.registerPort(port, previousPos);
  }
}

class ConnectionParticle {
  constructor(port, doDraw) {
    this.port = port;
    this.pos = 0;
    this.speed = 1.0;
    this.connectionId = 0;
    this.doDraw = doDraw;
  }
  moveToConection(connection) {
    this.pos = 0;
    this.connectionId = connection.id;
  }
  update(dt) {
    this.pos += this.speed * dt * 0.001;
  }
  draw(g, p1, p2) {
    if (this.doDraw) {
      if (
        fallingText.node != undefined &&
        fallingText.node.hasPort(this.port)
      ) {
        g.fill(selectedHue + 2, 50, 60, 100);
        // g.fill(selectedHue, 100, 55, 100);
      } else {
        g.fill(2, 100, 55, 100);
      }

      g.noStroke();
      let x = p1.x + (p2.x - p1.x) * this.pos;
      let y = p1.y + (p2.y - p1.y) * this.pos;
      g.ellipse(x, y, 4 * subsampling, 4 * subsampling);
    }
  }
}

let metrics = {
  countries: new Map(),
  continents: new Map(),
  ports: new Map(),
  numPackets: 0,
  numInPackets: 0,
  numOutPackets: 0,
  totalLen: 0,
};

let metricsPerUpdate = {
  numPackets: 0.0,
  numInPackets: 0.0,
  numOutPackets: 0.0,
  totalLen: 0.0,
};

// a number of datapoints, every datapoint having a timestamp
let metricsDatapoints = {
  numPackets: [],
  totalLen: [],
};

function registerMetric(d, country, continent) {
  metrics.numPackets += 1;
  metrics.totalLen += d.len;
  metricsPerUpdate.numPackets += 1;
  metricsPerUpdate.totalLen += d.len;
  if (d.out) {
    metrics.numOutPackets += 1;
    metricsPerUpdate.numOutPackets += 1;
  } else {
    metrics.numInPackets += 1;
    metricsPerUpdate.numInPackets += 1;
  }
  if (metrics.countries.has(country)) {
    metrics.countries.set(country, metrics.countries.get(country));
  } else {
    metrics.countries.set(country, 1);
  }
  if (metrics.continents.has(continent)) {
    metrics.continents.set(continent, metrics.continents.get(continent));
  } else {
    metrics.continents.set(continent, 1);
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

///////////////////////// GUI Element Global Variables///////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////// Global Variables///////////////////////////////////////

var subsampling = 4;
var canvasX = 208 * subsampling;
var canvasY = 360 * subsampling;

let windows = [];
windows.push({ x: 2, y: 0, w: 36, h: 35 });
windows.push({ x: 86, y: 0, w: 36, h: 35 });
windows.push({ x: 170, y: 0, w: 36, h: 35 });

windows.push({ x: 2, y: 66, w: 36, h: 49 });
windows.push({ x: 86, y: 66, w: 36, h: 49 });
windows.push({ x: 170, y: 66, w: 36, h: 49 });

windows.push({ x: 2, y: 150, w: 36, h: 49 });
windows.push({ x: 86, y: 150, w: 36, h: 49 });
windows.push({ x: 170, y: 150, w: 36, h: 49 });

windows.push({ x: 2, y: 234, w: 36, h: 49 });
windows.push({ x: 86, y: 234, w: 36, h: 49 });
windows.push({ x: 170, y: 234, w: 36, h: 49 });

windows.push({ x: 2, y: 316, w: 36, h: 44 });
windows.push({ x: 86, y: 316, w: 36, h: 44 });
windows.push({ x: 170, y: 316, w: 36, h: 44 });

let centerWindow = windows[7];

let columns = [];
columns.push({ x: 38, y: 0, w: 48, h: 360 });
columns.push({ x: 122, y: 0, w: 48, h: 360 });

let lastChange = Date.now();
let lastNow = 0;
let firstNow = 0;

let lastCountry = "";

let myFont;

let averageLen = 0;
let step = 2;
let pixelSize = 4;
let zoom = 1;
let backgroundAlpha = 0;
let backgroundAlphaChange = 0.01;

let drawMistyShader = false;
let mistyShader;

let lightsShader;

let originNode;
let labeledNodes = [];

const lines = [
  48 * subsampling,
  130 * subsampling,
  214 * subsampling,
  297 * subsampling,
];

let fallingText = {
  node: undefined,
  nodeIndex: -1,
  textSize: 13 * subsampling,
  textSizeGrowth: 20 * subsampling,
  x: canvasX / 2,
  y: canvasY + 1,
  vel: canvasY / 3.0,
  string: "",
  update: function (dt) {
    this.y += this.vel * dt;
    this.textSize += this.textSizeGrowth * dt;
    if (this.y > canvasY * 1.3) {
      this.textSize = 11 * subsampling;
      this.y = 0;
      // this.nodeIndex = (this.nodeIndex + 1) % labeledNodes.length;
      this.nodeIndex = Math.floor(Math.random() * labeledNodes.length);
      this.setNewNode(labeledNodes[this.nodeIndex]);
      this.vel = canvasY / (2.0 * Math.random() + 2.0);
    }
  },
  setNewNode: function (newNode) {
    if (this.node != undefined) {
      this.node.selected = false;
    }
    this.node = newNode;
    this.node.selected = true;
    this.string = this.node.label;
  },
  draw: function (g) {
    if (this.node != undefined) {
      g.fill(
        selectedHue + 2,
        50,
        this.node.activity * 50 + 50,
        (1.0 - Math.pow(this.y / canvasY, 2.0)) * 100.0
      );
      g.noStroke();
    }

    let texts = this.string;
    g.textSize(this.textSize);
    if (typeof texts === "string" || texts instanceof String) {
      g.text(this.string, this.x, this.y);
    } else if (Array.isArray(texts)) {
      for (let i = 0; i < texts.length; i++) {
        g.text(texts[i], this.x, lines[i + 1]); // this.y + this.textSize * i * 1.5);
      }
    }
  },
};

let pg;
let textPg;
let shaderCanvas;
let canvasRotation = 0;

// setInterval(() => {
//   drawMistyShader = !drawMistyShader;
//   if(drawMistyShader) {
//     shaderCanvas.clear();
//     shaderCanvas.translate(canvasX/2, canvasY/2);
//     shaderCanvas.image(pg, 0, 0);
//   }
// }, 1000);

// Preload Function
function preload() {
  myFont = loadFont("assets/fonts/Anton-Regular.ttf");
  mistyShader = loadShader("assets/standard.vert", "assets/misty.frag");
  lightsShader = loadShader("assets/standard.vert", "assets/lights.frag");
} // End Preload

/////////////////////////////////////////////////////////////////////////////////////////////

// Setup Function
function setup() {
  // Create canvas
  canvas = createCanvas(canvasX, canvasY, WEBGL);

  // Send canvas to CSS class through HTML div
  canvas.parent("sketch-holder");

  let sketchHolder = document.getElementById("sketch-holder");
  sketchHolder.onclick = (e) => {
    console.log(metrics.ports);
    const mapSort1 = new Map(
      [...metrics.ports.entries()].sort((a, b) => b[1] - a[1])
    );
    console.log(mapSort1);
  };

  // Calculate window center points
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

  let rows = [
    windows[0].center.copy().add(windows[1].center).x / 2,
    windows[1].center.copy().add(windows[2].center).x / 2,
  ];

  for (let i = 0; i < windows.length - 2; i++) {
    let center = (windows[i].center.y + windows[i + 1].center.y) / 2;
    console.log("center: " + (center / height - 0.5));
  }

  pg = createGraphics(canvasX, canvasY);
  textPg = createGraphics(canvasX, canvasY);
  shaderCanvas = createGraphics(canvasX, canvasY, WEBGL);

  background("#000000");

  // textFont('sans');
  textSize(24);
  textAlign(CENTER, CENTER);
  textFont(myFont);
  textPg.textAlign(CENTER, CENTER);
  textPg.textFont(myFont);

  let allPorts = [
    443,
    80,
    23,
    53,
    9001,
    22,
    993,
    9000,
    6881,
    1194,
    4500,
    3478,
    123,
    389,
    3306,
    25,
  ];
  originNode = new Node("ALL PACKETS", allPorts, createVector(0, 0), true, 7);

  let leftTopNode1 = new Node(
    "",
    [1194, 23, 22],
    createVector(rows[0], lines[1]),
    false,
    -1
  );
  originNode.createConnection(leftTopNode1);
  let leftTopNode2 = new Node(
    "",
    [22],
    createVector(rows[0], lines[0]),
    false,
    -1
  );
  leftTopNode1.createConnection(leftTopNode2);
  let openVPNNode = new Node(
    ["Privacy", "OpenVPN"],
    [1194],
    createVector(0, 0),
    true,
    3
  );
  leftTopNode1.createConnection(openVPNNode);
  let telnetNode = new Node(
    ["Maintenance", "Telnet"],
    [23],
    createVector(0, 0),
    true,
    4
  );
  leftTopNode1.createConnection(telnetNode);
  let sshNode = new Node(
    ["Maintenance", "SSH"],
    [22],
    createVector(0, 0),
    true,
    0
  );
  leftTopNode2.createConnection(sshNode);

  let rightTopNode1 = new Node(
    "",
    [443, 80, 123, 4500, 3478],
    createVector(rows[1], lines[1]),
    false,
    -1
  );
  originNode.createConnection(rightTopNode1);
  let rightTopNode2 = new Node(
    "",
    [443, 80],
    createVector(rows[1], lines[0]),
    false,
    -1
  );
  rightTopNode1.createConnection(rightTopNode2);
  let httpsNode = new Node(
    ["Web", "HTTPS"],
    [443],
    createVector(0, 0),
    true,
    1
  );
  rightTopNode2.createConnection(httpsNode);
  let httpNode = new Node(["Web", "HTTP"], [80], createVector(0, 0), true, 2);
  rightTopNode2.createConnection(httpNode);
  let ntpNode = new Node(
    ["Time Sync", "NTP"],
    [123],
    createVector(0, 0),
    true,
    5
  );
  rightTopNode1.createConnection(ntpNode);
  let natTraversalNode = new Node(
    ["Infrastructure", "NAT Traversal"],
    [4500, 3478],
    createVector(0, 0),
    true,
    8
  );
  rightTopNode1.createConnection(natTraversalNode);

  let leftBottomNode1 = new Node(
    "",
    [53, 389, 993, 25],
    createVector(rows[0], lines[2]),
    false,
    -1
  );
  originNode.createConnection(leftBottomNode1);
  let leftBottomNode2 = new Node(
    "",
    [993, 25],
    createVector(rows[0], lines[3]),
    false,
    -1
  );
  leftBottomNode1.createConnection(leftBottomNode2);
  let dnsNode = new Node(["Web", "DNS"], [53], createVector(0, 0), true, 6);
  leftBottomNode1.createConnection(dnsNode);
  let ldapNode = new Node(
    ["Security", "LDAP"],
    [389],
    createVector(0, 0),
    true,
    9
  );
  leftBottomNode1.createConnection(ldapNode);
  let imapsNode = new Node(
    ["E-mail", "IMAPS"],
    [993],
    createVector(0, 0),
    true,
    12
  );
  leftBottomNode2.createConnection(imapsNode);
  let smtpNode = new Node(
    ["E-mail", "SMTP"],
    [25],
    createVector(0, 0),
    true,
    13
  );
  leftBottomNode2.createConnection(smtpNode);

  let rightBottomNode1 = new Node(
    "",
    [3306, 9000, 6881, 9001],
    createVector(rows[1], lines[2]),
    false,
    -1
  );
  originNode.createConnection(rightBottomNode1);
  let rightBottomNode2 = new Node(
    "",
    [9001],
    createVector(rows[1], lines[3]),
    false,
    -1
  );
  rightBottomNode1.createConnection(rightBottomNode2);
  let mysqlNode = new Node(
    ["Data", "MySQL"],
    [3306],
    createVector(0, 0),
    true,
    10
  );
  rightBottomNode1.createConnection(mysqlNode);
  let bittorrentNode = new Node(
    ["Transmission", "BitTorrent"],
    [9000, 6881],
    createVector(0, 0),
    true,
    11
  );
  rightBottomNode1.createConnection(bittorrentNode);
  let torNode = new Node(
    ["Privacy", "Tor"],
    [9001],
    createVector(0, 0),
    true,
    14
  );
  rightBottomNode2.createConnection(torNode);

  labeledNodes = [
    openVPNNode,
    telnetNode,
    sshNode,
    httpsNode,
    httpNode,
    ntpNode,
    natTraversalNode,
    dnsNode,
    ldapNode,
    imapsNode,
    smtpNode,
    mysqlNode,
    bittorrentNode,
    torNode,
  ];
  // console.log("has 80: " + originNode.hasPort(80));
  // Set canvas framerate
  // frameRate(25);
} // End Setup

/////////////////////////////////////////////////////////////////////////////////////////////
let lastOneSecond = 0;
let drawWindows = true;
// setInterval(()=>{drawWindows = !drawWindows;}, 1000)
// Draw Function
function draw() {
  push();
  translate(-width / 2, -height / 2, 0);

  let now = Date.now(); // current time in milliseconds
  if (lastNow == 0) {
    lastNow = now;
  }
  if (firstNow == 0) {
    firstNow = now;
  }
  let dt = now - lastNow;

  // Update metrics

  metricsDatapoints.numPackets = metricsDatapoints.numPackets.filter((e) => {
    return now - e.ts < 1000;
  });
  metricsDatapoints.totalLen = metricsDatapoints.totalLen.filter((e) => {
    return now - e.ts < 1000;
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

  // let rollingNumPackets = metricsDatapoints.numPackets.reduce((a, b) => { return a + b.value; }, 0);
  let rollingTotalLen = metricsDatapoints.totalLen.reduce((a, b) => {
    return a + b.value;
  }, 0);

  let rollingNumPackets = 0;
  for (let d of metricsDatapoints.numPackets) {
    rollingNumPackets += d.value;
  }

  // Clear if needed
  // clear();
  // background("rgba(1.0,1.0,1.0,1.0)");

  // for(let i = 0; i < 100; i++) {
  //   addParticle(Math.pow(Math.random(), 2) * 20000);
  // }
  colorMode(HSL, 100);
  background(0, 100, 0, 100);

  if (!drawMistyShader) {
    // let backgroundHue = Math.min((rollingTotalLen / 1000000.0 - 2.0) * 8.0, 20.0) + hueOffset;
    let backgroundHue = Math.min(
      (rollingTotalLen / 1000000.0 - 2.0) * 3.0,
      9.0
    );
    // pg.background(
    //   9.0 - backgroundHue,
    //   100,
    //   100 - pow(backgroundHue, 3.0) * 0.03,
    //   6
    // );
    pg.background(0, 0, 100 - pow(backgroundHue, 3.0) * 0.5, 6);

    fill(75, 100, 0, 100);
    let totalLen = formatBytes(rollingTotalLen);

    let ratioThatAreHTTP = metrics.ports.get(80) / metrics.numPackets;
    let ratioThatAreHTTPS = metrics.ports.get(443) / metrics.numPackets;

    pg.colorMode(HSL, 100);
    originNode.update(dt);
    originNode.drawEdges(pg);
    originNode.drawNodes(pg);

    lightsShader.setUniform("iResolution", [canvasX, canvasY]);
    lightsShader.setUniform("iTime", (now - firstNow) * 0.001);
    lightsShader.setUniform("windows1", [
      windows[0].activity,
      windows[1].activity,
      windows[2].activity,
    ]);
    lightsShader.setUniform("windows2", [
      windows[3].activity,
      windows[4].activity,
      windows[5].activity,
    ]);
    lightsShader.setUniform("windows3", [
      windows[6].activity,
      windows[7].activity,
      windows[8].activity,
    ]);
    lightsShader.setUniform("windows4", [
      windows[9].activity,
      windows[10].activity,
      windows[11].activity,
    ]);
    lightsShader.setUniform("windows5", [
      windows[12].activity,
      windows[13].activity,
      windows[14].activity,
    ]);
    shaderCanvas.clear();
    shaderCanvas.shader(lightsShader);
    // shaderCanvas.rect(0, 0, width, height);
    shaderCanvas.quad(-1, -1, 1, -1, 1, 1, -1, 1);
    image(shaderCanvas, 0, 0);

    // textPg.translate(-width/2,-height/2,0);
    textPg.colorMode(HSL, 100);
    textPg.noStroke();
    textPg.clear();
    fallingText.update(dt * 0.001);
    fallingText.draw(textPg);

    image(pg, 0, 0);

    image(shaderCanvas, 0, 0);
    image(textPg, 0, 0);
  }

  if (drawMistyShader) {
    // shader() sets the active shader with our shader
    shaderCanvas.shader(mistyShader);

    // lets just send the cam to our shader as a uniform
    mistyShader.setUniform("tex0", pg);
    mistyShader.setUniform("time", now * 0.001);
    mistyShader.setUniform("resolution", [canvasX, canvasY]);
    mistyShader.setUniform("alphaFadeAmount", 0.001);
    mistyShader.setUniform("brightnessFadeAmount", 0.001);

    // rect gives us some geometry on the screen
    shaderCanvas.rect(0, 0, width, height);
    pg.image(shaderCanvas, 0, 0);
    image(shaderCanvas, 0, 0);
    // image(pg, 0, 0);
  }

  // Draw the windows
  if (drawWindows) {
    fill(50, 100);
    noStroke();
    for (win of windows) {
      fill(0, 100);
      rect(win.x, win.y, win.w, win.h);
      let inset = 4;
      fill(15, 100);
      rect(win.x + inset, win.y + inset, win.w - inset * 2, win.h - inset * 2);
      fill(30, 100);
      let crossSize = 10;
      rect(
        win.x + win.w / 2 - crossSize / 2,
        win.y + inset,
        crossSize,
        win.h - inset * 2
      );
      // rect(win.x, win.y + win.h/2 - (crossSize/2), win.w, crossSize);
    }
  }

  // let numCallsPerSecond = 1.0/(dt*0.001);
  // console.log(numCallsPerSecond);
  // let coeff = Math.pow(0.001, 1.0/numCallsPerSecond); // The coefficient for 60db falloff in a second
  // metricsPerUpdate.totalLen *= coeff;
  // metricsPerUpdate.numInPackets *= coeff;
  // metricsPerUpdate.numOutPackets *= coeff;
  // metricsPerUpdate.numPackets *= coeff;

  // if (Math.random() > 0.95) {
  //   drawNetwork = true;
  // } else {
  //   drawNetwork = false;
  // }
  if (Math.random() > 0.9) {
    drawParticles = !drawParticles;
  }

  lastNow = now;
  // console.log("num packets: " + num + " elements in particles: " + particles.size);
  pop();
} // End Draw

/////////////////////////////////////////////////////////////////////////////////////////////

// Helper functions

function getFlowfieldForce(pos, vectors) {
  var x = floor(pos.x / scl);
  var y = floor(pos.y / scl);
  var index = x + y * cols;
  var force = vectors[index];
  return force;
}

function windowContains(win, pos) {
  if (
    pos.x >= win.x &&
    pos.x <= win.x + win.w &&
    pos.y >= win.y &&
    pos.y <= win.y + win.h
  ) {
    return true;
  } else {
    return false;
  }
}

const FORCE = 10;
function windowForce(win, pos) {
  let distX = win.center.x - pos.x;
  let distY = win.center.y - pos.y;
  let vel = createVector(0, 0);
  if (Math.abs(distX) < win.w / 2 && Math.abs(distY) < win.h / 2) {
    if (distX < 0) {
      vel.x = FORCE;
    } else {
      vel.x = -FORCE;
    }
    if (distY < 0) {
      vel.y = FORCE;
    } else {
      vel.y = -FORCE;
    }
  }
  return vel;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

//// RECEIVE WEBSOCKET DATA

let num = 0;
new WebSocketClient().onmessage = (data) => {
  if (num < 10) {
    console.log(data);
    console.log(JSON.parse(data.data));
  }
  let internalData = JSON.parse(data.data);
  let continent;
  if (
    internalData.remote_location.country != "Sweden" &&
    internalData.remote_location.country != undefined
  ) {
    lastCountry = internalData.remote_location.country;
    continent = internalData.remote_location.continent;
  } else if (internalData.local_location.country != undefined) {
    lastCountry = internalData.local_location.country;
    continent = internalData.local_location.continent;
  }

  registerMetric(internalData, lastCountry, continent);
  // addParticle(internalData.len);
  if (originNode != undefined) {
    if (originNode.hasPort(internalData.local_port)) {
      // originNode.registerPort(internalData.local_port);
      originNode.passParticleOn(
        new ConnectionParticle(internalData.local_port, drawParticles)
      );
    }
    if (originNode.hasPort(internalData.remove_port)) {
      // originNode.registerPort(internalData.remove_port);
      originNode.passParticleOn(
        new ConnectionParticle(internalData.remove_port, drawParticles)
      );
    }
  }

  num++;
};
