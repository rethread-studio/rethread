
class WhatWeDidViewView {
    constructor(container) {
        this.container = document.getElementById(container);
    }

    render() {
        const content = `
        <div class="w-3/6 text-2xl font-thin">
            <h1 class="font-bold text-4xl dritTittle tracking-widest mb-5">The Dr<span class="italic font-bold text-4xl">i</span>ft exhibition</h1>
            <p>In biology, genetic drift indicates a high frequency of gene variations through generations. Drift is a digital art exhibition that unveils the very rapid evolution of search engines. It dissects the different strata of code that power the search engines. The visitors can experience the contrast between the evolution of the visible and the invisible parts of search engines, as well as between different search engines.</p>
            <br>
            <p>Since XXXXX2021, the Drift robot searches for <span class="font-bold">2021</span> in 9 different search engines, every hour, 24/7. For every search, the robot saves a picture of a human visitor would see if she had performed the query and that exact time, with this specific engine. The robot also save some information about the invisible software threads that power the search engine. The robot then lets the artist use all this data to perform the Drift exhibition.</p>
            <br>
            <p>Drift is an interactive exhbition that lets visitors discover the evolution pace of the human visible and the invisible software of search engines.</p>

        </div>
        
		`;
        this.container.innerHTML = content;

    }

}
