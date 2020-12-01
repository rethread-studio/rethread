// This file contains the score for RFC:675:08

// Each "movement" is connected to a scene and contains sections.
// All durations are in seconds.
// Each entry is an object containing
// - scene name (the name of its key in the Map())
// - total scene duration (generated from the total duration of the sections)
// - fade out duration (taken from the section called "fade out")
// - an array of the sections contained in the scene (passed into the scene when it is started)
//     Each section is an object containing
//     - section name (e.g. "incoming", "fade out")
//     - section duration

// Fade out is not a section, it is instead triggered
var score = [
  {
    name: "intro",
    sections: [
      { name: "in", duration: 3 },
      { name: "fade out", duration: 1.5 },
    ],
  },
  {
    name: "world",
    sections: [
      { name: "SWEDEN", duration: 20 },
      { name: "EU", duration: 25 },
      { name: "AME", duration: 28 },
      { name: "AS", duration: 30 },
      { name: "fade out", duration: 2 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 2.5 },
      { name: "fade out", duration: 2 },
    ],
  },
  {
    name: "numbers",
    sections: [
      {
        name: "in",
        duration: 18,
        region: "The World",
        textLimit: 100,
        startSpeed: 0.9,
        endSpeed: 1.2,
      },
      {
        name: "out",
        duration: 18,
        region: "The World",
        textLimit: 100,
        speed: 1.5,
        startSpeed: 1.4,
        endSpeed: 1.7,
      },
      {
        name: "size",
        duration: 20,
        startTextLimit: 9,
        endTextLimit: 3.5,
        startSpeed: 0.4,
        endSpeed: 2.0,
      },
      {
        name: "multinumbers",
        duration: 30,
        region: "none",
        textLimit: 2,
        startSpeed: 1.5,
        endSpeed: 1.2,
      },
      {
        name: "pre fade out",
        startTextLimit: 2,
        endTextLimit: 9,
        duration: 10,
        startSpeed: 1.5,
        endSpeed: 0.4,
      },
      { name: "fade out", duration: 10 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "intro", duration: 3 },
      { name: "fade out", duration: 2 },
    ],
    vibrating: true,
  },
  {
    name: "drops",
    sections: [
      { name: "in", duration: 12, region: "Sweden" },
      { name: "in", duration: 16, region: "Europe" },
      { name: "in", duration: 20, region: "none" },
      { name: "out", duration: 12, region: "Sweden" },
      { name: "out", duration: 16, region: "Europe" },
      { name: "out", duration: 20, region: "none" },
      { name: "fade out", duration: 4 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 3 },
      { name: "fade out", duration: 1 },
    ],
  },
  {
    name: "ports",
    sections: [
      { name: "network", duration: 5, pullBackCoeff: 10.0 },
      { name: "add nodes", maxDistance: 60, minDistance: 50 },
      { name: "packets", duration: 5, pullBackCoeff: 10.0 },
      { name: "network", duration: 5, pullBackCoeff: 10.0 },
      { name: "add nodes", maxDistance: 80, minDistance: 75 },
      { name: "packets", duration: 1, pullBackCoeff: 10.0 },
      { name: "network", duration: 0.3, pullBackCoeff: 40.0 },
      { name: "packets", duration: 1 },
      { name: "network", duration: 0.3, pullBackCoeff: 60.0 },
      { name: "packets", duration: 2 },
      { name: "network", duration: 0.3, pullBackCoeff: 70.0 },
      { name: "packets", duration: 0.3 },
      { name: "network", duration: 0.3, pullBackCoeff: 100.0 },
      { name: "packets", duration: 0.3 },
      { name: "network", duration: 0.3, pullBackCoeff: 200.0 },
      { name: "packets", duration: 0.2 },
      { name: "network", duration: 0.2, pullBackCoeff: 300.0 },
      { name: "packets", duration: 0.2 },
      { name: "network", duration: 0.2, pullBackCoeff: 400.0 },
      { name: "packets", duration: 5 },
      { name: "network", duration: 2, pullBackCoeff: 400.0 },

      { name: "network", duration: 4, pullBackCoeff: 30.0, randomVelAmount: 0.1 },
      { name: "network", duration: 1, pullBackCoeff: 3.0, randomVelAmount: 3.0 },
      { name: "network", duration: 1, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.5, pullBackCoeff: 50.0 },
      { name: "network", duration: 10, drawShader: false },
      { name: "packets", duration: 4, pullBackCoeff: 1, drawShader: false },
      { name: "network", duration: 3, pullBackCoeff: 0.5, drawShader: false },
      { name: "packets", duration: 1, pullBackCoeff: 10.0, drawShader: false },
      { name: "network", duration: 1, pullBackCoeff: 0.5, drawShader: false },
      { name: "network", duration: 0.5, pullBackCoeff: 600.0, drawShader: false },
      { name: "packets", duration: 2, pullBackCoeff: 0.002 },
      { name: "packets", duration: 0.2, pullBackCoeff: 600.0, drawShader: false },
      { name: "network", duration: 1, pullBackCoeff: 100.0 },
      { name: "packets", duration: 1, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.5, pullBackCoeff: 200.0, randomVelAmount: 30.0 },
      { name: "packets", duration: 2.0, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 30.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 30.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 30.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 300.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 300.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 300.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 1000.0 },
      { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
      { name: "network", duration: 3.2, pullBackCoeff: 0.0, randomVelAmount: 3000.0 },
      { name: "fade out", duration: 2.0 },
    ],
  },
  {
    name: "outro",
    sections: [
      { name: "in", duration: 4 },
      { name: "fade out", duration: 7 },
    ],
  },
];

// Process the score to generate all of the non-explicit values
let scoreDuration = 0;
for (let mvt of score) {
  let totalDuration = 0;
  let fadeOutDuration = 0;
  for (let section of mvt.sections) {
    if ("duration" in section) {
      totalDuration += section.duration;
      if (section.name == "fade out") {
        fadeOutDuration = section.duration;
      }
    }
  }
  mvt.totalDuration = totalDuration;
  mvt.fadeOutDuration = fadeOutDuration;
  scoreDuration += totalDuration;
}
console.log(
  "Score duration: " + scoreDuration + "s = " + scoreDuration / 60 + "min"
);
