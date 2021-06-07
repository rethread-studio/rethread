class ChatView {
  constructor(container, model) {
    this.model = model;
    this.container = document.getElementById(container);

    this.emojis = [
      {
        emoji: "👋",
        message: "Hello",
      },
      {
        emoji: "👍",
        message: "Nice!",
      },
      {
        emoji: "👏",
        message: "Well done!",
      },
    ];
  }

  render() {
    let content = `<div id="messages"></div><ul id="emojis">`;
    for (let emoji of this.emojis) {
      content += `<li class="emoji">${emoji.emoji}</li>`;
    }
    content += `</ul><input id="messageInp" placeholder="Your message...">`;
    this.container.innerHTML = content;

    this.setIdentifications();
  }

  addMessage(message) {
    const content = `<div class="icon" style='background-image:url("/api/chat/user/${message.user.id}/avatar")'></div>
    <p class="chat-text">${message.message}</p>`;
    const node = document.createElement("div");
    node.className = "message";
    node.innerHTML = content;
    this.messages.appendChild(node);
    this.scrollBottom();
  }

  scrollBottom() {
    this.messages.scrollTop =
      this.messages.scrollHeight - this.messages.clientHeight;
  }

  setIdentifications() {
    this.messages = document.getElementById("messages");
    this.message_inp = document.getElementById("messageInp");
  }
}
