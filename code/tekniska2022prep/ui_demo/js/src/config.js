
const state = {
    backgroundCol: "#000000",
    frameRate: 60,
    intervalTime: 50,
    sampleSize: 10,

}

let filtersToApply = [];

let photograph;
let canvas;
let pixelSampleSize = { width: state.sampleSize, height: state.sampleSize };

let filter;
let intervalId = null;
let particles = [];
let images;

