

const gcanvas = document.getElementById("glitch");
const gctx = canvas.getContext("2d");
const glitchConfig = {
    glitches: [],
    counter: 0,
    limit: 10,
    view: false,
    rotation: [0, 90, 180, 360],
    position: {
        x: 0,
        y: 0
    },
    cropPositions: []

}

function initGlitch() {
    const width = game.setup.unitSize * game.setup.width;
    const height = game.setup.unitSize * game.setup.height;

    gcanvas.width = width * config.renderScale;
    gcanvas.height = height * config.renderScale;
    gcanvas.style.width = `${width}px`;
    gcanvas.style.height = `${height}px`;

    dummyPlayer2.x = game.setup.width - 1;
    dummyPlayer2.y = game.setup.height - 1;

    glitchConfig.position = {
        x: game.setup.width - 1,
        y: game.setup.height - 1,
    }

    glitchConfig.cropPositions = [
        { x: 0, y: 0 },
        { x: game.setup.unitSize / 2, y: 0 },
        { x: 0, y: game.setup.unitSize / 2 },
        { x: game.setup.unitSize / 2, y: game.setup.unitSize / 2 },
    ]
}

function clearGlitchCanvas() {
    glitchConfig.glitches = [];
    gctx.clearRect(0, 0, canvas.width, canvas.height);
}



function getGlitchPos() {
    glitchConfig.position = {
        x: glitchConfig.position.y - 1 < 0 ? glitchConfig.position.x - 1 < 0 ? game.setup.width - 1 : glitchConfig.position.x - 1 : glitchConfig.position.x,
        y: glitchConfig.position.y - 1 < 0 ? game.setup.height - 1 : glitchConfig.position.y - 1,
    }
    return {
        x: glitchConfig.position.x,
        y: glitchConfig.position.y
    }
}

function newGlitch(_playerId) {
    if (game._gameState == undefined) return;
    const player = game.players.find(p => p.userID == _playerId);
    if (player == undefined || player.laureate == undefined) return null;
    const { x, y } = getGlitchPos();

    return {
        x: x,
        y: y,
        imagePath: player.laureate.imagePath,
        cropPos: glitchConfig.cropPositions[Math.floor(Math.random() * 4)],
        cropSize: { w: game.setup.unitSize / 4, h: game.setup.unitSize / 4 },
        rotation: glitchConfig.rotation[Math.floor(Math.random() * glitchConfig.rotation.length)] * Math.PI / 180,
    }
}

function addGlitch(nGlitch) {
    glitchConfig.glitches.push(nGlitch);
}

async function renderGlitch() {
    const width = game.setup.unitSize;
    const height = game.setup.unitSize;
    const scale = 1;
    if (glitchConfig.glitches.length == 0) return;

    for (const glitch of glitchConfig.glitches) {
        const imagePath = `/img/laureates/${glitch.imagePath}`;

        if (!imageCache[imagePath + ".glitch"]) {
            imageCache[imagePath + ".glitch"] = new Image(width, height);
            imageCache[imagePath + ".glitch"].src = imagePath;
        }

        await renderGlitchImage(
            imageCache[imagePath + ".glitch"],
            glitch.cropPos.x,
            glitch.cropPos.y,
            glitch.cropSize.w,
            glitch.cropSize.h,
            glitch.x * game.setup.unitSize + game.setup.unitSize / 2,
            glitch.y * game.setup.unitSize + game.setup.unitSize / 2,
            width,
            height,
            glitch.rotation,
            scale
        );
    }
}