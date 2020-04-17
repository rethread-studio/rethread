const MAX_EMOJI_HISTORY = 10;

const particles = {}
function EmojiParticle (emoji, me) {
  this.emoji = emoji;
  
  this.x = 0;
  this.y = 0;

  this.update = (newX, newY, width, height) => {
    const xRatio = window.innerWidth / width;
    const yRatio = window.innerHeight / height;
    this.x = newX * xRatio;
    this.y = newY * yRatio;
  }
  var img = new Image();
  this.draw = function () {
    ct.font = "100px Time";
    ct.textAlign = "center";

    ct.globalAlpha = 0.2;
    ct.fillStyle = "rgb(125, 125, 125)";
    ct.strokeStyle = ct.fillStyle;
    if (this.image) {
      img.src = this.image;
      ct.drawImage(img, this.x - 50, this.y - 50);
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
    canvas.width = 125;
    canvas.height = 125;
    ctx.font = "100px Time";
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = ctx.fillStyle;
    ctx.textAlign = "center";
    ctx.fillText(emoji, 50, 100);
    myEmoji.image = canvas.toDataURL();
    ws.send(JSON.stringify({ emoji, image: myEmoji.image}));
  });
  const handle = (event) => {
    if (!hasConsented) {
        return;
    }
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
  document.addEventListener("touchmove", (event) => {
    handle(event.touches[0]);
  });
};
setInterval(() => {
  // ct.clearRect(0, 0, emojis_c.width, emojis_c.height);
  ct.save();
  ct.globalAlpha = 0.15;
  let backgroundColor = window.getComputedStyle( document.body ,null).getPropertyValue('background-color');
  ct.fillStyle = backgroundColor;
  ct.fillRect(0, 0, emojis_c.width, emojis_c.height);
  ct.restore();
  // ct.fillStyle = rgba(0, 0, 0, 1.0);
  if (myEmoji) {
    myEmoji.draw();
  }
  drawEmojis();
}, 30)

window.addEventListener('resize', () => {
  emojis_c.width = window.innerWidth;
  emojis_c.height = window.innerHeight;
})
ws.onmessage = (m) => {
  data = JSON.parse(m.data);
  if (data.userEmojis) {
    for (let from in data.userEmojis) {
      if (!particles[from]) {
        particles[from] = new EmojiParticle(data.emoji);
      }
      particles[from].image = data.userEmojis[from];
    }
  } else if (data.emoji && data.clientX) {
    if (!particles[data.from]) {
      particles[data.from] = new EmojiParticle(data.emoji);
    }
    particles[data.from].update(data.clientX, data.clientY, data.width, data.height)
  } else if (data.emoji && data.image)  {
    if (!particles[data.from]) {
      particles[data.from] = new EmojiParticle(data.emoji);
    }
    particles[data.from].image = data.image
  } else if (data.event && data.event == 'close')  {
    delete particles[data.from];
  }
};
