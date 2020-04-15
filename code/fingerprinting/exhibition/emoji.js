const MAX_EMOJI_HISTORY = 350;

const particles = {}
function EmojiParticle (emoji, me) {
  this.history = []
  this.emoji = emoji;
  
  this.x = 0;
  this.y = 0;

  this.update = (newX, newY, width, height) => {
    this.history.push([this.x, this.y])
    if (this.history.length > MAX_EMOJI_HISTORY) {
      this.history.shift()
    }
    const xRatio = window.innerWidth / width;
    const yRatio = window.innerHeight / height;
    this.x = newX * xRatio;
    this.y = newY * yRatio;
  }
  var img = new Image();
  this.draw = function () {
    ct.font = "100px Time";
    ct.textAlign = "center";

    ct.globalAlpha = 0.05;
    ct.fillStyle = "rgb(255, 255, 255)";
    for (let coord of this.history) {
      if (this.image) {
        img.src = this.image;
        ct.drawImage(img, coord[0], coord[1]);
      } else {
        ct.fillText(this.emoji, coord[0], coord[1] + 50)
      }
    }
    ct.globalAlpha = 0.2;
    ct.fillStyle = "rgb(125, 125, 125)";
    ct.strokeStyle = ct.fillStyle;
    if (this.image) {
      img.src = this.image;
      ct.drawImage(img, this.x, this.y);
    } else {
      ct.fillText(this.emoji, this.x, this.y + 50);
    }
    ct.globalAlpha = 1;
  }
}


function drawEmojis() {
  for (let id in particles) {
    particles[id].draw()
  }
}
const emojis_c = document.getElementById("emojis");
emojis_c.width = window.innerWidth;
emojis_c.height = window.innerHeight;
const ct = emojis_c.getContext("2d");
let emoji = null;
const ws = new WebSocket(HOST.replace("http", "ws"));
let myEmoji = null;

ws.onopen = () => {
  getEmoji((e) => {
    emoji = e;
    myEmoji = new EmojiParticle(emoji, true);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 100;
    canvas.height = 100;
    ctx.font = "100px Time";
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = ctx.fillStyle;
    ctx.textAlign = "center";
    ctx.fillText(emoji, canvas.width / 2, canvas.height);
    ws.send(JSON.stringify({ emoji, image: canvas.toDataURL() }));
  });
  const handle = (event) => {
    if (myEmoji) {
      myEmoji.update(event.clientX, event.clientY, window.innerWidth, window.innerHeight)
    }
    ws.send(
      JSON.stringify({
        emoji,
        clientX: event.clientX,
        clientY: event.clientY,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    );
  }
  document.addEventListener("mousemove", handle);
  document.addEventListener("touchmove", handle);
};
setInterval(() => {
  ct.clearRect(0, 0, emojis_c.width, emojis_c.height);
  if (myEmoji) {
    myEmoji.draw();
  }
  drawEmojis();
}, 60)

window.addEventListener('resize', () => {
  emojis_c.width = window.innerWidth;
  emojis_c.height = window.innerHeight;
})
ws.onmessage = (m) => {
  data = JSON.parse(m.data);
  if (data.emoji && data.clientX) {
    if (!particles[data.emoji]) {
      particles[data.emoji] = new EmojiParticle(data.emoji);
    }
    particles[data.emoji].update(data.clientX, data.clientY, data.width, data.height)
  } else if (data.emoji && data.image)  {
    if (!particles[data.emoji]) {
      particles[data.emoji] = new EmojiParticle(data.emoji);
    }
    particles[data.emoji].image = data.image
  }
};
