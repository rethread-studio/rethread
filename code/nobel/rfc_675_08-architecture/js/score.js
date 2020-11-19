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
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "world",
    sections: [
      { name: "SWEDEN", duration: 8 },
      { name: "EU", duration: 10 },
      { name: "AME", duration: 10 },
      { name: "AS", duration: 10 },
    ],
  },
  {
    name: "ports",
    sections: [
      { name: "in", duration: 10, region: "Sweden" },
      { name: "in", duration: 10, region: "Sweden" },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "in", duration: 1, region: "Sweden" },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "drops",
    sections: [
      { name: "in", duration: 12, region: "Sweden" },
      { name: "out", duration: 12, region: "Sweden" },
      { name: "in", duration: 16, region: "Europe" },
      { name: "out", duration: 16, region: "Europe" },
      { name: "in", duration: 20, region: "none" },
      { name: "out", duration: 20, region: "none" },
      { name: "fade out", duration: 1 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 1 },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "numbers",
    sections: [
      { name: "all", duration: 10, region: "Sweden", speed: 0.5 },
      { name: "all", duration: 13, region: "Europe", speed: 0.8 },
      { name: "all", duration: 18, region: "The World", speed: 1.1 },
      {
        name: "in",
        duration: 14,
        region: "The World",
        textLimit: 8,
        speed: 1.0,
      },
      {
        name: "out",
        duration: 18,
        region: "The World",
        textLimit: 4,
        speed: 1.5,
      },
      {
        name: "size",
        duration: 20,
        startTextLimit: 4,
        endTextLimit: 2,
        startSpeed: 0.4,
        endSpeed: 1.5,
      },
      {
        name: "multinumbers",
        duration: 15,
        region: "none",
        textLimit: 0,
        startSpeed: 1.5,
        endSpeed: 1.2,
      },
      {
        name: "pre fade out",
        textLimit: 0,
        duration: 5,
        startSpeed: 1.5,
        endSpeed: 0.4,
      },
      { name: "fade out", duration: 20 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 1 },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "ports",
    sections: [
      { name: "network", duration: 10, pullBackCoeff: 10.0 },
      { name: "packets", duration: 20 },
      { name: "network", duration: 2, pullBackCoeff: 1000.0 },
      { name: "network", duration: 2, pullBackCoeff: 1.0 },
      { name: "network", duration: 1, pullBackCoeff: 100.0 },
      { name: "network", duration: 1, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.5, pullBackCoeff: 100.0 },
      { name: "network", duration: 10 },
      { name: "packets", duration: 4, pullBackCoeff: 0.1 },
      { name: "network", duration: 3, pullBackCoeff: 0.05 },
      { name: "packets", duration: 1, pullBackCoeff: 0.01 },
      { name: "network", duration: 1, pullBackCoeff: 0.005 },
      { name: "network", duration: 0.5, pullBackCoeff: 1000.0 },
      { name: "packets", duration: 2, pullBackCoeff: 0.002 },
      { name: "network", duration: 1, pullBackCoeff: 100.0 },
      { name: "packets", duration: 1, pullBackCoeff: 1.0 },
      { name: "network", duration: 0.5, pullBackCoeff: 1000.0 },
      { name: "packets", duration: 0.5, pullBackCoeff: 0.0 },
      { name: "network", duration: 0.5, pullBackCoeff: 1000.0 },
      { name: "fade out", duration: 5 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 1 },
      { name: "fade out", duration: 7 },
    ],
  },
  // {
  //   name: "settings",
  //   subsampling: 2,
  // },
  {
    name: "drops",
    sections: [
      { name: "in", duration: 10, region: "Sweden" },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 1 },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "numbers",
    sections: [
      { name: "all", duration: 10, region: "Sweden" },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 1 },
      { name: "fade out", duration: 7 },
    ],
  },
  {
    name: "ports",
    sections: [
      { name: "network", duration: 10, pullBackCoeff: 10.0 },
      { name: "packets", duration: 10, pullBackCoeff: 10.0 },
      { name: "fade out", duration: 5 },
    ],
  },
  {
    name: "intro",
    sections: [
      { name: "transition", duration: 1 },
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
    totalDuration += section.duration;
    if (section.name == "fade out") {
      fadeOutDuration = section.duration;
    }
  }
  mvt.totalDuration = totalDuration;
  mvt.fadeOutDuration = fadeOutDuration;
  scoreDuration += totalDuration;
}
console.log(
  "Score duration: " + scoreDuration + "s = " + scoreDuration / 60 + "min"
);
