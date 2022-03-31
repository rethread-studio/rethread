const IDDLE = "iddle";
const MOVE = "move";

const movement = {
    "PERPIXEL": "per_pixel",
    "ALLPIXELS": "all_pixels"
}

const state = {
    status: "PIXELDETAIL",
    backgroundCol: "#000000",
    frameRate: 60
}

let pixelImage;
let img;
let canvas;
let objectsToRender = [];

let speed1 = {};
let speed2 = {};

let particles = [];