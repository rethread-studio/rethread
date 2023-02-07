
const state = {
    backgroundCol: "#000000",
    frameRate: 60,
    intervalTime: 10,
    sampleSize: 10,
    filterSampleSize: { width: 250, height: 250 },
    counterFontSize: 900,
    status: "IDLE",
    paddingTopPercent: 0.15,// 0.2175,
    heightPercent: 0.5648,
    imagePadding: {
        paddingRight: 30,
    }
}

let filtersToApply = [];

let photograph;
let canvas;
let pixelSampleSize = { width: state.sampleSize, height: state.sampleSize };

let filter;
let intervalId = null;
let particles = [];
let images;

let appTimer = null;

let isButtonOn = false;



