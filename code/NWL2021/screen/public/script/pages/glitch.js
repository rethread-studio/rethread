

const gcanvas = document.getElementById("glitch");
const gctx = canvas.getContext("2d");
const glitches = [];

function initGlitch() {
    const width = game.setup.unitSize * game.setup.width;
    const height = game.setup.unitSize * game.setup.height;

    gcanvas.width = width * config.renderScale;
    gcanvas.height = height * config.renderScale;
    gcanvas.style.width = `${width}px`;
    gcanvas.style.height = `${height}px`;

    dummyPlayer2.x = game.setup.width - 1;
    dummyPlayer2.y = game.setup.height - 1;
}

function clearGlitchCanvas() {
    glitches = [];
    gctx.clearRect(0, 0, canvas.width, canvas.height);
}

//a glictch has
// image url
// type: 1,2,3,4
// posx
// posy
// rotation

function newGlith() {

}

function addGlitch() {

}