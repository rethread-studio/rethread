
import { apiService } from '../app.js'

export default class ChatView {
  constructor(container, model) {
    this.model = model;
    this.container = document.getElementById(container);
    this.model.addObserver(this);
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
      {
        emoji: "😀"
      },
      {
        emoji: "🤩",
      },
      {
        emoji: "🥳",
      },
      {
        emoji: "🤯",
      },
      {
        emoji: "🔬",
      },
      {
        emoji: "🖼",
      }
    ];
  }

  render() {

    let content = `<div id="messages"></div><ul id="emojis">`;
    for (let emoji of this.emojis) {
      content += `<li class="emoji">${emoji.emoji}</li>`;
    }
    content += `</ul><input id="messageInp" placeholder="Your message...">`;
    this.container.innerHTML = content;
    this.container.className = this.model.getChatVisible() ? "visible" : "invisible"

    this.setIdentifications();
  }

  renderButton() {

  }

  addMessage(message) {
    const content = `<div class="icon" style='background-image:url(${apiService.getAvatar(message.user.id)})'></div>
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

  updateView() {
    // node.className = "floating-emoji";
    this.container.className = this.model.getChatVisible() ? "visible" : "invisible"
  }

  update(changeDetails) {
    if (changeDetails.type == "toggleChat") {
      this.updateView();
    }
  }
}
