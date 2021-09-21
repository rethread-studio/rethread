

export default class TimeLineView {
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
        const tickDimensions = dimensions.tickDimensions;
        const options = this.model.getSliderSpeed().map(speed => `<option>${speed.text}</option>`);
        const playButton = this.model.getPlayState() ? `<i class="fas fa-pause"></i>` : `<i class="fas fa-play"></i>`;
        const buttons = `
        <div class="flex flex-row content-center items-center  pl-5 ">
            <button id="playBtn" class="transition-colors duration-500 ease-in-out mr-2 rounded-full h-10 w-10 hover:bg-white white hover:text-black text-center focus:border-0 focus:border-transparent focus:outline-none flex items-center justify-center" >${playButton}</button>
            <div class="relative flex items-center">
                <span class="white mr-2 text-sm md:text-base">Speed</span>
                <select id="selectMenu" class="h-8 md:h-10 w-24 md:w-26 pl-2 pr-2 text-sm md:text-base">
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
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        //general graphic container
        const bounds = wrapper.append("g")
            .style("transform", `translate(${dimensions.margin.left
                }px, ${sliderDimensions.height + tickDimensions.height
                }px)`)



        const timeLine = bounds.append("g")
            .attr("id", "timeLine")

        timeLine.append("rect")
            .attr("height", rectDimensions.height)
            .attr("width", dimensions.boundedWidth)
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

        const phantomSlider = timeLine.append("g")
            .attr("id", "phantomSlider")
            .style("transform", `translate(${0
                }px, ${-sliderDimensions.height / 2
                }px)`)
            .attr("opacity", 0)

        phantomSlider.append("rect")
            .attr("height", sliderDimensions.height)
            .attr("width", sliderDimensions.width)
            .style("fill", "#ffffff")

        phantomSlider.append("text")
            .attr("id", "phatomTime")
            .attr("y", -10)
            .style("fill", "#ffffff")
            .text()

        const presentDate = timeLine.append("g")
            .attr("id", "presentDate")
            .style("transform", `translate(${dimensions.boundedWidth - tickDimensions.width
                }px, ${-rectDimensions.height / 2 + 12
                }px)`)


        presentDate.append("text")
            .attr("id", "todaysDate")
            .attr("class", "text-xs")
            .attr("y", -10)
            .style("fill", "#ffffff")
            .text(this.model.getLastDateFormated())
            .attr("text-anchor", "end")

        const firstDate = timeLine.append("g")
            .attr("id", "firstDate")
            .style("transform", `translate(${0
                }px, ${-rectDimensions.height / 2 + 12
                }px)`)

        const dateFormated = this.model.getDateFormated(0);
        firstDate.append("text")
            .attr("id", "firstDateText")
            .attr("class", "text-xs")
            .attr("y", -10)
            .style("fill", "#ffffff")
            .text(dateFormated)
            .attr("text-anchor", "start")

        bounds.append("rect")
            .attr("id", "timeLinebounds")
            .attr("class", "noColor")
            .style("transform", `translate(${0
                }px, ${-sliderDimensions.height / 2
                }px)`)
            .attr("height", sliderDimensions.height)
            .attr("width", dimensions.boundedWidth)

        this.updateSlider()
        this.setIdentifications();
    }

    updateSlider() {
        const { height, width } = this.model.getSliderHeight();
        const getSliderXPos = this.model.calculateSliderPos();
        const dateFormated = this.model.getDateFormated(0);

        d3.select("#sliderTimeLine")
            .style("transform", `translate(${getSliderXPos - width / 2
                }px, ${-height / 2
                }px)`)

        d3.select("#firstDateText")
            .text(dateFormated)
    }


    updatePhantomSlider(formatedDate, isMiddle, slidePos) {
        const sliderDimensions = this.model.getTimeLineDimensions().sliderDimensions;

        d3.select("#phantomSlider")
            .style("transform", `translate(${slidePos
                }px, ${-sliderDimensions.height / 2
                }px)`)
        d3.select("#phatomTime")
            .text(formatedDate)
            .attr("text-anchor", isMiddle)
    }

    viewPhantomSlider(view) {
        d3.select("#phantomSlider")
            .attr("opacity", view ? 0.5 : 0)
    }

    updatePlayBtn() {
        const playButton = this.model.getPlayState() ? `<i class="fas fa-pause"></i>` : `<i class="fas fa-play"></i>`;
        const butnContainer = document.getElementById("playBtn");
        butnContainer.innerHTML = playButton;
    }


    update(changeDetails) {
        if (changeDetails.type == "updateTimeLine") {
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
        this.phantomSlider = document.getElementById("phantomSlider");

    }

}
