
export default class TextView {
    constructor(container, tittle, text) {
        this.container = document.getElementById(container)
        this.tittle = tittle;
        this.text = text;
    }

    render() {
        const content = `
        <div id="exhibitDescrip" class="z-40 w-full sm:w-5/6 md:w-8/12 lg:w-6/12 text-lg font-thin text-left px-8 py-4 md:p-16 background-black-opacity background-black-opacity ">
            <h1 class="font-bold text-xl md:text-2xl dritTittle tracking-widest mb-5">${this.tittle}</h1>
            ${this.text}
            <i class="fas fa-arrow-down animate-bounce mt-8 md:mt-20"></i>
            </div>
            `;
        // <button id="introBtn" class="cursor-pointer textButton" ><i class="fas fa-arrow-down animate-bounce mt-20"></i></button>

        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        // this.btn = this.container.querySelector(".textButton")
    }
}
