// random slideshow of images, videos and live generative art

let artworks;
let currentArtwork;
let iframeElement, imgElement, pElement;

const N_FRAMES = 3600;

function preload() {
    artworks = loadStrings("slideshow.txt");
}

function setup() {
    frameCount = N_FRAMES-1;
    iframeElement = document.getElementsByTagName("iframe")[0];
    imgElement = document.getElementsByTagName("img")[0];
    pElement = document.getElementsByTagName("p")[0];

    artworks = artworks.filter(str => str[0] != "#"); // remove comments
}

function draw() {
    if (frameCount % N_FRAMES == 0) {
        let newArtwork;
        do {
            newArtwork = random(artworks);
        } while (newArtwork == currentArtwork)
        currentArtwork = newArtwork;
        console.log(newArtwork);
        let [url, description] = currentArtwork.split(",");
        if (url.slice(-3) === "jpg" || url.slice(-3) === "png") {
            iframeElement.src = "";
            imgElement.src = url;
            iframeElement.style.display = "none";
            imgElement.style.display = "block";
        } else {
            iframeElement.src = url;
            imgElement.src = "";
            iframeElement.style.display = "block";
            imgElement.style.display = "none";
        }
        if (description) {
            pElement.innerHTML = description;
            imgElement.style.height = "90%";
            iframeElement.style.height = "90%";
            pElement.style.height = "10%";
        } else {
            pElement.innerHTML = "";
            imgElement.style.height = "100%";
            iframeElement.style.height = "100%";
            pElement.style.height = "0";
        }
    }
}

function mouseClicked() {
    frameCount = N_FRAMES-1;
}