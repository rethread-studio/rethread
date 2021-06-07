
class ExplainView {
    constructor(container) {
        this.container = document.getElementById(container);
    }

    render() {
        var content = `
        <div class="w-2/6 text-1xl">
            <h1 class="text-4xl">What you will see</h1>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
        </div>
        
		`;
        this.container.innerHTML = content;

    }

}
