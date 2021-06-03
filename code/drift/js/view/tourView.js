class TourView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        var content = `
        <div class="flex w-full h-full p-24">
            <div class=" relative ">
                <iframe  width="640" height="222"  src="https://player.vimeo.com/video/483464921"  frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div id="tour" class="container white  ">
                <h1 class= "text-8xl mb-12" >Tour</h1>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
            </div>
        </div>
		`;
        this.container.innerHTML = content;

    }

}


