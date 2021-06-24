let observer;

const buildThresholdList = () => {
    let thresholds = [];
    let numSteps = 20;

    for (let i = 1.0; i <= numSteps; i++) {
        let ratio = i / numSteps;
        thresholds.push(ratio);
    }

    thresholds.push(0);
    return thresholds;
}


const createObserver = (handleIntersect, obsElemnts) => {

    let options = {
        root: null,
        rootMargin: "0px 0px 0px 0px",
        threshold: 0.5//buildThresholdList()
    };

    observer = new IntersectionObserver(handleIntersect, options);

    addElements(obsElemnts);
}

const addElements = (elements) => {
    elements.forEach(element => {
        const watch = element.querySelector("#exhibitDescrip") == null ? element : element.querySelector("#exhibitDescrip");
        observer.observe(watch);
    });
}


export default createObserver;