["load","resize"].forEach(evt => {
    window.addEventListener(evt, function() {
        let divElem = document.getElementById("table-or-list");
        if (isMobileDevice() || window.innerWidth < 750) {
            divElem.innerHTML = `
                <hr>
                <b>an <a href="exhibition.html">exhibition</a></b> <br>
                - <i><a href="artworks/a-not-so-distant-past.html">A not so distant past</a></i>, Steve Ashby<br class="list">
                - <i><a href="artworks/apocryph.html">Apocryph</a></i>, Nicolas Boillot<br class="list">
                - <i><a href="artworks/dear-ai.html">Dear Ai</a></i>, Fred Wordie<br class="list">
                - <i><a href="artworks/glommen.html">Glommen</a></i>, Jonas Johansson<br class="list">
                - <i><a href="artworks/infinite-sand-sorter.html">Infinite Sand Sorter</a></i>, Agoston Nagy<br class="list">
                - <i><a href="artworks/loam.html">loam</a></i>, re|thread<br class="list">
                - <i><a href="artworks/megatouch.html">Megatouch</a></i>, Håkan Lidbo & Per-Olov Jernberg<br class="list">
                - <i><a href="artworks/pain-creature.html">Pain Creature</a></i>, nar.interactive<br class="list">
                - <i><a href="artworks/relaxrelaxrelax.html">RELAXRELAXRELAX</a></i>, Yuvia Maini<br class="list">
                - <i><a href="artworks/why-am-i-seeing-this.html">Why Am I Seeing This?</a></i>, Ivana Tkalčić

                <hr>
                <b>a <a href="symposium.html">symposium</a></b> <br>
                4 panels:<br class="list">
                - <a href="symposium.html#panel1">layers of contributions</a><br class="list">
                - <a href="symposium.html#panel2">what's in an artist</a><br class="list">
                - <a href="symposium.html#panel3">maestros, machines, money, etc.</a><br class="list">
                - <a href="symposium.html#panel4">collaboration & creativity</a>

                <hr>
            `;
        } else {
            divElem.innerHTML = `
                <table>
                    <colgroup>
                        <col class="col-left">
                        <col class="col-right">
                    </colgroup>
                    <tr>
                        <th class="col-left">an <a href="exhibition.html">exhibition</a></th>
                        <th class="col-right">a <a href="symposium.html">symposium</a></th>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/a-not-so-distant-past.html">A not so distant past</a></i>, Steve Ashby</td>
                        <td class="col-right">4 panels:</td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/apocryph.html">Apocryph</a></i>, Nicolas Boillot</td>
                        <td class="col-right">- <a href="symposium.html#panel1">layers of contributions</a></td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/dear-ai.html">Dear Ai</a></i>, Fred Wordie</td>
                        <td class="col-right">- <a href="symposium.html#panel2">what's in an artist</a></td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/glommen.html">Glommen</a></i>, Jonas Johansson</td>
                        <td class="col-right">- <a href="symposium.html#panel3">maestros, machines, money, etc.</a></td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/infinite-sand-sorter.html">Infinite Sand Sorter</a></i>, Agoston Nagy</td>
                        <td class="col-right">- <a href="symposium.html#panel4">collaboration & creativity</a></td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/loam.html">loam</a></i>, re|thread</td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/megatouch.html">Megatouch</a></i>, Håkan Lidbo & Per-Olov Jernberg</td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/pain-creature.html">Pain Creature</a></i>, nar.interactive</td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/relaxrelaxrelax.html">RELAXRELAXRELAX</a></i>, Yuvia Maini</td>
                    </tr>
                    <tr>
                        <td class="col-left">- <i><a href="artworks/why-am-i-seeing-this.html">Why Am I Seeing This?</a></i>, Ivana Tkalčić</td>
                    </tr>
                </table> 
            `;
        }
    });
});

function isMobileDevice() {
    // adapted from https://www.geeksforgeeks.org/how-to-detect-whether-the-website-is-being-opened-in-a-mobile-device-or-a-desktop-in-javascript/
  
    let details = navigator.userAgent;
    let regexp = /android|iphone|ipad/i;
  
    return regexp.test(details);
  }