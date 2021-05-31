

class TimeLineView {
    constructor(container, model) {
        this.container = container;
        this.model = model;
        this.model.addObserver(this);
        this.play_btn = null;
        this.selectMenu = null;
    }

    render() {
        const dimensions = this.model.getTimeLineDimensions();
        const rectDimensions = dimensions.rectDimensions;
        const sliderDimensions = dimensions.sliderDimensions;
        const options = this.model.getSliderSpeed().map(speed => `<option>${speed.text}</option>`);
        const playButton = this.model.getPlayState() ? "pause" : "play";
        const buttons = `
        <div class="flex flex-row justify-center content-center items-center pl-6">
        <button id="playBtn" class="mr-8" >${playButton}</button>
            <div class="relative">
            <span class="white">speed</span>
                <select id="selectMenu" class="...">
                    ${options}
                </select>
                <div class="pointer-events-auto ...">
                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
                </div>
            </div>
        </div>
        `
        const butnContainer = document.getElementById(this.container);
        butnContainer.innerHTML = buttons;
        //ADD ALL THE VISUAL ITEMS 
        //MAIN wrapper in the HTML
        const wrapper = d3.select("#" + this.container)
            .attr("class", "absolute bottom-0 left-0 translate-middle flex")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        //general graphic container
        const bounds = wrapper.append("g")
            .style("transform", `translate(${dimensions.margin.left
                }px, ${dimensions.margin.top + dimensions.boundedHeight / 2
                }px)`)



        const timeLine = bounds.append("g")
            .attr("id", "timeLine")

        timeLine.append("rect")
            .attr("height", rectDimensions.height)
            .attr("width", rectDimensions.width)
            .style("fill", "#ffffff")

        const slider = timeLine.append("g")
            .attr("id", "sliderTimeLine")
            .style("transform", `translate(${0
                }px, ${-sliderDimensions.height / 2
                }px)`)

        slider.append("rect")
            .attr("height", sliderDimensions.height)
            .attr("width", sliderDimensions.width)
            .style("fill", "#ffffff")

        slider.append("text")
            .attr("id", "currentTime")
            .attr("y", -10)
            .style("fill", "#ffffff")
            .text()

        bounds.append("rect")
            .attr("id", "timeLinebounds")
            .attr("class", "noColor")
            .style("transform", `translate(${0
                }px, ${-sliderDimensions.height / 2
                }px)`)
            .attr("height", sliderDimensions.height)
            .attr("width", rectDimensions.width)

        this.updateSlider()
        this.renderAllAxis()
        this.setIdentifications();
    }

    updateSlider() {
        const { height, width } = this.model.getSliderHeight();
        const getSliderXPos = this.model.calculateSliderPos();
        const currentTime = this.model.getCurrentTime();
        const isMiddle = this.model.isSliderInMiddle() ? "end" : "start";

        d3.select("#sliderTimeLine")
            .style("transform", `translate(${getSliderXPos - width / 2
                }px, ${-height / 2
                }px)`)
        d3.select("#currentTime")
            .text(currentTime)
            .attr("text-anchor", isMiddle)

    }

    renderAllAxis() {
        //get all axis from model
        this.model.calculateBottomAxis()
            .forEach(axis => {
                d3.select("#timeLine")
                    .append("g")
                    .call(axis.axis
                        .ticks(axis.numTicks)
                        .tickFormat(axis.format)
                        .tickPadding(axis.padding)
                    );
            })
    }

    updatePlayBtn() {
        const playButton = this.model.getPlayState() ? "pause" : "play";
        const butnContainer = document.getElementById("playBtn");
        butnContainer.innerHTML = playButton;
    }


    update(changeDetails) {
        if (changeDetails.type == "updateTimeLine") {
            this.renderAllAxis();
            this.updateSlider();
        } else if (changeDetails.type == "updateCurrentVisit") {
            this.updateSlider();
        } else if (changeDetails.type == "playTimeLine") {
            this.updatePlayBtn();
        } else if (changeDetails.type == "pauseTimeLine") {
            this.updatePlayBtn();
        }
    }

    setIdentifications() {
        this.play_btn = document.getElementById("playBtn");
        this.selectMenu = document.getElementById("selectMenu")
        this.timeline = document.getElementById("timeLinebounds")

    }

}
