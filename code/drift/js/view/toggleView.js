
export default class ToggleView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        this.checkbox = null;
    }

    render() {
        const cMode = this.model.getMode();
        const getMode = "Human"
        const robMode = "Nerd"
        const emoji = cMode == false ? `🙂` : `🤓`;
        const content = `
        <!-- Toggle B -->
        <div class="flex items-center justify-center w-full text-sm md:text-base">
        
            <label id="toggleMode" for="toggleB" class="flex items-center cursor-pointer ">
                <div class="mr-3 ${cMode == false ? "white" : "cool-gray-400"} font-medium ">
                ${getMode}
                </div>
                <!-- toggle -->
                <div class="relative">
                <!-- input -->
                <input type="checkbox" id="toggleB" class="sr-only " ${cMode == false ? "" : "checked"}>
                <!-- lin    e -->
                <div class="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <!-- dot -->
                <div class="dot absolute left-1 top-1 bg-transparent w-6 h-6 rounded-full transition text-3xl">
                    <div class="absolute -top-20 -left-5">
                        ${emoji}
                    </div>
                </div>
                </div>
                <!-- label -->
                <div class="ml-3 ${cMode == true ? "white" : "cool-gray-400"} font-medium">
                ${robMode}
                </div>
            </label>

        </div>

		`;
        this.container.innerHTML = content;
        this.setIdentifications();
    }

    setIdentifications() {
        this.checkbox = document.getElementById("toggleMode");
    }
}

