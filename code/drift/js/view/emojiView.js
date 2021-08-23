export default class EmojiView {
  constructor(container, model) {
    this.model = model;
  }

  render() { }

  addEmoji(data) {
    const node = document.createElement("div");
    node.className = "floating-emoji";
    node.innerHTML = `${data.user.username}<br><span class="">${data.emoji.emoji}</span>`;
    node.style.top = window.innerHeight / 2 - 100 + "px";
    node.style.right = "25px";
    const interval = setInterval(() => {
      node.style.top = parseInt(node.style.top) - 5 + "px";
      if (parseInt(node.style.top) < -10) {
        clearInterval(interval);
        node.remove();
      }
    }, 33);
    document.body.appendChild(node);
  }

  setIdentifications() { }
}
