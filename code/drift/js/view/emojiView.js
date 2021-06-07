class EmojiView {
  constructor(container, model) {
    this.model = model;
  }

  render() {}

  addEmoji(data) {
    const node = document.createElement("div");
    node.className = "floating-emoji";
    node.innerHTML = `${data.user.username} says: <span class="">${data.emoji.emoji}</span>`;
    node.style.top = window.innerHeight + "px";
    node.style.left = "25px";
    const interval = setInterval(() => {
      node.style.top = parseInt(node.style.top) - 5 + "px";
      if (parseInt(node.style.top) < 0) {
        clearInterval(interval);
        node.remove();
      }
    }, 33);
    document.body.appendChild(node);
  }

  setIdentifications() {}
}
