const emojis_c = document.getElementById("emojis");
emojis_c.width = window.innerWidth;
emojis_c.height = window.innerHeight;
const ct = emojis_c.getContext("2d");
let emoji = null;
const ws = new WebSocket(HOST.replace("http", "ws"));
ws.onopen = () => {
  getEmoji((e) => {
    emoji = e;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 100;
    canvas.height = 100;
    ctx.font = "100px Time";
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = ctx.fillStyle;
    ctx.textAlign = "center";
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
    ws.send(JSON.stringify({ emoji: canvas.toDataURL() }));
  });
  document.addEventListener("mousemove", (event) => {
    drawEmoji(
      emoji,
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight
    );
    ws.send(
      JSON.stringify({
        emoji,
        clientX: event.clientX,
        clientY: event.clientY,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    );
  });
};
ws.onmessage = (m) => {
  data = JSON.parse(m.data);
  if (data.emoji && data.clientX) {
    drawEmoji(data.emoji, data.clientX, data.clientY, data.width, data.height);
  }
};
function drawEmoji(emoji, x, y, width, height) {
  ct.font = "100px Time";
  ct.fillStyle = "rgba(0, 0, 0, 0.1)";
  ct.strokeStyle = ct.fillStyle;
  ct.textAlign = "center";
  const xRatio = window.innerWidth / width;
  const yRatio = window.innerHeight / height;
  ct.fillText(emoji, x * xRatio, y * yRatio);
}
