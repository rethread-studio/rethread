class TourView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        var content = `
        <div id="tour" class="center">
        <h1>Virtual tour</h1>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
        <p>Mauris vitae molestie tellus. Quisque arcu mi, maximus eu sapien non, cursus consectetur lorem. Donec vestibulum aliquet erat, non eleifend urna pellentesque eu. Pellentesque efficitur urna et dictum convallis. Integer convallis elit orci, vitae facilisis orci placerat et. Cras non placerat ipsum. Pellentesque commodo, turpis eget ultricies finibus, ligula metus rhoncus diam, id tristique justo tortor ac nisi. Mauris cursus nec erat in condimentum. Nam gravida maximus tempus. Etiam efficitur at ipsum ut ullamcorper. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <iframe src="https://player.vimeo.com/video/483464921" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
 </div>
		`;
        this.container.innerHTML = content;

    }

}
