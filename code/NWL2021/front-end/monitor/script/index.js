var socket = io("/monitor");
socket.on("event", (event) => {
  const e = document.createElement("div");
  e.innerHTML = `[${new Date().toUTCString()}] [${
    event.origin
  }] ${Object.values(event)
    .filter((f) => f != event.origin)
    .join(" ")}`;
  document.body.prepend(e);
});
