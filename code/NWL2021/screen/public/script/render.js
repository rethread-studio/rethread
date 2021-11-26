const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const imageCache = {};

const colors = [
  "#b4b2b5",
  "#dfd73f",
  "#6ed2dc",
  "#66cf5d",
  "#c542cb",
  "#d0535e",
  "#3733c9"
];

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function glitch() {

  const ctxW = game.setup.unitSize * config.renderScale * game.setup.width;
  const ctxH = game.setup.unitSize * config.renderScale * game.setup.height;

  ctx.fillStyle = "#1a191c";
  ctx.fillRect(0, 0, ctxW, ctxH);


  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.01})`;
    ctx.fillRect(
      Math.floor(Math.random() * ctxW),
      Math.floor(Math.random() * ctxH),
      Math.floor(Math.random() * 30) + 1,
      Math.floor(Math.random() * 30) + 1
    );

    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
    ctx.fillRect(
      Math.floor(Math.random() * ctxW),
      Math.floor(Math.random() * ctxH),
      Math.floor(Math.random() * 25) + 1,
      Math.floor(Math.random() * 25) + 1
    );
  }

  ctx.fillStyle = colors[Math.floor(Math.random() * 40)];
  ctx.fillRect(
    Math.random() * ctxW,
    Math.random() * ctxH,
    Math.random() * ctxW,
    Math.random() * ctxH
  );
  ctx.setTransform(1, 0, 0, .8, .2, 0);
}

function initRender() {
  const width = game.setup.unitSize * game.setup.width;
  const height = game.setup.unitSize * game.setup.height;

  canvas.width = width * config.renderScale;
  canvas.height = height * config.renderScale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  document.querySelector(".board").style.width = `${width}px`;
  document.querySelector(".board").style.height = `${height}px`;

  dummyPlayer2.x = game.setup.width - 1;
  dummyPlayer2.y = game.setup.height - 1;
}

function getAngle(playerStatus) {
  switch (playerStatus) {
    case "left":
      return -Math.PI / 4;
    case "right":
      return Math.PI / 4;
    case "up" || "down" || "iddle":
      return 0;
    case "hit":
      return Math.PI;
    default:
      return 0;
  }
}

function updatePositionElement(element, position) {
  element.style.top = `${position.y * game.setup.unitSize}px`;
  element.style.left = `${position.x * game.setup.unitSize}px`;
  element.style.width = `${(position.width + 1) * game.setup.unitSize}px`;
  element.style.height = `${(position.height + 1) * game.setup.unitSize}px`;
}

function renderImage(image, x, y, width, height, angle, scale = 1) {
  if (!image.complete) {
    image.addEventListener("load", () => {
      return renderImage(image, x, y, width, height, angle, scale);
    });
    return;
  }
  const centerX = (width * config.renderScale) / 2.0;
  const centerY = (height * config.renderScale) / 2.0;

  ctx.translate(x * config.renderScale, y * config.renderScale);

  ctx.rotate(angle);
  ctx.scale(scale, scale);
  // ctx.translate(x,y);
  ctx.drawImage(
    image,
    -centerX,
    -centerY,
    width * config.renderScale,
    height * config.renderScale
  );

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
