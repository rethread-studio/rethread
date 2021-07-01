export default class CheckBoxListView {
    constructor(container, model) {
        this.model = model;
        this.container = document.getElementById(container);
        this.checkbox = []
    }

    render() {
        const checkBox = this.model.getDataChildren()
            .map(i => {
                return `<label id="${i.name}SCbx" class="inline-flex items-center cursor-pointer from-left appear">
                            <input type="checkbox" class="m0" value="${i.name}" ${i.state ? "checked" : ``}>
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

    hideOptions() {

        this.model.getDataChildren()
            .map(i => document.getElementById(`${i.name}SCbx`))
            .forEach((e, i) => {
                if (i != 0) e.classList.remove("appear")
            })
    }

    showOptions() {
        this.model.getDataChildren()
            .map(i => document.getElementById(`${i.name}SCbx`))
            .forEach((e, i) => {
                if (i != 0) e.classList.add("appear")
            })
    }

    setIdentifications() {
        this.checkbox = this.model.getDataChildren()
            .map(i => document.getElementById(`${i.name}SCbx`))
    }

}
