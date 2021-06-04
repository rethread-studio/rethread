class RobotViewController {
  constructor(view, chatView, model) {
    this.view = view;
    this.chatView = chatView;
    this.model = model;
  }

  addEventListener() {
    [...this.view.container.querySelectorAll(".vote-website")].map((e) =>
      e.addEventListener("click", (event) => {
        console.log(
          event.currentTarget,
          this.view.websites.filter(
            (w) => w == event.currentTarget.dataset.website
          ),
          event.currentTarget
        );
        this.model.interaction.vote(
          this.view.websites.filter(
            (w) => w == event.currentTarget.dataset.website
          )[0]
        );
      })
    );

    this.model.interaction.onElected((data) => {
      [
        ...this.view.container.querySelectorAll(
          ".vote-website." + data.website + " .voters div"
        ),
      ].map((e) => e.remove());
    });

    setInterval(() => {
      let sec = Math.ceil(
        (new Date(this.model.interaction.voteTime) - new Date()) / 1000
      );
      if (sec < 0) {
        sec = 0;
      }
      this.view.timer.innerHTML = sec + "S";
    }, 250);

    this.model.interaction.onVote((data) => {
      const node = document.createElement("div");
      node.style.backgroundImage = `url("/api/chat/user/${data.user.id}/avatar")`;
      node.className = "icon";
      this.view.container
        .querySelector(".vote-website." + data.website + " .voters")
        .append(node);
    });
  }

  renderView() {
    this.view.render();
    this.addEventListener();
    this.chatView.container.className = "full";
  }
  unMountView() {
    this.chatView.container.className = "";
  }
}
