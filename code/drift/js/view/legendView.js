class LegendView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        var content = `
        <h1 class= "text-8xl mb-12 white p-5" >Legend</h1>
        <div class="flex w-full h-full p-24">
        
            <div class=" relative ">
                <img class="relative top-2-4 left-2-4 transform-50 h-auto  blur" src="./img/imgTest.png" alt="yahoo profile test">
            </div>
            <div  class="container white  pl-20">
                <h1 class= "text-4xl mb-5" >Human - screenshot</h1>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
            </div>
        </div>
        <div class="flex w-full h-full p-24">
        <div class=" relative ">
            <img class="relative top-2-4 left-2-4 transform-50 h-auto  blur" src="./img/imgTest.png" alt="yahoo profile test">
        </div>
        <div  class="container white  pl-20">
            <h1 class= "text-4xl mb-5" >Code - Coverage</h1>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
        </div>
    </div>
    <div class="flex w-full h-full p-24">
    <div class=" relative ">
        <img class="relative top-2-4 left-2-4 transform-50 h-auto  blur" src="./img/imgTest.png" alt="yahoo profile test">
    </div>
    <div  class="container white  pl-20">
        <h1 class= "text-4xl mb-5" >Flow - execution</h1>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
    </div>
    </div>
    <div class="flex w-full h-full p-24">
    <div class=" relative ">
        <img class="relative top-2-4 left-2-4 transform-50 h-auto  blur" src="./img/imgTest.png" alt="yahoo profile test">
    </div>
    <div  class="container white  pl-20">
        <h1 class= "text-4xl mb-5" >Underworl - Network</h1>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut quis dictum felis. Vestibulum molestie, felis vel tincidunt finibus, libero augue rutrum sem, non consequat quam tellus at ex. Aenean dolor nisi, molestie in faucibus quis, interdum a dolor. Donec quis dui in justo scelerisque bibendum. In commodo odio erat, vitae pharetra eros dignissim id. Donec commodo luctus quam nec commodo. In hac habitasse platea dictumst. Suspendisse eget lacinia ipsum. Quisque congue massa et eros luctus aliquam. Curabitur sollicitudin, tellus ut egestas mattis, lacus sapien pulvinar massa, eu efficitur metus sem in urna. Suspendisse potenti. Donec non nisl nec arcu luctus lobortis. Aliquam vel diam ligula.</p>
    </div>
    </div>
		`;

        this.container.innerHTML = content;

    }

}


