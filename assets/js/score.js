

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

}

const world = {
    name: "world",
    sections: [
        { name: "Sweden packages in", duration: 15, direction: "in" },
        { name: "Europe packages in", duration: 18, direction: "in" },
        { name: "America packages in", duration: 18, direction: "in" },
        { name: "Oceania packages in", duration: 10, direction: "in" },
        { name: "Africa packages in", duration: 10, direction: "in" },
        { name: "Sweden packages out", duration: 10, direction: "out" },
        { name: "Europe packages out", duration: 18, direction: "out" },
        { name: "America packages out", duration: 15, direction: "out" },
        { name: "Oceania packages out", duration: 10, direction: "out" },
        { name: "Africa packages out", duration: 10, direction: "out" },
        { name: "Fade out", duration: 1 },
    ],
};

const numbers = {
    name: "numbers",
    sections: [
        {
            name: "The World in",
            duration: 20,
            region: "The World",
            textLimit: 100,
            startSpeed: 0.9,
            endSpeed: 1.2,
        },
        {
            name: "The World out",
            duration: 20,
            region: "The World",
            textLimit: 100,
            speed: 1.5,
            startSpeed: 1.4,
            endSpeed: 1.7,
        },
        {
            name: "Size",
            duration: 20,
            startTextLimit: 9,
            endTextLimit: 3.5,
            startSpeed: 0.4,
            endSpeed: 2.0,
        },
        {
            name: "Multinumbers",
            duration: 30,
            region: "none",
            textLimit: 2,
            startSpeed: 1.5,
            endSpeed: 1.2,
        },
        {
            name: "Pre fade out",
            startTextLimit: 2,
            endTextLimit: 9,
            duration: 10,
            startSpeed: 1.5,
            endSpeed: 0.4,
        },
        { name: "Fade out", duration: 10 },
    ],
};

const drops = {
    name: "drops",
    sections: [
        { name: "Sweden in", duration: 12, region: "Sweden" },
        { name: "Europe in", duration: 16, region: "Europe" },
        { name: "in", duration: 23, region: "none" },
        { name: "Sweden out", duration: 12, region: "Sweden" },
        { name: "Europe out", duration: 16, region: "Europe" },
        { name: "out", duration: 24.5, region: "none" },
        { name: "fade out", duration: 4 },
    ],
}

const protocol = {
    name: "ports",
    sections: [
        { name: "network", duration: 12, pullBackCoeff: 10.0, textActive: true },

        { name: "packets", duration: 5, pullBackCoeff: 10.0, textActive: false },
        { name: "network", duration: 5, pullBackCoeff: 10.0, textActive: false },
        { name: "network", duration: 0.3, pullBackCoeff: 40.0 },
        { name: "packets", duration: 1 },
        { name: "network", duration: 0.3, pullBackCoeff: 60.0 },
        { name: "packets", duration: 2 },
        { name: "network", duration: 0.3, pullBackCoeff: 70.0 },
        { name: "packets", duration: 0.3 },
        { name: "network", duration: 0.3, pullBackCoeff: 100.0 },
        { name: "network", duration: 2, pullBackCoeff: 0.5, textActive: false },
        { name: "network", duration: 2, pullBackCoeff: 1.0, textActive: false },
        { name: "network", duration: 2.5, pullBackCoeff: 50.0, textActive: false },

        { name: "packets", duration: 1, pullBackCoeff: 10.0, textActive: false },
        { name: "network", duration: 0.3, pullBackCoeff: 40.0 },
        { name: "packets", duration: 1 },
        { name: "network", duration: 0.3, pullBackCoeff: 60.0 },
        { name: "packets", duration: 8 },
        { name: "network", duration: 0.3, pullBackCoeff: 70.0 },
        { name: "packets", duration: 0.3 },
        { name: "network", duration: 0.3, pullBackCoeff: 100.0 },
        { name: "packets", duration: 0.3 },
        { name: "network", duration: 0.3, pullBackCoeff: 200.0 },
        { name: "packets", duration: 0.2 },
        { name: "network", duration: 0.2, pullBackCoeff: 300.0 },
        { name: "packets", duration: 0.2 },
        { name: "network", duration: 0.2, pullBackCoeff: 400.0 },
        { name: "packets", duration: 7 },
        { name: "network", duration: 2, pullBackCoeff: 400.0 },

        { name: "network", duration: 3, pullBackCoeff: 30.0, randomVelAmount: 0.1 },
        { name: "network", duration: 1, pullBackCoeff: 3.0, randomVelAmount: 3.0 },
        { name: "network", duration: 1, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.5, pullBackCoeff: 50.0 },
        { name: "network", duration: 10, drawShader: false },
        { name: "packets", duration: 4, pullBackCoeff: 1, drawShader: false, textActive: false },
        { name: "network", duration: 3, pullBackCoeff: 0.5, drawShader: false, textActive: false },
        { name: "packets", duration: 1, pullBackCoeff: 10.0, drawShader: false, textActive: false },
        { name: "network", duration: 1, pullBackCoeff: 0.5, drawShader: false },
        { name: "network", duration: 0.5, pullBackCoeff: 600.0, drawShader: false },
        { name: "packets", duration: 2, pullBackCoeff: 0.002 },
        { name: "packets", duration: 0.2, pullBackCoeff: 600.0, drawShader: false },
        { name: "network", duration: 1, pullBackCoeff: 100.0 },
        { name: "packets", duration: 1, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.5, pullBackCoeff: 200.0, randomVelAmount: 30.0 },
        { name: "packets", duration: 2.0, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 30.0 },
        { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 30.0 },
        { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 30.0 },
        { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 300.0 },
        { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
        { name: "network", duration: 0.2, pullBackCoeff: 0.0, randomVelAmount: 300.0 },
        { name: "packets", duration: 0.2, pullBackCoeff: 1.0 },
        { name: "packets", duration: 0.2, pullBackCoeff: 1.0, randomVelAmount: 1000.0 },
        { name: "network", duration: 3.2, pullBackCoeff: 0.0, randomVelAmount: 3000.0 },
        { name: "packets", duration: 5, pullBackCoeff: 60.0, textActive: false },
        { name: "network", duration: 5, pullBackCoeff: 60.0, textActive: false },
        { name: "fade out", duration: 2.0 },
    ],
}



drawScore(world, "location", "red", 0, "#tooltipLocation");
drawScore(numbers, "speed", "green", 0, "#tooltipSpeed");
drawScore(drops, "size", "orange", 0, "#tooltipSize");
drawScore(protocol, "protocol", "blue", 0, "#tooltipProtocol");