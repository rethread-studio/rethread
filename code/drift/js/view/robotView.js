class RobotView {
<<<<<<< HEAD

    constructor(container, model) {
        this.container = document.getElementById(container);
        this.model = model;
    }

    render() {

        var content = `
        <div class="relative pt-80">
            <div id="twitch-embed"  ></div>
        </div>
		`;
        this.container.innerHTML = content;

        new Twitch.Embed("twitch-embed", {
            width: window.innerWidth,
            height: window.innerHeight * 0.9,
            autoplay: true,
            muted: true,
            theme: "dark",
            channel: "tdurieux",
            layout: "video",
            // Only needed if this page is going to be embedded on other websites
            parent: ["embed.example.com", "othersite.example.com"],
        });

=======
  constructor(container, model) {
    this.container = document.getElementById(container);
    this.model = model;
  }

  renderVoteWebsite() {
    let content = "";
    for (let website of this.model.voteWebsites) {
      content += `<div class="vote-website ${website}" data-website="${website}"><div class="name">${website}</div><div class="voters"></div></div>`;
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb
    }
    document.getElementById("votes").innerHTML = content;
  }
  render() {
    var content = `
    <div class="flex-container">
        <div class="left">
            <div id="stream"></div>
            <div id="votes"></div>
            <div id="vote_time"></div>
        </div>
        <div class="right"></div>
    </div>`;
    this.container.innerHTML = content;
    this.renderVoteWebsite();

    setTimeout(() => {
      new Twitch.Embed("stream", {
        width: document.querySelector("#stream").clientWidth,
        height: document.querySelector("#stream").clientHeight,
        autoplay: true,
        muted: true,
        theme: "dark",
        channel: "tdurieux",
        layout: "video",
        // Only needed if this page is going to be embedded on other websites
        parent: ["embed.example.com", "othersite.example.com"],
      });
    }, 100);
    this.setIdentifications();
  }

  setIdentifications() {
    this.timer = document.getElementById("vote_time");
  }
}
