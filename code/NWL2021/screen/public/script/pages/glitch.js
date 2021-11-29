

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
    }
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
}

function clearGlitchCanvas() {
    glitchConfig.glitches = [];
    gctx.clearRect(0, 0, canvas.width, canvas.height);
}

//a glictch has
// image url
// type: 1,2,3,4
// posx
// posy
// rotation

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
        type: Math.floor(Math.random() * 4),
        rotation: glitchConfig.rotation[Math.floor(Math.random() * glitchConfig.rotation.length)]
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
        // console.log(glitch)
        const imagePath = `/img/laureates/${glitch.imagePath}`;

        if (!imageCache[imagePath]) {
            imageCache[imagePath] = new Image(width, height);
            imageCache[imagePath].src = imagePath;
        }
        const angle = 0;//getAngle(player.status);
        await renderGlitchImage(
            imageCache[imagePath],
            glitch.x * game.setup.unitSize + game.setup.unitSize / 2,
            glitch.y * game.setup.unitSize + game.setup.unitSize / 2,
            width,
            height,
            angle,
            scale
        );
    }
}