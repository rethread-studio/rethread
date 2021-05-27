

class RobotView {

    constructor(container, model) {
        this.container = document.getElementById(container);
        this.model = model;
    }

    render() {

        var content = `
        <div id="twitch-embed"></div>
		`;
        this.container.innerHTML = content;

        new Twitch.Embed("twitch-embed", {
            width: window.innerWidth,
            height: window.innerHeight,
            autoplay: true,
            muted: true,
            theme: "dark",
            channel: "tdurieux",
            layout: "video",
            // Only needed if this page is going to be embedded on other websites
            parent: ["embed.example.com", "othersite.example.com"],
        });

    }


}