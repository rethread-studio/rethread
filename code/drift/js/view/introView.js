
class IntroView {
    constructor(container) {
        this.container = document.getElementById(container);
    }

    render() {
        const content = `
        <div class="w-2/6 text-xl font-thin text-left">
            <h1 class="font-bold text-4xl dritTittle tracking-widest mb-5">Dr<span class="italic font-bold text-4xl">i</span>ft</h1>
            <p class="text-left">Web search engines are part of our digital lives. They are familiar and the comforting starting point for our explorations of the cyber space. There exist different search engines, each with its own aesthetic. When we adopt one, it becomes a mundane cyber place, we recognze it and we appreciate its stability. But is it really stable? Do search engines ever change over time? Is it really the same search engine we go back to every day?</p>
            <br>
            <p class="text-left">Drift lets you experience how search engines evolve, every hour.</p>
            <button id="introBtn" class="cursor-pointer" ><i class="fas fa-arrow-down animate-bounce mt-20"></i></button>
            
        </div>
        
		`;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        this.btn = document.getElementById("introBtn")
    }



}
