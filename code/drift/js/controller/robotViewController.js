export default class RobotViewController {
  constructor(view, chatView, model) {
    this.view = view;
    this.chatView = chatView;
    this.model = model;

    // this.model.interaction.onElected((data) => {
    //   [
    //     ...this.view.container.querySelectorAll(".vote-website .voters div"),
    //   ].map((e) => e.remove());
    // });

    // this.model.interaction.onVote((data) => {
    //   const node = document.createElement("div");
    //   node.style.backgroundImage = `url("/api/chat/user/${data.user.id}/avatar")`;
    //   node.className = "icon";
    //   this.view.container
    //     .querySelector(".vote-website." + data.website + " .voters")
    //     .append(node);
    // });

    // this.model.interaction.onVotes((data) => {
    //   for (let website in data) {
    //     for (let user of data[website]) {
    //       const node = document.createElement("div");
    //       node.style.backgroundImage = `url("/api/chat/user/${user.id}/avatar")`;
    //       node.className = "icon";
    //       this.view.container
    //         .querySelector(".vote-website." + website + " .voters")
    //         .append(node);
    //     }
    //   }
    // });

    // this.timerInterval = null;
  }

  // onWebsiteClick(event) {
  //   this.model.interaction.vote(
  //     this.model.voteWebsites.filter(
  //       (w) => w == event.currentTarget.dataset.website
  //     )[0]
  //   );
  // }

  addEventListener() {
    // [...this.view.container.querySelectorAll(".vote-website")].map((e) =>
    //   e.addEventListener("click", (event) => this.onWebsiteClick(event))
    // );

    // this.timerInterval = setInterval(() => {
    //   let sec = Math.ceil(
    //     (new Date(this.model.interaction.voteTime) - new Date()) / 1000
    //   );
    //   if (sec < 0) {
    //     sec = 0;
    //   }
    //   this.view.timer.innerHTML = sec + "S";
    // }, 250);
  }

  renderView() {
    this.model.toggleChatVisible(true)
    document.getElementById("chat").classList.add("full");
    this.view.render();

  }
  unMountView() {
    this.model.toggleChatVisible(false)
    document.getElementById("chat").classList.remove("full")
  }
}
