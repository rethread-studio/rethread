const hostURL = "ws://127.0.0.1:12345";
var webSocket = new WebSocket(hostURL);
const call_messages = document.querySelector("#call_messages");
const section_messages = document.querySelector("#section_messages");
webSocket.onopen = function () {
  console.log("Websocket connection opened");
};

webSocket.onmessage = function (event) {
  const data = JSON.parse(event.data);
  console.log(data);
  if (data.Call != undefined) {
    const p = document.createElement("p");
    // Pretty print the JSON
    p.textContent = JSON.stringify(data, null, 2);
    call_messages.insertBefore(p, call_messages.firstChild);
  } else if (data["Section"] != undefined) {
    const p = document.createElement("p");
    // Pretty print the JSON
    p.textContent = JSON.stringify(data, null, 2);
    call_messages.insertBefore(p, call_messages.firstChild);
  }
};

webSocket.onclose = function () {
  console.log("Websocket connection closed");
};
