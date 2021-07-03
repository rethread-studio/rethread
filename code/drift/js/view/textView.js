
export default class TextView {
    constructor(container, tittle, text) {
        this.container = document.getElementById(container)
        this.tittle = tittle;
        this.text = text;
    }

    render() {
        const content = `
        <div id="exhibitDescrip" class="w-2/6 text-lg font-thin text-left p-16 background-black-opacity background-black-opacity ">
            <h1 class="font-bold text-2xl dritTittle tracking-widest mb-5">${this.tittle}</h1>
            ${this.text}
            <i class="fas fa-arrow-down animate-bounce mt-20"></i>
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
