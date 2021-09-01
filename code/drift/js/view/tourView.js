export default class TourView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        var content = `
        
        <div class="relative w-screen h-screen">
        </iframe>
            <iframe src="https://player.vimeo.com/video/595898093?autoplay=1&color=c9ff23&title=0&byline=0&portrait=0" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen>
            </iframe>    
        </div>
          
		`;
        this.container.innerHTML = content;

    }

}


