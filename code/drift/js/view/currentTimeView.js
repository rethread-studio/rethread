import { formatHour, formatDay, formatMonth } from '../helpers.js';

export default class CurrentTimeView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        this.model.addObserver(this);
    }

    render() {
        const date = this.model.getCurrentTime(false);
        const content = `
        <div class="flex flex-row items-center space-x-2 md:space-x-5 text-base md:text-4xl select-none" >
            <div class="white" >${formatMonth(date)} ${formatDay(date)}</div>
            <div class="bg-white px-1 md:p-2" >${formatHour(date)}</div>
        <div>
       `;
        this.container.innerHTML = content;
    }
    update(changeDetails) {
        if (changeDetails.type == "updateCurrentVisit") {
            this.render();
        } else if (changeDetails.type == "updateTimeLine") {
            this.render();
        }
    }


}

