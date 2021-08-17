export default class RadialListView {
    constructor(container, model) {
        this.model = model;
        this.container = document.getElementById(container);
        this.checkbox = []
    }

    render() {
        const checkBox = this.model.getDataChildren()
            .map(i => {
                return `<label id="${i.name}Radial" class="inline-flex items-center mt-3 cursor-pointer from-left appear">
                            <input type="radio" value="${i.name}" class="form-radio h-5 w-5 text-red-600" ${i.state ? "checked" : ` appear`}>
                            <span class="ml-2 white">${i.name}</span>
                        </label>`
            })
            .join("");

        const content = `
        <div class="flex flex-col space-y-2">
            <h4 class="white">Search engines</h4>
            ${checkBox}
        </div>
       `;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        this.checkbox = this.model.getDataChildren()
            .map(i => document.getElementById(`${i.name}Radial`))
    }

    hideOptions() {
        this.model.getDataChildren()
            .map(i => document.getElementById(`${i.name}Radial`))
            .forEach((e, i) => {
                if (i != 0) e.classList.remove("appear")
            })
    }

    showOptions() {
        this.model.getDataChildren()
            .map(i => document.getElementById(`${i.name}Radial`))
            .forEach((e, i) => {
                if (i != 0) e.classList.add("appear")
            })
    }

}
