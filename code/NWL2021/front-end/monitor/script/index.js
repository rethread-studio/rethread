var socket = io("/monitor");
socket.on("message", (event) => {
  const e = document.createElement("div");
  e.innerHTML = `[${new Date().toUTCString()}] [${event.origin}] ${event.action}`;
  document.body.prepend(e);
});
