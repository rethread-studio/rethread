export default class LoadingView {
    constructor(container) {
        this.container = document.getElementById(container);
    }

    render() {
        const content = `
        <div id="z-50 loading" class="z-500 h-full w-full flex justify-center text-4xl white">
           <div class="self-center">
           <i class="animate-spin fas fa-spinner"></i>
           </div>
        </div>
		`;
        this.container.innerHTML = content;
    }
}


