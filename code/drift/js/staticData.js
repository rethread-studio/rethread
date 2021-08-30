

const exhibitionTexts = {
    intro: {
        tittle: `Dr<span class="italic font-bold text-xl md:text-2xl">i</span>ft`,
        text: `<p class="text-left text-base md:text-xl">Search engines are familiar. 
        We use them every day for all sorts of occupations. From education and information to entertainment.
        Search engines are deeply integrated in our digital life.
        We trust them. We rely on them. We know them.</p>
          `
    },
    views: {
        tittle: `Dr<span class="italic font-bold text-xl md:text-2xl">i</span>ft`,
        text: `<p class="text-left text-base md:text-xl">Drift lets you explore search engines in a way you never thought about them.
        This online exhition lets you discover the intricate strata of code and network that operate to deliver the content of a search.
        And Drift reveals how these strata continuously evolve, even behind what seems a very well known, stable, familiar web site.</p>
          `
    },
    timeline: {
        tittle: `Dr<span class="italic font-bold text-xl md:text-2xl">i</span>ft`,
        text: `<p class="text-left text-base md:text-xl">While you visit Drift, you will discover the teeming world of code and complex networks
        that keep evolving to deliver the content of eight search engines. Evolution is powered by the constant 
        work of software development teams, that continuously improve performance, security and user experience.
        
        Drift lets you interactively explore the strata of 8 search engines that have been captured every hour over a period of 
        two months in May and June 2020. You can explore evolution step by step or let time evolve at normal or ludicrous speed. 
        You can explore the relative pace of evolution among strata and between two different web sites.</p>
          `
    },
    // spread: {
    //     tittle: `Dr<span class="italic font-bold text-xl md:text-2xl">i</span>ft`,
    //     text: `<p class="text-left">Web search engines are part of our digital lives. They are familiar and the comforting starting point for our explorations of the cyber space. There exist different search engines, each with its own aesthetic. When we adopt one, it becomes a mundane cyber place, we recognze it and we appreciate its stability. But is it really stable? Do search engines ever change over time? Is it really the same search engine we go back to every day?</p>
    //         <br>
    //         <p class="text-left">Drift lets you experience how search engines evolve, every hour.</p>`
    // },
}


export const legendTexts = {
    screenshot: {
        human: `This is what you normally see when searching for 2021 on the search engine.`,
        nerd: `This is a screenshot taken by the Drift bot after searching for 2021`
    },
    coverage: {
        human: `An abstract visualization of all the lines of code, written by teams of developers. All of them are necessary to produce the search result web page.`,
        nerd: `A visualization of the coverage of the javacript code that has been executed to render the search result page.`
    },
    graph: {
        human: `The flow represents the complete sequence of operations that have been performed in order to deliver the result of the search on a web page, and to organize this content in a nice and comprehensive manner.`,
        nerd: `This represents the complete execution trace of javascript functions was observed when rendering the search result page in the browser of the Drift bot`
    },
    network: {
        human: `This web-looking image represents all the connections that were established with various machines around the globe in order to fetch the content (text, images, colors, code, etc.) that appear in the web page`,
        nerd: `This is the deepest software layer, the one taking care of world-wide Internet connections in order to fetch the content to be delivered in the search results page`
    }
}

export default exhibitionTexts;