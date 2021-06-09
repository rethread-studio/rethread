const formatHour = date => d3.timeFormat("%H:%M")(date)
const formatDay = date => d3.timeFormat("%d")(date)
const formatMonth = date => d3.timeFormat("%b")(date)


class CurrentTimeView {
    constructor(container, model) {

        this.container = document.getElementById(container);
        this.model = model;
        this.model.addObserver(this);
    }

    render() {
        const date = this.model.getCurrentTime(false);
        const content = `
        <div class="flex flex-row items-center space-x-5 text-4xl" >
            <div class="white" >${formatMonth(date)} ${formatDay(date)}</div>
            <div class="bg-white p-2" >${formatHour(date)}</div>
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

