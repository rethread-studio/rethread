let protocol = "ws";
if (document.location.protocol == "https:") {
  protocol += "s";
}
let host = document.location.hostname;
if (document.location.port) {
  host += ":" + document.location.port;
}
const ws = new WebSocket(protocol + "://" + host);

const canvas = document.getElementById("visualization");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

const ctx = canvas.getContext("2d");
ctx.fillStyle = "#ffffff";

ws.onmessage = (message) => {
  const json = JSON.parse(message.data);
  if (json.event == "networkActivity") {
    const packet = json.data;
    if (packet.services.length > 0) {
      ctx.fillText(
        packet.services[0],
        canvas.width * Math.random(),
        canvas.height * Math.random()
      );
    } else {
      ctx.fillText(
        packet.remote_ip,
        canvas.width * Math.random(),
        canvas.height * Math.random()
      );
    }
  }
};
