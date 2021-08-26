export default class EmojiView {
  constructor(container, model) {
    this.model = model;
  }

  render() { }

  addEmoji(data) {
    const node = document.createElement("div");
    const baseX = 25;
    let time = 0;
    let dist = 25;
    node.className = "floating-emoji";
    //${data.user.username}<br>
    node.innerHTML = `<span class="">${data.emoji.emoji}</span>`;
    node.style.top = window.innerHeight + "px";
    node.style.right = `${dist}px`;
    const interval = setInterval(() => {
      time += 0.2;
      dist = 25 + Math.sin(time) * baseX;
      node.style.top = parseInt(node.style.top) - 5 + "px";
      node.style.right = `${dist}px`;

      if (parseInt(node.style.top) < -100) {
        clearInterval(interval);
        node.remove();
      }
    }, 33);
    document.body.appendChild(node);
  }

  setIdentifications() { }
}
