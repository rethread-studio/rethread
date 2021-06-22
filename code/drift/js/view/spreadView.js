
class SpreadView {
    constructor(container) {
        this.container = document.getElementById(container);
    }

    render() {
        const content = `
        <div class="w-2/6 text-xl font-thin text-left">
        <h1 class="font-bold text-3xl dritTittle tracking-widest mb-5">Spread</h1>
        <p class="text-left">In biology, genetic drift indicates a high frequency of gene variations through generations. Drift is a digital art exhibition that unveils the very rapid evolution of search engines. It dissects the different strata of code that power the search engines. The visitors can experience the contrast between the evolution of the visible and the invisible parts of search engines, as well as between different search engines.</p>
        <button id="spreadSecBtn" class="cursor-pointer" ><i class="fas fa-arrow-down animate-bounce mt-20"></i></button>
        </div>
		`;

        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        this.btn = document.getElementById("spreadSecBtn")
    }

}
