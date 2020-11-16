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
    name: "ports",
    sections: [
      { name: "packets", duration: 20 },
      { name: "network", duration: 20 },
      { name: "fade out", duration: 5 },
    ],
  },
  // {
  //     name: "drops",
  //     sections: [
  //         {name: "in", duration: 10, region: "Sweden"},
  //         {name: "out", duration: 10, region: "Sweden"},
  //         {name: "in", duration: 10, region: "Europe"},
  //         {name: "out", duration: 10, region: "Europe"},
  //         {name: "in", duration: 10, region: "none"},
  //         {name: "out", duration: 10, region: "none"},
  //         {name: "fade out", duration: 1}
  //     ]
  // },
  {
    name: "numbers",
    sections: [
      { name: "all", duration: 10, region: "Sweden" },
      { name: "all", duration: 10, region: "Europe" },
      { name: "all", duration: 10, region: "none" },
      { name: "in", duration: 10 },
      { name: "out", duration: 10 },
      { name: "size", duration: 10 },
      { name: "fade out", duration: 10 },
    ],
  },
];

// Process the score to generate all of the non-explicit values

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
}
