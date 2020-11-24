

function drawScore(score, _wrapper, _color, timeInit, _tooltip) {
    //CREATE THE DIMENSIONS FOR THE SCORE
    let dimension = {
        width: 200,
        height: 500,
        margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
        },
    }
    dimension.boundedWidth = dimension.width - dimension.margin.left - dimension.margin.right;
    dimension.boundedHeight = dimension.height - dimension.margin.top - dimension.margin.bottom;


    const randomX = d3.randomUniform(20, dimension.boundedWidth - 20);

    let data = score.sections
    data = data.map((d, i) => {
        d.time = (timeInit + d.duration);
        d.y = i == 0 ? timeInit : data[i - 1].y + data[i - 1].duration;
        d.x = randomX();
        return d;
    });

    const durationAccesor = (d) => { return d.duration }
    const timeDuration = [timeInit, timeInit + d3.sum(data, durationAccesor)]
    console.log(timeDuration, "time duration")

    //SACLE
    const yScale = d3.scaleLinear()
        .domain(timeDuration)
        .range([0, dimension.boundedHeight])
        .nice()

    //DATA TO DRAW THE AREAS
    const sections = 7;
    const linePos = dimension.boundedWidth / sections;
    const ySections = 11;
    const yLinePos = dimension.boundedHeight / ySections;
    //chould have [x,y] points in it
    const points = [];
    const num = d3.randomUniform(70);
    //AREA GENERATOR
    const areaGenerator = d3.area();
    //COLOR GENERATOR
    const myColor = d3.scaleLinear().domain([0, 10])
        .range(["white", _color])
    //CREATE RANDOM POINTS
    for (let i = 0; i < sections; i++) {
        const positions = [];
        positions.push([0, 0])
        for (let j = 0; j < ySections; j++) {
            const posX = linePos * i + num();
            const posY = yLinePos * j + num();
            positions.push([posX, posY]);
        }
        positions.push([0, dimension.boundedHeight])
        points.push(positions)
    }



    const wrapper = d3.select("#" + _wrapper)
        .append("svg")
        .attr("width", dimension.width)
        .attr("height", dimension.height)

    const bounds = wrapper.append("g")
        .style("transform", 'translate(${dimensions.margin.left}px, ${dimension.margin.top}px)')

    //DRAW THE AREA BACKGROUND
    for (let i = points.length - 1; i >= 0; i--) {
        const area = areaGenerator(points[i]);
        bounds.append('path')
            .attr('d', area)
            .attr("fill", myColor(i))

    }

    //LINE GENERATOR
    const line = d3.line()
        .x(function (d, i) { return d.x; }) // set the x values for the line generator
        .y(function (d) { return yScale(d.y) }) // set the y values for the line generator 

    //AXIS GENERATOR
    // const yAxisGenerator = d3.axisLeft()
    //     .scale(yScale);
    // const yAxis = bounds.append("g")
    //     .call(yAxisGenerator)
    //     .style("transform", `translateX(${dimension.margin.left + 20}px)`)

    bounds.append("path")
        .datum(data) // 10. Binds data to the line 
        .attr("class", "line") // Assign a class for styling 
        .attr("d", line) // 11. Calls the line generator 
        .attr("fill", "none")


    // console.log(data)
    const circles = bounds.selectAll('circle')
        .data(data)
        .enter()
        .append("circle")
    const r = 15;

    const tooltip = d3.select(_tooltip)
    function onMouseenter(datum) {

        // const x = xScale(datum.x0)
        //     + (xScale(datum.x1) - xScale(datum.x0)) / 2
        //     + dimensions.margin.left

        // const y = yScale(yAccessor(datum))
        //     + dimensions.margin.top



        tooltip.select("img")
            .attr("width", dimension.width)

        tooltip.select("#name")
            .text(datum.name)

        tooltip.select("#duration")
            .text(datum.duration)
        // .text(yAccessor(datum))

        // tooltip.select('#range')
        //     .text([
        //         formatHumidity(datum.x0),
        //         formatHumidity(datum.x1)
        //     ].join(" - "))

        // tooltip.style("transform", `translate(`
        //     + `calc( -50% + ${x}px),`
        //     + `calc(-100% + ${y}px)`
        //     + `)`)
        tooltip.style("opacity", 1)
    }

    const onMouseLeave = (dat) => {
        console.log("mouse leave")
        tooltip.style("opacity", 0)

    }

    const circlesAttr = circles
        .attr("cx", function (d) { return d.x })
        .attr("cy", function (d) { return yScale(d.y) + r; })
        .attr("r", r)
        .attr("fill", "#333333")
        .on("mouseenter", (event, d) => {
            onMouseenter(d)
        })
        .on("mouseleave", onMouseLeave)


    // const rects = bounds.selectAll('rect')
    //     .data(data)
    //     .enter()
    //     .append("rect")
    // const rectsAttr = rects
    //     .attr("x", (d) => d.x)
    //     .attr("y", (d) => yScale(d.y))
    //     .attr("width", 4)
    //     .attr("height", (d) => d.y + yScale(d.duration))
    //     .style("fill", function (d) { "#333333"; })
    // .attr("cx", function (d) { return randomX() })
    // .attr("cy", function (d) { return yScale(d.y) + r; })
    // .attr("r", function (d) { return r })
    // .style("fill", function (d) { "#333333"; })
}

const world = {
    name: "world",
    sections: [
        { name: "SWEDEN", duration: 12 },
        { name: "EU", duration: 12 },
        { name: "AME", duration: 40 },
        { name: "AS", duration: 20 },
    ],
};

const numbers = {
    name: "numbers",
    sections: [
        { name: "all", duration: 10, region: "Sweden", speed: 0.5 },
        { name: "all", duration: 13, region: "Europe", speed: 0.8 },
        { name: "all", duration: 18, region: "The World", speed: 1.1 },
        {
            name: "in",
            duration: 14,
            region: "The World",
            textLimit: 8,
            speed: 1.0,
        },
        {
            name: "out",
            duration: 18,
            region: "The World",
            textLimit: 4,
            speed: 1.5,
        },
        {
            name: "size",
            duration: 20,
            startTextLimit: 4,
            endTextLimit: 2.5,
            startSpeed: 0.4,
            endSpeed: 1.5,
        },
        {
            name: "multinumbers",
            duration: 15,
            region: "none",
            textLimit: 2,
            startSpeed: 1.5,
            endSpeed: 1.2,
        },
        {
            name: "pre fade out",
            startTextLimit: 2,
            endTextLimit: 9,
            duration: 3,
            startSpeed: 1.5,
            endSpeed: 0.4,
        },
        { name: "fade out", duration: 20 },
    ],
};

const drops = {
    name: "drops",
    sections: [
        { name: "in", duration: 12, region: "Sweden" },
        { name: "out", duration: 12, region: "Sweden" },
        { name: "in", duration: 16, region: "Europe" },
        { name: "out", duration: 16, region: "Europe" },
        { name: "in", duration: 20, region: "none" },
        { name: "out", duration: 20, region: "none" },
        { name: "fade out", duration: 4 },
    ],
}

const protocol = {
    name: "ports",
    sections: [
        { name: "network", duration: 5, pullBackCoeff: 10.0 },
        { name: "packets", duration: 5 },
        { name: "network", duration: 5, pullBackCoeff: 10.0 },
        { name: "packets", duration: 10 },
        { name: "network", duration: 2, pullBackCoeff: 1000.0, drawShader: false },

        { name: "network", duration: 2, pullBackCoeff: 1.0 },
        { name: "network", duration: 1, pullBackCoeff: 10.0 },
        { name: "network", duration: 1, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.5, pullBackCoeff: 50.0 },
        { name: "network", duration: 10, drawShader: false },
        { name: "packets", duration: 4, pullBackCoeff: 0.1, drawShader: false },
        { name: "network", duration: 3, pullBackCoeff: 0.05, drawShader: false },
        { name: "packets", duration: 1, pullBackCoeff: 0.01, drawShader: false },
        { name: "network", duration: 1, pullBackCoeff: 0.005, drawShader: false },
        { name: "network", duration: 0.5, pullBackCoeff: 1000.0, drawShader: false },
        { name: "packets", duration: 2, pullBackCoeff: 0.002 },
        { name: "network", duration: 1, pullBackCoeff: 100.0 },
        { name: "packets", duration: 1, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.5, pullBackCoeff: 1000.0 },
        { name: "packets", duration: 0.5, pullBackCoeff: 0.0 },
        { name: "network", duration: 0.5, pullBackCoeff: 1000.0 },
    ],
}



drawScore(world, "location", "red", 0, "#tooltipLocation");
drawScore(numbers, "speed", "green", 0, "#tooltipSpeed");
drawScore(drops, "size", "orange", 0, "#tooltipSize");
drawScore(protocol, "protocol", "blue", 0, "#tooltipProtocol");