
//Draw the squedule using D3
//data is a json containing the performance dates and hours
function drawSchedule(dates) {
    let hours = [];
    const data = dates.map(d => {
        const date = d.date;
        // console.log(moment(d.date))
        d.hours = d.hours.map(h => new Date(date + " " + h + ":00:00"))
        hours = [...hours, ...d.hours];
        return d;
    })


    // define the dimenstions of the visualization
    //CREATE THE DIMENSIONS FOR THE SCORE
    const container = document.getElementById("schedule")
    let dimensions = {
        width: container.offsetWidth,
        height: 150,
        margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
        },
        spacing: 2,
    }
    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
    //
    const axisPadding = 20;
    const hoursHeight = 50;
    const hoursWidth = 1;
    //CREATE ACCESSORS
    const dateAccessor = (d) => new Date(d.date);

    //TIME FORMATERS
    const formatDay = d3.timeFormat("%a");
    const formatDayNum = d3.timeFormat("%d")



    //DEFINE SCALES
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, dateAccessor))
        .range([dimensions.margin.left, dimensions.width])
        .nice();
    //ADD WRAPPER
    const wrapper = d3.select("#schedule").append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    //ADD BOUNDS
    const bounds = wrapper.append("g")
        .style("transform", 'translate(${dimensions.margin.left}px, ${dimension.margin.top}px)')

    const myColor = d3.scaleSequential().domain(d3.extent(data, dateAccessor))
        .interpolator(d3.interpolateViridis);

    const now = new Date;
    const closest = findClosestDate(hours, now)
    //ADD TRIANGLE AND DATES IF THERE ARE AVAILABLE
    if (closest != null) {
        bounds.append("g")
            .attr("class", "triangleDate")
            .append('path')
            .attr("class", "triangle")
            .attr("d", d3.symbol().type(d3.symbolTriangle))
            .attr("transform", `translate(${xScale(closest)}, ${dimensions.boundedHeight - axisPadding - hoursHeight - 10}) rotate(180)`)
    }
    if (closest != null) tick();


    // const remainingTime = moment.duration(moment(closest).diff(moment(now)))

    const message = closest == null ? "There are no more performance" : "Next performance: " +
        closest.format("MMMM Do")
        + " at " + closest.format("HH");
    bounds.append("g")
        .append('text')
        .attr("class", "mainTittle")
        .attr("x", dimensions.margin.right)
        .attr("y", 30)
        .text(message)

    function tick() {
        const closestTime = findClosestDate(hours, Date.now())

        const message = closestTime == null ? "There are no more performance" : "Next performance: " +
            closestTime.format("MMMM Do")
            + " at " + closestTime.format("HH");

        d3.select(".mainTittle")
            .text(message)

        d3.select(".triangle")
            .attr("transform", `translate(${xScale(closestTime)}, ${dimensions.boundedHeight - axisPadding - hoursHeight - 10}) rotate(180)`)

        setTimeout(tick, 1000 - Date.now() % 1000);
    }
    //DRAW REST OF ITEMS
    bounds.append("g")
        .data(dates)
        .enter()
        .append("rect")
        .attr("x", d => xScale(dateAccessor(d)))
        .attr("y", 0)
        .attr("width", 30)
        .attr("height", 30)
        .attr("fill", "red")

    const hoursViz = bounds.append("g")
        .attr("transform", `translate(0, ${dimensions.boundedHeight - axisPadding - hoursHeight})`)


    hoursViz.selectAll("hours")
        .data(hours)
        .enter()
        .append("rect")
        .attr("class", "hourRect")
        .attr("x", d => xScale(d))
        .attr("y", 0)
        .attr("width", hoursWidth)
        .attr("height", hoursHeight)
        .attr("fill", d => myColor(d))


    const dateTag = bounds.append("g")
        .attr("class", "dateTag")
        .attr("transform", `translate(0, ${dimensions.boundedHeight - hoursHeight + 6})`)

    dateTag.selectAll("dateName")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => xScale(dateAccessor(d)))
        .attr("y", 0)
        .attr("font-size", "20px")
        .attr("class", "titleDate")
        .text(d => formatDay(dateAccessor(d)))

    dateTag.selectAll("dateNumber")
        .data(data)
        .enter()
        .append("text")
        .attr("transform", `translate(0, ${16})`)
        .attr("x", d => xScale(dateAccessor(d)))
        .attr("y", 0)
        .attr("font-size", "20px")
        .attr("class", "titleNumber")
        .text(d => formatDayNum(dateAccessor(d)))

}

//RETURNS 
function findClosestDate(dates, currentDate) {
    const closestDate = dates.find(d => moment(currentDate).isBefore(moment(d)))
    return closestDate === undefined ? null : moment(closestDate);
}

const presentationDates = [
    // {
    //     date: '2020-12-03',
    //     hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    // },
    {
        date: '2020-12-05',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-06',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-07',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },

    {
        date: '2020-12-08',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-09',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-10',
        hours: []
    },

    {
        date: '2020-12-10',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-11',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-12',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },
    {
        date: '2020-12-13',
        hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    },

]

drawSchedule(presentationDates);