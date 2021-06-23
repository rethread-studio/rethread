export default class EmojiController {
  constructor(view, model) {
    this.model = model;
    this.view = view;
    this.renderView();
    this.addEventListener();
  }

  addEventListener() {
    this.model.interaction.onEmoji((data) => {
      this.view.addEmoji(data);
    });
  }

  renderView() {
    this.view.render();
  }
  unMountView() { }
}
