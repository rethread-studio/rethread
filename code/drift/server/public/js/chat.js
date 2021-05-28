const websites = [
  "spotify",
  "qwant",
  "bing",
  "google",
  "duckduckgo",
  "kiddle",
  "yahoo",
  "wikipedia",
  "drift",
];
$(function () {
  //make connection
  let socket = io.connect("/");

  //buttons and inputs
  let message = $("#message");
  let send_message = $("#send_message");
  let chatroom = $("#messages");
  let feedback = $("#feedback");
  let usersList = $("#users-list");
  let nickName = $("#nickname-input");
  let votes = $("#votes");

  for (let website of websites) {
    votes.append(
      `<div class="website ${website}" onclick="vote('${website}');"><div class="name">${website}</div><div class="voters"></div></div>`
    );
  }
  window.vote = function (website) {
    socket.emit("vote", { website });
  };
  socket.on("elected", (data) => {
    voteTime = new Date(data.voteTime);
    votes.html("");
    for (let website of websites) {
      votes.append(
        `<div class="website ${website}" onclick="vote('${website}');"><div class="name">${website}</div><div class="voters"></div></div>`
      );
    }
  });

  socket.emit("votes");

  let voteTime = null;
  socket.on("welcome", (data) => {
    voteTime = new Date(data.voteTime);
    for (let message of data.lastMessages) {
      renderMessage(message);
    }
  });
  setInterval(() => {
    const sec = Math.ceil((voteTime - new Date()) / 1000);
    if (sec < 0) {
      sec = 0;
    }
    $("#vote_time").html(sec + "S");
  }, 250);

  socket.on("votes", (data) => {
    for (let website in data) {
      for (let user of data[website]) {
        $(".website." + website + " .voters").append(
          `<div class="icon" style='background-image:url("/api/chat/user/${user.id}/avatar")'></div>`
        );
      }
    }
    console.log(data);
  });

  socket.on("on_vote", (data) => {
    $(".website." + data.website + " .voters").append(
      `<div class="icon" style='background-image:url("/api/chat/user/${data.user.id}/avatar")'></div>`
    );
  });

  function sendMessage() {
    if (message.val().trim().length > 0) {
      socket.emit("new_message", { message: message.val() });
    }
  }

  send_message.click(sendMessage);
  // Or if the enter key is pressed
  message.keypress((e) => {
    let keycode = e.keyCode ? e.keyCode : e.which;
    if (keycode == "13") {
      sendMessage();
    }
  });

  function renderMessage(message) {
    chatroom.append(`<div class="message">
    <div class="icon" style='background-image:url("/api/chat/user/${message.user.id}/avatar")'></div>
    <p class="chat-text">${message.message}</p>
  </div>`);
    keepTheChatRoomToTheBottom();
  }
  //Listen on new_message
  socket.on("new_message", (data) => {
    feedback.html("");
    message.val("");
    //append the new message on the chatroom
    renderMessage(data);
  });

  socket.on("users", (data) => {
    $("#users-list").html("");
    console.log(data);
    for (let user of data) {
      $("#users-list").append(
        `<div class="icon" style='background-image:url("/api/chat/user/${user.id}/avatar")'></div>`
      );
    }
  });

  //Emit a username
  nickName.keypress((e) => {
    let keycode = e.keyCode ? e.keyCode : e.which;
    if (keycode == "13") {
      socket.emit("change_username", { nickName: nickName.val() });
      socket.on("get users", (data) => {
        let html = "";
        for (let i = 0; i < data.length; i++) {
          html += `<li class="list-item" style="color: ${data[i].color}">${data[i].username}</li>`;
        }
        usersList.html(html);
      });
    }
  });

  //Emit typing
  let typing;
  message.on("keypress", (e) => {
    let keycode = e.keyCode ? e.keyCode : e.which;
    if (keycode != "13") {
      clearTimeout(typing);
      socket.emit("typing");
      typing = setTimeout(() => {
        socket.emit("stop_typing");
      }, 1000);
    }
  });

  const typers = {};
  //Listen on typing
  socket.on("typing", (data) => {
    typers[data.id] = data;
  });
  //Listen on typing
  socket.on("stop_typing", (data) => {
    delete typers[data.id];
  });
});

// function thats keeps the chatbox stick to the bottom
const keepTheChatRoomToTheBottom = () => {
  const chatroom = document.getElementById("messages");
  chatroom.scrollTop = chatroom.scrollHeight - chatroom.clientHeight;
};
