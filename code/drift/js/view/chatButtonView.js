
export default class ChatButtonView {
  constructor(container, model) {
    this.model = model;
    this.container = document.getElementById(container);

  }



  render() {
    const btnArrow = this.model.getChatVisible() ? ` <i class="fas fa-chevron-right"></i> ` : `<i class="fas fa-comment"></i>`

    let content = `
      <button id="closeBtn" class="relative sm:absolute right-0 bg-gray-700 hover:bg-gray-400  white hover:text-gray-800 font-bold py-2 px-4 rounded-t flex flex-row content-center items-center justify-center">
        ${btnArrow}
      </button>`;
    this.container.innerHTML = content;

    this.setIdentifications();
  }

  setIdentifications() {
    this.closeBtn = document.getElementById("closeBtn");
  }
}
