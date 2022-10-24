const hostURL = "ws://127.0.0.1:12345";
var webSocket = new WebSocket(hostURL);
const messages = document.querySelector("#messages");
webSocket.onopen = function () {
  console.log("Websocket connection opened");
};

webSocket.onmessage = function (event) {
  console.log(event);
  const p = document.createElement("div");
  p.textContent = event.data;
  messages.appendChild(p);
};

webSocket.onclose = function () {
  console.log("Websocket connection closed");
};
