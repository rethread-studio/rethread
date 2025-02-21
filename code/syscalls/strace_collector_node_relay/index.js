import { WebSocketServer } from "ws";

const receiver_server = new WebSocketServer({
  port: 3012,
});

receiver_server.on("connection", (socket) => {
  console.log("strace client connected");

  socket.on("message", (message) => {
    // console.log(`Received: ${message}`);
    for (const socket of sender_sockets) {
      console.log(`Sent: ${message}`);
      socket.send(`${message}`);
    }
  });

  socket.on("close", () => {
    console.log("strace client disconnected");
  });
});

const sender_server = new WebSocketServer({
  port: 8081,
});

var sender_sockets = new Set([]);
sender_server.on("connection", (socket) => {
  console.log("Client connected");
  sender_sockets.add(socket);

  socket.on("message", (message) => {
    console.log(`Received: ${message}`);
    socket.send(`Server: ${message}`);
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    sender_sockets.delete(socket);
  });
});

console.log("WebSocket receiver server is running on ws://localhost:3012");
console.log("WebSocket sender server is running on ws://localhost:8081");
