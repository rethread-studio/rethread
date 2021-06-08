class LegendView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        const content = `
        <h1 class= "text-8xl mb-12 white p-5 pt-40 text-center" >Legend</h1>
        <div class="">
            <div class=" flex p-24  ">
            
                <div class=" relative w-4/6">
                    <img class="relative top-2-4 left-2-4 transform-50 h-auto " src="./img/screenshot.png" alt=screenshot">
                </div>
                <div  class="container white  pl-20 background-black">
                    <h1 class= "text-4xl mb-5" >Human - screenshot</h1>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
                </div>
            </div>
            <div class=" flex  p-24 ">
                <div class=" relative w-4/6">
                    <img class="rounded-full relative top-2-4 left-2-4 transform-50 h-auto " src="./img/graph.jpg" alt="Graph">
                </div>
                <div  class="container white  pl-20 background-black">
                    <h1 class= "text-4xl mb-5" >Code - Coverage</h1>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
                </div>
            </div>
            <div class=" flex  p-24 ">
                <div class=" relative w-4/6">
                    <img class="rounded-full relative top-2-4 left-2-4 transform-50 h-auto " src="./img/coverage.jpg" alt="Coverage">
                </div>
                <div  class="container white  pl-20 background-black">
                    <h1 class= "text-4xl mb-5" >Flow - execution</h1>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
                </div>
            </div>
            <div class=" flex  p-24 ">
                <div class=" relative w-4/6">
                    <img class="rounded-full relative top-2-4 left-2-4 transform-50 h-auto " src="./img/network.png" alt="yahoo profile test">
                </div>
                <div  class="container white  pl-20 background-black">
                    <h1 class= "text-4xl mb-5" >Underworl - Network</h1>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
                </div>
            </div>
        </div>
		`;

        this.container.innerHTML = content;

    }

}


