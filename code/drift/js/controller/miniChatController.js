export default class MiniChatController {
  constructor(view, model) {
    this.model = model;
    this.view = view;
    this.renderView();
    this.addEventListener();
  }

  addEventListener() {

    this.view.message_inp.addEventListener("change", () => {
      this.model.interaction.message(this.view.message_inp.value);
      this.view.message_inp.value = "";
    });
    [...this.view.container.querySelectorAll(".emoji")].map((e) =>
      e.addEventListener("click", (event) => {
        this.model.interaction.emoji(
          this.view.emojis.filter(
            (e) => e.emoji == event.srcElement.innerHTML
          )[0]
        );
      })
    );
    this.model.interaction.onMessage((message) => {
      this.view.addMessage(message);
      this.view.scrollBottom();
    });
    
    for (let message of this.model.interaction.chatMessages) {
      this.view.addMessage(message);
    }
  }

  renderView() {
    this.view.render();
  }
  unMountView() { }
}
