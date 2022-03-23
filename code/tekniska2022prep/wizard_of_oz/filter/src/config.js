

const state = {
    backgroundCol: "#000000",
    frameRate: 60,
    intervalTime: 50,
}



let pixelImage;
let empyImg1, empyImg2, empyImg3, empyImg4;
let img;
let canvas;
let pixelSampleSize = { width: 20, height: 20 };


let filter;

let intervalId = null;

let particles = [];