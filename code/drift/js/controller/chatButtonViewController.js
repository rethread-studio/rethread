export default class ChatBtnViewController {
    constructor(view, model) {
        this.model = model;
        this.view = view;
        this.renderView();
        this.addEventListener();
        this.model.addObserver(this)
    }

    addEventListener() {

        this.view.closeBtn.addEventListener("click", () => {
            this.model.toggleChatVisible();
        })
    }

    renderView() {
        this.view.render();
    }
    unMountView() { }

    update(changeDetails) {
        if (changeDetails.type == "toggleChat") {
            this.renderView();
            this.addEventListener();
        }
    }
}
