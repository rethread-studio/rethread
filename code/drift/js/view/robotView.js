export default class RobotView {
  constructor(container, model) {
    this.container = document.getElementById(container);
    this.model = model;
  }

  renderVoteWebsite() {
    let content = "";
    for (let website of this.model.voteWebsites) {
      content += `<div class="vote-website ${website}" data-website="${website}"><div class="name">${website}</div><div class="voters"></div></div>`;
    }
    document.getElementById("votes").innerHTML = content;
  }

  render() {

    //<div id="votes" class="flex flex-row justify-center"></div>
    //<div id="vote_time"></div>
    var content = `
    <div class="flex-container">
        <div class="relative w-full flex flex-col"> 
            <div id="stream"></div>
            
            
        </div>
        <div class="right"></div>
    </div>`;
    this.container.innerHTML = content;
    // this.renderVoteWebsite();

    setTimeout(() => {
      new Twitch.Embed("stream", {
        width: document.querySelector("#stream").clientWidth,
        height: window.innerHeight,
        autoplay: true,
        muted: true,
        theme: "dark",
        channel: "rethread",
        layout: "video",
        // Only needed if this page is going to be embedded on other websites
        // parent: ["embed.example.com", "drift.durieux.me", "drift.rethread.art/"],
      });
    }, 100);
    // this.setIdentifications();
  }

  setIdentifications() {
    // this.timer = document.getElementById("vote_time");
  }
}
