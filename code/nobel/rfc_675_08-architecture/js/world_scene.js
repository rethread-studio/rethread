

class WorldScene extends Scene {
    constructor() {
        super();
        this.sections = [];
        this.playhead = {
            sectionIndex: 0,
            countdown: 0,
            state: "before start", // "playing", "fade in", "end of movement"
        };

        //LIST OF COUNTRIES IN EUROPEAN UNION
        this.eu_countries = [
            "Sweden",
            "France",
            "Belgium",
            "Austria",
            "Bulgaria",
            "Croatia",
            "Cyprus",
            "Czech Republic",
            "Denmark",
            "Estonia",
            "Finland",
            "Germany",
            "Greece",
            "Hungary",
            "Ireland",
            "Italy",
            "Latvia",
            "Lithuania",
            "Luxembourg",
            "Malta",
            "Netherlands",
            "Poland",
            "Portugal",
            "Romania",
            "Slovakia",
            "Slovenia",
            "Spain",
            "United Kingdom"
        ]

        this.ame_countries = [
            "Brazil",
            "United States",
            "Mexico",
            "Colombia",
            "Argentina",
            "Canada",
            "Canada",
            "Peru",
            "Venezuela",
            "Chile",
            "Ecuador",
            "Guatemala",
            "Cuba",
            "Bolivia",
            "Haiti",
            "Dominican Republic",
            "Honduras",
            "Paraguay",
            "Nicaragua",
            "El Salvador",
            "Costa Rica",
            "Panama",
            "Uruguay",
            "Jamaica",
            "Bahamas",
            "Belize",
        ]

        this.asian_countries = [
            "Afghanistan",
            "Bangladesh",
            "China",
            "India",
            "Iran",
            "Israel",
            "Japan",
            "Korea (North)",
            "Philippines",
            "Russia",
            "Saudi Arabia",
            "Korea (South)",
            "Taiwan",
            "Thailand",
            "Viet Nam",
            "Armenia",
            "Azerbaijan",
            "Bahrain",
            "Bangladesh",
            "Bhutan",
            "Brunei",
            "Cambodia",
            "China",
            "Cyprus",
            "Georgia",
            "Jordan",
            "Kazakhstan",
            "Kuwait",
            "Kyrgyztan",
            "Laos",
            "Lebanon",
            "Malaysia",
            "Maldvives",
            "Mongolia",
            "Myanmar",
            "Nepal",
            "Oman",
            "Pakistan",
            "Palestine",
            "Qatar",
            "Singapore",
            "Sri Lanka",
            "Syria"
        ]
        this.afr_countries = [
            "Algeria",
            "Angola",
            "Benin",
            "Botswana",
            "Burkina Faso",
            "Burundi",
            "Cape Verde",
            "Cameroon",
            "Central African Republic",
            "Chad",
            "Comoros",
            "Congo",
            "Cote d'Ivoire",
            "Djibouti",
            "Egypt",
            "Equatorial Guinea",
            "Eritrea",
            "Eswatini",
            "Ethiopia",
            "Gabon",
            "Gambia",
            "Ghana",
            "Guinea",
            "Guinea-Bissau",
            "Kenya",
            "Lesotho",
            "Liberia",
            "Libya",
            "Madagasar",
            "Malawi",
            "Mali",
            "Mauritania",
            "Mauritius",
            "Morocco",
            "Mozambique",
            "Namibia",
            "Niger",
            "Nigeria",
            "Rwanda",
            "Sao Tome and Principe",
            "Senegal",
            "Seychelles",
            "Sierra Leone",
            "Somalia",
            "South Africa",
            "South Sudan",
            "Sudan",
            "Tanzania",
            "Togo",
            "Tunisia",
            "Uganda",
            "Zambia",
            "Zimbabwe"
        ]

        this.oce_countries = [
            "Australia",
            "Papua New Guinea",
            "New Zealand",
            "Fiji",
            "Solomon Islands",
            "Vanautu",
            "New Caledonia",
            "French Plynesia",
            "Samoa",
            "Guam",
            "Kiribati",
            "Federated States of Micronesia",
            "Tonga",
            "American Samoa",
            "Northern Mariana Islands",
            "Marshall Islands",
            "Palau",
            "Cook Islands",
            "Walls and Futuna",
            "Tuvalu",
            "Nauru",
            "Norfolk Island",
            "Niue",
            "Tokelau",
            "Pitcairn Islands"
        ]

        this.world_countries = [
            ...this.eu_countries,
            ...this.ame_countries,
            ...this.asian_countries,
            ...this.afr_countries,
            ...this.oce_countries
        ]

        this.colorPallete = {
            black: {
                r: 0,
                g: 0,
                b: 0,
            },
            green: {
                r: 125,
                g: 250,
                b: 183,
            },
            red: {
                r: 255,
                g: 47,
                b: 46
            },
            orange: {
                r: 225,
                g: 170,
                b: 71
            },
            lightBlue: {
                r: 74,
                g: 157,
                b: 224
            },
            darkGreen: {
                r: 101,
                g: 167,
                b: 140
            },
            darkBlue: {
                r: 0,
                g: 31,
                b: 179
            },
            white: {
                r: 255,
                g: 255,
                b: 255
            },
            brightGreen: {
                r: 197,
                g: 255,
                b: 0,
            },
        }

        this.test_countries = [
            "Sweden",
            "Norway",
            "Netherlands",
            "United States",
            "France",
            "Belgium",
            "Colombias"

        ]



        this.sweden_countries = [
            "Sweden",
        ]

        this.focusLocation = {
            EU: {
                label: "EUROPE",
                countryArray: this.eu_countries,
            },
            AME: {
                label: "AMERICA",
                countryArray: this.ame_countries,
            },
            AS: {
                label: "ASIA",
                countryArray: this.asian_countries,
            },
            AF: {
                label: "AFRICA",
                countryArray: this.afr_countries,
            },
            OC: {
                label: "OCEANIA",
                countryArray: this.oce_countries,
            },
            WORLD: {
                label: "WORLD",
                countryArray: this.world_countries,
            },
            SWEDEN: {
                label: "SWEDEN",
                countryArray: this.sweden_countries,
            },
            SELECTED: {
                label: "",
                countryArray: this.test_countries,
            }
        }


        this.positions = {
            row: {
                r1: 38 * subsampling,
                r2: 86 * subsampling,
                r3: 170 * subsampling,
            },
            col: {
                c1: 35 * subsampling,
                c2: 115 * subsampling,
                c3: 199 * subsampling,
                c4: 283 * subsampling,
                c5: 314 * subsampling,
            },
            padding: {
                top: 9 * subsampling,
                right: 5 * subsampling,
                botton: 5 * subsampling,
                left: 5 * subsampling,
            }
        }

        this.fontSize = {
            tittle: 36 * subsampling,
            number: 16 * subsampling,
            countries: 18 * subsampling,
        }


        this.dashBoard;
        this.countryManager;





        this.focusRegion = this.focusLocation.SWEDEN.label;
        this.selectedRegion = this.focusLocation[this.focusRegion].countryArray;
        this.liveSign;
        this.crossPoints = [

            this.positions.row.r1 + 25 * subsampling

            ,

            this.positions.row.r3 - 25 * subsampling

            ,
        ]

    }
    preload() {
        // This function is called from the p5 preload function. Use it 
        // to load assets such as fonts and shaders.
    }
    setup() {

        // This function is called from the p5 setup function. Use it to init
        // all the state that requires p5 to be loaded (such as instantiating
        // p5 types like p5.Vector or createGraphics).
        //CREATE DASHBOARD

        this.dashBoard = new DashBoard(antonFont, this.colorPallete, this.positions, this.focusRegion, this.fontSize, this.playhead)
        this.countryManager = new CountryManager(this.selectedRegion, antonFont, this.fontSize, this.positions, this.colorPallete, this.dashBoard);
        this.liveSign = new LiveSign("", antonFont, false)
    }
    draw(dt) {
        colorMode(RGB, 255, 255, 255, 100);
        // Update state and draw. dt is the time since last frame in seconds.
        // Set canvas background

        background("rgba(0,0,0,.1)");
        switch (this.playhead.state) {

            case "fade in":
                this.drawDecorations();
                //UPDATE DASHBOARD
                this.dashBoard.updateData();
                this.dashBoard.display();
                this.dashBoard.changeDirection(this.sections[this.playhead.sectionIndex].direction)

                this.liveSign.updateTickTime();
                this.liveSign.draw();

                break;

            case "before start":

                break;

                break;
            case "playing":
                this.playhead.countdown -= dt;
                if (this.playhead.countdown <= 0) {
                    this.playhead.sectionIndex += 1;
                    if (this.playhead.sectionIndex < this.sections.length) {
                        this.playhead.countdown = this.sections[
                            this.playhead.sectionIndex
                        ].duration;
                    }
                    //CHECK IF THE SECTION HAS CHANGED
                    if (this.sections[this.playhead.sectionIndex].name == "fade out") {
                        this.fadeOut(this.sections[this.playhead.sectionIndex].duration);

                    } else {
                        const currentSection = this.sections[this.playhead.sectionIndex].name;
                        if (this.focusRegion != currentSection && this.currentSection != "MESSAGE") {
                            const currentSection = this.sections[this.playhead.sectionIndex].name;
                            console.log("the section has changed", this.focusRegion, currentSection, this.sections[this.playhead.sectionIndex]);
                            this.focusRegion = currentSection;
                            this.selectedRegion = this.focusLocation[this.focusRegion].countryArray;
                            this.countryManager.changeCountries(this.selectedRegion);
                            this.countryManager.changeDirection(this.sections[this.playhead.sectionIndex].direction)
                            this.countryManager.cleanCountriesCounter()
                            this.dashBoard.changeLocation(this.focusLocation[this.focusRegion].label)
                            this.dashBoard.updateInitTime(this.playhead.countdown)
                            this.dashBoard.cleanNumCountries();
                            this.dashBoard.changeDirection(this.sections[this.playhead.sectionIndex].direction)
                            this.dashBoard.showMessage(true);
                        }
                    }
                }


                this.drawDecorations();
                //UPDATE COUNTRY MANAGER
                this.countryManager.updateData();
                this.countryManager.display();
                //UPDATE DASHBOARD
                this.dashBoard.updateData();
                this.dashBoard.display();

                this.liveSign.updateTickTime();
                this.liveSign.draw();
                break;

            default:

                break;
        }





    }

    drawDecorations() {

        for (let i = 0; i < 7; i++) {
            const { r, g, b } = this.colorPallete.white;
            stroke(r, g, b, 100);
            strokeWeight(1 * subsampling);
            const x = this.crossPoints[0];
            const y = ((i * 80) + 20) * subsampling;
            const padding = 3 * subsampling;
            line(x, y - padding, x, y + padding);
            line(x + padding, y, x - padding, y);

            const x2 = this.crossPoints[1];
            line(x2, y - padding, x2, y + padding);
            line(x2 + padding, y, x2 - padding, y);
        }

    }
    reset(sections) {
        this.sections = sections;
        // This is called to reset the state of the Scene before it is started
    }
    registerPacket(internalData, country, continent) {

        const out = this.sections[this.playhead.sectionIndex].direction == "out";
        if (this.dashBoard != null && internalData.out == out && this.isInCountries(internalData.local_location.country, this.selectedRegion)) {

            this.dashBoard.addSize(internalData.len);
            // dashBoard.addPackage(1);
            this.countryManager.addPackage(internalData.local_location.country)
        };
    }
    fadeIn(duration) {
        // Called when the previous scene is starting to fade out
        // Called when the previous scene is starting to fade out
        this.playhead.state = "fade in";
        this.playhead.countdown = duration;
    }
    fadeOut(duration) {
        // Called from within the Scene when the "fade out" section starts
        this.playhead.state = "fade out";
    }
    play() {
        // Called when this Scene becomes the current Scene (after teh crossfade)
        this.playhead.sectionIndex = -1;
        this.playhead.state = "playing";
        this.playhead.countdown = 0;
    }


    isInCountries(country, countries) {
        return countries.includes(country);
    }
}




//SHOWS THE MAIN TEXT AND ITS INFO
class DashBoard {

    constructor(_font, colorPallete, positions, location, fontSize, playhead) {
        this.packages = 0;
        this.size = 0;
        this.counter = 0;
        this.tick = 2000;
        this.time = Date.now() + this.tick;
        this.showTick = true;

        this.font = _font;

        this.fontSize = fontSize;

        this.colorPallete = colorPallete;
        this.positions = positions;
        this.focuLocation = location;

        this.playhead = playhead
        this.initTime = 0;
        this.direction = "in";
        this.displayMessage = true;
        this.showBackground = true;
        this.numCountries = 0;
    }

    setNumCountries(num) {
        this.numCountries = num;
    }
    cleanNumCountries() {
        this.numCountries = 0;
    }
    changeDirection(dir) {
        this.direction = dir;
    }
    updateInitTime(time) {
        this.initTime = time;
    }

    showBackground(show) {
        this.showBackground = show;
    }
    showMessage(show) {
        this.showBackground = show;
        this.displayMessage = show;
        this.time = Date.now() + this.tick;
    }

    //update all the data and states
    updateData() {

        // this.updateTickTime();

    }

    //RENDER ALL THE ELEMENTS 
    display() {


        if (this.displayMessage) {
            if (this.showBackground) {
                fill(0, 0, 0, 80);
                rect(0, 0, canvasX, canvasY)
                this.updateTickTime();
            }
            if (this.initTime == 0 && this.playhead.countdown > 0) this.initTime = this.playhead.countdown
            this.counter += 10;
            this.writeTittle();
            this.writePackages();
            this.writeLocation();
        }

        // this.writeSize();


    }



    addPackage(num) {
        this.packages += num;
    }

    addSize(_quantity) {
        this.size += _quantity;

    }

    //update the status of ShowTick 
    //updates if time is greater that this.time
    updateTickTime() {
        if (Date.now() > this.time) {
            this.showBackground = !this.showBackground;
            // this.displayMessage = !this.displayMessage;
        }
    }

    //WRITE THE TITTLE
    //write tittle centered
    writeTittle() {
        // this.playhead
        const c1 = this.fontSize.tittle;
        const c2 = 20;
        const count = this.playhead.countdown > this.initTime ? this.initTime : this.playhead.countdown;

        let inter = map(count, this.initTime, 0, 0, 1);

        let c = lerp(c2, c1, inter);

        noStroke();
        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(c);
        textAlign(CENTER, CENTER);
        textFont(this.font);
        const dirVal = this.direction == "out" ? "TO" : "FROM";
        text(dirVal + " " + this.focuLocation, canvasX / 2, 129 * subsampling);
    }

    //Write the number of packages
    writePackages() {
        // this.playhead
        const c1 = this.fontSize.tittle;
        const c2 = 20;
        const count = this.playhead.countdown > this.initTime ? this.initTime : this.playhead.countdown;

        let inter = map(count, this.initTime, 0, 0, 1);

        let c = lerp(c2, c1, inter);
        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(c);
        textAlign(CENTER);
        textFont(this.font);
        this.counter = this.counter > this.packages ? this.packages : this.counter;
        if (this.counter != 0) text(this.counter, canvasX / 2, this.positions.col.c3 + this.positions.padding.top + 3 * subsampling);
        const message = this.numCountries == 1 ? " COUNTRY" : " COUNTRIES"
        if (this.numCountries != 0) text(this.numCountries + message, canvasX / 2, this.positions.col.c4 + this.positions.padding.top + 3 * subsampling);

    }

    //Write the size
    writeSize() {
        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(LEFT);
        textFont(this.font);
        text(this.size, this.positions.row.r3, this.positions.col.c2 + 24 * subsampling);
    }

    //Write the size
    writeLocation() {
        // this.playhead
        const c1 = this.fontSize.tittle;
        const c2 = 20;
        const count = this.playhead.countdown > this.initTime ? this.initTime : this.playhead.countdown;
        let inter = map(count, this.initTime, 0, 0, 1);

        let c = lerp(c2, c1, inter);
        noStroke();
        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(c);
        textAlign(CENTER);
        textFont(this.font);
        const dirVal = this.direction == "in" ? "TO" : "FROM";
        // text(dirVal, canvasX / 2, this.positions.col.c1 + this.positions.padding.top - 4 * subsampling);
        // circle(canvasX/2 - 31 * subsampling, this.positions.col.c1 + this.positions.padding.top, 7 * subsampling);
        text(dirVal + " " + "STOCKHOLM", canvasX / 2, this.positions.col.c1 + 13 * subsampling);
    }

    //DRAW THE TICK
    //showstick then draw or not
    drawTick() {
        noStroke();
        const { r, g, b } = this.showTick ? this.colorPallete.white : this.colorPallete.black;
        fill(r, g, b, 100);
        rect(32 * subsampling, 121 * subsampling, 4 * subsampling, 24 * subsampling);

    }

    //change the focus location
    changeLocation(newLoc) {
        this.focuLocation = newLoc;
    }
}


//COUNTRY MANAGER


class CountryManager {


    constructor(_countries, _font, fontSize, positions, colorPallete, dashBoard, direction) {
        //list of countries to show
        this.countries = _countries;
        this.dashBoard = dashBoard;
        this.direction = "in"
        this.fontURL = _font;
        this.font = _font;
        this.fontSize = fontSize;
        this.colPosPositions = positions;
        this.colorPallete = colorPallete;
        //initial positons and ending positions
        this.offsetX = 2 * subsampling;
        this.countriesCounter = []
        this.endPoint =
        {
            x: this.colPosPositions.row.r3,
            y: this.colPosPositions.col.c2 + 10 * subsampling
        }
        this.positions = {
            P0: {
                used: false,
                points: [
                    {
                        x: 54 * subsampling - this.offsetX,
                        y: 0
                    },
                    {
                        x: 54 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }

                ],
                init: {
                    x: 54 * subsampling,
                    y: 0
                },
                end: {
                    x: 54 * subsampling,
                    y: this.colPosPositions.col.c2 + 36 * subsampling
                }
            },
            P1: {
                used: false,
                points: [
                    {
                        x: 80 * subsampling - this.offsetX,
                        y: canvasY
                    },
                    {
                        x: 80 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 80 * subsampling,
                    y: canvasY
                },
                end: {
                    x: 80 * subsampling,
                    y: this.colPosPositions.col.c2 + 36 * subsampling
                }
            },
            P2: {
                used: false,
                points: [
                    {
                        x: 140 * subsampling - this.offsetX,
                        y: canvasY
                    },
                    {
                        x: 140 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 140 * subsampling,
                    y: canvasY
                },
                end: {
                    x: 140 * subsampling,
                    y: this.colPosPositions.col.c2 + 36 * subsampling
                }
            },
            P3: {
                used: false,
                points: [
                    {
                        x: 160 * subsampling - this.offsetX,
                        y: canvasY
                    },
                    {
                        x: 160 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 160 * subsampling,
                    y: canvasY
                },
                end: {
                    x: 160 * subsampling,
                    y: this.colPosPositions.col.c2 + 36 * subsampling
                }
            },
            P4: {
                used: false,
                points: [
                    {
                        x: 54 * subsampling - this.offsetX,
                        y: 0
                    },
                    {
                        x: 54 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 54 * subsampling,
                    y: 0
                },
                end: {
                    x: 54 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P5: {
                used: false,
                points: [
                    {
                        x: 80 * subsampling - this.offsetX,
                        y: 0
                    },
                    {
                        x: 80 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 80 * subsampling,
                    y: 0
                },
                end: {
                    x: 80 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P6: {
                used: false,
                points: [
                    {
                        x: 140 * subsampling - this.offsetX,
                        y: 0
                    },
                    {
                        x: 140 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 140 * subsampling,
                    y: 0
                },
                end: {
                    x: 140 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P7: {
                used: false,
                points: [
                    {
                        x: 160 * subsampling - this.offsetX,
                        y: 0
                    },
                    {
                        x: 160 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                ],
                init: {
                    x: 160 * subsampling,
                    y: 0
                },
                end: {
                    x: 160 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },///ADD NO THE LATERAL ONES
            P8: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r3 + (15 * subsampling) - this.offsetX,
                        y: 0
                    },
                    {
                        x: this.colPosPositions.row.r3 - 23 * subsampling,
                        y: this.colPosPositions.col.c1 + 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    }
                ],
                init: {
                    x: this.colPosPositions.row.r3 + 15 * subsampling,
                    y: 0
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P9: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r1,
                        y: 0
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23 * subsampling,
                        y: this.colPosPositions.col.c1 + 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    }
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: 0
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P10: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r1,
                        y: canvasY,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23 * subsampling,
                        y: this.colPosPositions.col.c3 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    }
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: canvasY
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P11: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r1,
                        y: canvasY
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23 * subsampling,
                        y: this.colPosPositions.col.c4 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    }
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: canvasY
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },

            P12: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r3 + (15 * subsampling) - this.offsetX,
                        y: canvasY,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 30 * subsampling,
                        y: this.colPosPositions.col.c3 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 12 * subsampling
                    }
                ],
                init: {
                    x: this.colPosPositions.row.r3 + (15 * subsampling) - this.offsetX,
                    y: canvasY,
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
            P13: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r3,
                        y: canvasY,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 28 * subsampling,
                        y: this.colPosPositions.col.c4 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 15 * subsampling
                    }
                ],
                init: {
                    x: this.colPosPositions.row.r3 + (15 * subsampling) - this.offsetX,
                    y: canvasY,
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10 * subsampling,
                    y: this.colPosPositions.col.c2
                }
            },
        };
        //countries to render
        this.toRender = [];
        this.packages = [];
        this.maxCountries = 14//14;//26;
        this.activeSpot = 14;
        this.maxPackages = 200;
        this.currentPos = 0;

        for (let i = 0; i < this.maxCountries && i < this.countries.length; i++) {

            this.addCountry(this.countries[this.currentPos]);
            this.currentPos++;
        }


        this.showPath = false;

    }

    cleanCountriesCounter() {
        this.countriesCounter.splice(0, this.countriesCounter.length)
    }

    //UPDATE ALL THE DATA
    updateData() {

    }

    changeDirection(dir) {
        this.direction = dir;
    }

    addPackage(name) {

        if (this.getCountry(name) != undefined) {
            const country = this.getCountry(name)
            if (!this.countriesCounter.includes(name)) {

                this.countriesCounter.push(name)
                this.dashBoard.setNumCountries(this.countriesCounter.length)

            }

            if (country.country != undefined) country.country.addPackage(1);

            if (country != undefined && country.country.getPackagesNumb() % country.country.getBigPacket() == 0) {
                const { x, y } = country.pos.init;
                const countryPos = country.country.getPosition()
                const closeToTarget = false;//countryPos.y - country.pos.end.y < 8;
                // if (!closeToTarget) {


                const newPath = new Path();
                const randomX = random(canvasX)

                const goalPoint = closeToTarget ? { x: 500, y: 129 } : { x: randomX - 10, y: country.pos.end.y };

                newPath.addPoint(randomX, y - 10);
                newPath.addPoint(goalPoint.x, goalPoint.y);

                const goalPos = createVector(goalPoint.x, goalPoint.y)

                const pInit = closeToTarget ? countryPos.x : randomX;

                const pack = new Package(pInit, countryPos.y, this.colorPallete, country.country, newPath, name, goalPos, closeToTarget)
                this.packages.push(pack)
                // }
            }

        }
    }

    //RENDER ALL THE ELEMENTS
    display() {
        this.drawMesh();


        //RENDER PACKAGES
        for (let j = 0; j < this.packages.length; j++) {
            this.packages[j].follow();
            this.packages[j].update();
            this.packages[j].display();
        }
        if (this.packages.length > this.maxPackages) this.cleanPackages();
        //RENDER COUNTRY
        const toRemove = [];
        for (let i = 0; i < this.toRender.length; i++) {
            this.renderObject(this.toRender[i]);
            if (this.toRender[i].country.state == "REMOVE") toRemove.push(this.toRender[i].name.name);
        }
        this.removeItems(toRemove);

    }
    //draw a line connecting all country points
    drawMesh() {
        // stroke('rgba(255,255,255,0.5)');
        noStroke();
        let { r, g, b } = this.colorPallete.red;
        let { r1, g1, b1 } = this.colorPallete.brightGreen;
        const c1 = color(this.colorPallete.red.r, this.colorPallete.red.g, this.colorPallete.red.b, 90);
        const c2 = color(this.colorPallete.brightGreen.r, this.colorPallete.brightGreen.g, this.colorPallete.brightGreen.b, .5);

        strokeWeight(2 * subsampling);
        for (let i = 0; i < this.toRender.length; i++) {
            const obj1 = this.toRender[i].country.getPosition();
            const initPoint = this.toRender[i].country.refPoint.init;
            // const obj2 = this.toRender[i].country.goalPos;
            // line(obj1.x, 0, obj1.x, canvasY);

            let inter = map(obj1.y, 129 * subsampling, initPoint.y, 0, 1);
            let c = lerpColor(c1, c2, inter);
            fill(c);
            rect(0, 129 * subsampling, canvasX, obj1.y - (129 * subsampling))
            // line(0, obj1.y, canvasX, obj1.y);
            // line(obj1.x, obj1.y, obj2.x, obj2.y);

            // for (let j = i; j < this.toRender.length; j++) {
            //     const obj2 = this.toRender[j].country.getPosition();
            //     line(obj1.x, obj1.y, obj2.x, obj2.y);
            // }
        }


    }

    //render objecte
    renderObject(object) {

        // let { r, g, b } = this.colorPallete.brightGreen;
        // fill(r, g, b, object.country.textAlpha);
        // textFont('sans');
        // textSize(this.fontSize.countries);
        // textAlign(RIGHT, TOP);
        // textFont(this.font);
        // text(object.name.iso, object.pos.init.x, object.pos.init.y);



        if (this.showPath) object.path.display();
        object.country.follow(object.path);
        object.country.update();
        object.country.display();
    }


    //ADD a new country to show
    addCountry(coutryName) {

        const freeKey = this.getFreePosition()
        if (freeKey == null) return;
        const position = this.positions[freeKey];


        //ADDS A PATH
        const path = new Path();
        //DRAW PATH WITH MULTIPLE POINTS
        const points = this.positions[freeKey].points;
        for (let i = 0; i < points.length; i++) {
            path.addPoint(points[i].x, points[i].y);
        }

        // path.addPoint(this.positions["P" + place].init.x - 1, this.positions["P" + place].init.y);
        // path.addPoint(this.positions["P" + place].end.x, this.positions["P" + place].end.y);
        //ADDS A COUNTRY ELEM
        const country = new Country(points[0].x, points[0].y, this.colorPallete, points[points.length - 1], position, coutryName, this.font)
        //ADD TEXT
        const name = coutryName;
        const IsoName = getCountryName(name);

        const newCountry = {
            pos: {
                init: this.positions[freeKey].init,
                end: this.positions[freeKey].end
            },
            path: path,
            country: country,
            name: {
                name: name,
                iso: IsoName,
            },
            point: position
        }
        this.toRender.push(newCountry);
    }

    cleanPackages() {
        this.packages = this.packages.filter(pack => pack.state == "MOVE");
    }

    //Remove an all unused countries items
    removeItems(toRemove) {
        let count = 0;
        for (let i = 0; i < toRemove.length; i++) {
            this.removecountry(toRemove[i]);
            count += 1;

        }

        for (let j = 0; j < count; j++) {

            this.currentPos += 1;
            const pos = this.currentPos % (this.countries.length)
            this.addCountry(this.countries[pos])
        }
    }

    // remove X country from display
    removecountry(name) {
        const index = this.toRender.findIndex(country => country.name.name == name);
        this.toRender[index].country.refPoint.used = false;
        for (let i = 0; i < this.packages.length; i++) {
            if (this.packages[i].countryName == this.toRender[index].country.countryName) {
                this.packages[i].state = "VANISH";
            }
        }
        //ADD PACKAGES TO DASHBOARD

        this.dashBoard.addPackage(this.toRender[index].country.packages);
        // this.packages = this.packages.filter(pack => pack.countryName == this.toRender[index].country.countryName);
        this.toRender.splice(index, 1);
        //REMOVE THE ITEMS
    }

    getCountry(name) {
        return this.toRender.find(country => country.name.name == name);
    }

    //get a free position
    getFreePosition() {
        for (const key in this.positions) {
            if (this.positions[key].used == false) {
                this.positions[key].used = true;
                return key;
            }
        }
        return null;
    }

    //change all the countries list
    changeCountries(_countries) {

        //change current countries state
        for (let i = 0; i < this.toRender.length; i++) {
            this.toRender[i].country.state = "REMOVE";
            this.toRender[i].country.textAlpha = 0;
            const object = this.toRender[i];

            let { r, g, b } = this.colorPallete.black;
            fill(r, g, b, 100);
            textFont('sans');
            textSize(this.fontSize.countries);
            textAlign(RIGHT, TOP);
            textFont(this.font);
            text(object.name.iso, object.pos.init.x, object.pos.init.y);
            // if (this.toRender[i].country.state == "REMOVE") toRemove.push(this.toRender[i].name.name);
        }
        clear();

        //add new countries
        this.countries = _countries;
        this.currentPos = 0;
        for (let i = 0; i < this.maxCountries && i < this.countries.length; i++) {

            if (this.countries[this.currentPos] != undefined) {
                this.addCountry(this.countries[this.currentPos]);
                this.currentPos++;
            }
        }

    }
}


class Path {

    constructor() {
        this.radius = 20 * subsampling;
        this.points = [];
    }

    /////////////////////////////
    addPoint(x, y) {
        let point = createVector(x, y);
        this.points.push(point);
    }

    /////////////////////////////  
    display() {
        stroke(100);

        // stroke (0, 100); strokeWeight(20); 
        noFill();
        beginShape();
        for (let i = 0; i < this.points.length; i++) {
            vertex(this.points[i].x, this.points[i].y);
        }
        endShape();
        // stroke(0); strokeWeight(1);
    }
}

class Country {

    constructor(x, y, colorPallete, goalPos, refPoint, name, font) {
        this.colorPallete = colorPallete;
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(2, 0);
        this.position = createVector(x, y);
        this.initPos = createVector(x, y);
        this.countryName = name;

        this.r = 1.0; // Half the width of veihcle's back side
        this.maxspeed = random(0.5, 2) * subsampling//random(0.0005, 0.5)//random(0.00001, 0.004); //
        this.maxforce = 0.1 * subsampling;

        this.goalPos = createVector(goalPos.x, goalPos.y);

        this.size = 5 * subsampling;
        this.state = "MOVE";
        this.packages = 0;
        this.bigPacket = 1;
        this.refPoint = refPoint;
        this.textAlpha = 100;
        this.beat = random(100, 500);
        this.beatType = Math.random() <= 0.5;
        this.font = font;

    }

    addTextAlpha(num) {
        this.textAlpha = max(100, this.textAlpha + num);
    }

    addPackage(num) {
        this.packages += num;
        this.addTextAlpha(num);
    }

    getPackagesNumb() {
        return this.packages;
    }

    getBigPacket() {
        return this.bigPacket;
    }

    getPosition() {
        return this.position;
    }


    addVelocity() {
        this.maxspeed = this.maxspeed - 0.5 * subsampling < 0.4 * subsampling ? 0.4 * subsampling : this.maxspeed - 0.5 * subsampling;
        this.size = min(40 * subsampling, this.size + 0.2 * subsampling);
    }
    /////////////////////////////
    follow(p) {

        // Predict the vehicle future location
        let predict = this.velocity.copy();
        predict.normalize();
        // 25 pixels ahead in current velocity direction
        predict.mult(25);
        // Get the predicted point
        let predictLoc = p5.Vector.add(this.position, predict);

        // Find the nomal point along the path
        let target = 0;
        let worldRecord = 1000000;

        for (let i = 0; i < p.points.length - 1; i++) {
            let a = p.points[i].copy(); // i = 3
            let b = p.points[i + 1].copy(); // i+1= 4 (last point)
            let normalPoint = this.getNormalPoint(predictLoc, a, b);

            // Check if the normal point is outside the line segment
            if (normalPoint.x < a.x || normalPoint.x > b.x) {
                normalPoint = b.copy();
            }

            // Length of normal from precictLoc to normalPoint
            let distance = p5.Vector.dist(predictLoc, normalPoint);

            // Check if this normalPoint is nearest to the predictLoc
            if (distance < worldRecord) {
                worldRecord = distance;
                // Move a little further along the path and set a target
                // let dir = p5.Vector.sub(a, b);
                // dir.normalize();
                // dir.mult(10);
                // let target = p5.Vector.add(normalPoint, dir);

                // or let the target be the normal point
                target = normalPoint.copy();
            }
        }

        // seek the target...
        this.seek(target);

        // ... or check if we are off the path:
        // if (distance > p.radius) {
        //    this.seek(target);
        // }

        // Off the canvas: new radnom start from the left
        if (this.position.x > width) {
            this.position.x = 0;
            this.position.y = random(height);
        }
    }


    ////////////////////////////////////////////////////
    // Get the normal point from p to line segment ab
    getNormalPoint(p, a, b) {

        let ap = p5.Vector.sub(p, a);
        let ab = p5.Vector.sub(b, a);
        ab.normalize();

        // Instead of d = ap.mag() * cos(theta)
        // See file explanation.js or page 290
        let d = ap.dot(ab);

        ab.mult(d);

        let normalPoint = p5.Vector.add(a, ab);
        return normalPoint;
    }


    /////////////////////////////////////////////////////
    seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxspeed);
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxforce);
        this.applyForce(steer);
    }


    ////////////////////////////////
    update() {

        switch (this.state) {
            case "MOVE":
                this.velocity.add(this.acceleration);
                this.velocity.limit(this.maxspeed);
                this.position.add(this.velocity);
                this.acceleration.mult(0);
                this.textAlpha = this.textAlpha - 20 < 0 ? 0 : this.textAlpha - 1;
                if (this.position.dist(this.goalPos) < 5) {
                    this.state = "REMOVE";
                    //REMOVE POINT 
                }

                break;

            case "STOP":

                break;

            default:
                break;
        }


    }


    ////////////////////////////////
    applyForce(force) {
        this.acceleration.add(force);


    }
    ///////////////////////////////
    display() {



        //DRAW COUNTRY
        if (this.state == "MOVE") {

            noStroke()
            if (this.packages != 0) {
                push();
                translate(this.position.x, this.position.y);
                // const size = this.beatType ? sin(Date.now() / this.beat) * this.size : cos(Date.now() / this.beat) * this.size
                // const limitSize = 8 * subsampling;

                // circle(0, 0, size < limitSize ? limitSize : size);
                // rotate(this.theta);
                // beginShape();
                // vertex(0, -this.r * 2); // Arrow pointing upp
                // vertex(-this.r, this.r * 2); // Lower left corner
                // vertex(this.r, this.r * 2); // Lower right corner
                // endShape(CLOSE);
                noStroke();
                // const { r, g, b } = this.colorPallete.black;
                const c1 = color(this.colorPallete.red.r, this.colorPallete.red.g, this.colorPallete.red.b, 100);
                const c2 = color(this.colorPallete.black.r, this.colorPallete.black.g, this.colorPallete.black.b, 100);

                let inter = map(this.position.y, 129 * subsampling, this.initPos.y, 0, 1);
                let c = lerpColor(c1, c2, inter);
                fill(c);
                textFont('sans');
                textSize(12 * subsampling);
                textAlign(CENTER, CENTER);
                textFont(this.font);
                text(this.countryName.toUpperCase(), 0, -5 * subsampling);

                pop();
            }

        }

    }
}

class Package {

    constructor(x, y, colorPallete, country, path, name, goalPos, closeToTarget) {
        this.colorPallete = colorPallete;
        this.acceleration = createVector(0, 0);

        this.velocity = closeToTarget ? createVector(3, 0) : createVector(0, 0);
        this.initPos = createVector(x, y);
        this.position = createVector(x, y);
        this.countryName = name;

        this.r = closeToTarget ? random(2, 5) * subsampling : random(2, 10) * subsampling; // Half the width of veihcle's back side
        this.maxspeed = closeToTarget ? random(0.5, 5) * subsampling : random(1, 5) * subsampling; //
        this.maxforce = 0.1 * subsampling;
        this.country = country;
        this.goalPos = goalPos;

        this.size = random(20, 30) * subsampling;
        this.state = "APPEAR";
        this.path = path;
        this.alpha = 0;
        this.beat = 500;//random(200, 800);
    }



    /////////////////////////////
    follow() {
        const p = this.path;
        // Predict the vehicle future location
        let predict = this.velocity.copy();
        predict.normalize();
        // 25 pixels ahead in current velocity direction
        predict.mult(25);
        // Get the predicted point
        let predictLoc = p5.Vector.add(this.position, predict);

        // Find the nomal point along the path
        let target = 0;
        let worldRecord = 1000000;

        for (let i = 0; i < p.points.length - 1; i++) {
            let a = p.points[i].copy(); // i = 3
            let b = p.points[i + 1].copy(); // i+1= 4 (last point)
            let normalPoint = this.getNormalPoint(predictLoc, a, b);

            // Check if the normal point is outside the line segment
            if (normalPoint.x < a.x || normalPoint.x > b.x) {
                normalPoint = b.copy();
            }

            // Length of normal from precictLoc to normalPoint
            let distance = p5.Vector.dist(predictLoc, normalPoint);

            // Check if this normalPoint is nearest to the predictLoc
            if (distance < worldRecord) {
                worldRecord = distance;
                // Move a little further along the path and set a target
                // let dir = p5.Vector.sub(a, b);
                // dir.normalize();
                // dir.mult(10);
                // let target = p5.Vector.add(normalPoint, dir);

                // or let the target be the normal point
                target = normalPoint.copy();
            }
        }

        // seek the target...
        this.seek(target);

        // ... or check if we are off the path:
        // if (distance > p.radius) {
        //    this.seek(target);
        // }


    }


    ////////////////////////////////////////////////////
    // Get the normal point from p to line segment ab
    getNormalPoint(p, a, b) {

        let ap = p5.Vector.sub(p, a);
        let ab = p5.Vector.sub(b, a);
        ab.normalize();

        // Instead of d = ap.mag() * cos(theta)
        // See file explanation.js or page 290
        let d = ap.dot(ab);

        ab.mult(d);

        let normalPoint = p5.Vector.add(a, ab);
        return normalPoint;
    }


    /////////////////////////////////////////////////////
    seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxspeed);
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxforce);
        this.applyForce(steer);
    }


    ////////////////////////////////
    update() {


        switch (this.state) {
            case "APPEAR":
                this.velocity.add(this.acceleration);
                this.velocity.limit(this.maxspeed);
                this.position.add(this.velocity);
                this.acceleration.mult(0);
                // this.goalPos = this.country.getPosition();
                this.alpha += 10;
                if (this.alpha > 80) {
                    this.state = "MOVE";
                    this.alpha = 80;
                }


                break;
            case "MOVE":

                this.velocity.add(this.acceleration);
                this.velocity.limit(this.maxspeed);
                this.position.add(this.velocity);
                this.acceleration.mult(0);
                // this.goalPos = this.country.getPosition();

                if (this.position.dist(this.goalPos) < 10 * subsampling) {
                    this.state = "VANISH";
                    this.country.addVelocity();
                } else if (this.position.dist(this.goalPos) < 10 * subsampling) {
                    this.state = "REMOVE";
                    this.country.addVelocity();
                }

                break;
            case "VANISH":

                this.velocity.add(this.acceleration);
                this.velocity.limit(this.maxspeed);
                this.position.add(this.velocity);
                this.acceleration.mult(0);
                this.goalPos = this.country.getPosition();
                this.alpha -= 5;

                if (this.alpha < 0) {
                    this.state = "REMOVE";
                }

                break;

            case "STOP":

                break;

            default:
                break;
        }


    }


    ////////////////////////////////
    applyForce(force) {
        this.acceleration.add(force);


    }
    ///////////////////////////////
    display() {



        //DRAW COUNTRY
        if (this.state == "MOVE" || this.state == "VANISH") {

            this.theta = this.velocity.heading() + PI / 2;
            // let { r, g, b } = this.colorPallete.white;
            const c1 = color(this.colorPallete.red.r, this.colorPallete.red.g, this.colorPallete.red.b, 100);
            const c2 = color(this.colorPallete.brightGreen.r, this.colorPallete.brightGreen.g, this.colorPallete.brightGreen.b, 50);
            let inter = map(this.position.y, 129 * subsampling, this.initPos.y, 0, 1);
            let c = lerpColor(c1, c2, inter);
            fill(c);
            // stroke(this.colorPallete.white.r, this.colorPallete.white.g, this.colorPallete.white.b, 90);
            // strokeWeight(0.5);
            // fill(r, g, b, 100);
            // noStroke()
            push();
            translate(this.position.x, this.position.y);
            rotate(this.theta);
            let size = this.beatType ? sin(Date.now() / this.beat) * this.r : cos(Date.now() / this.beat) * this.r
            const limitSize = 2 * subsampling;
            size = abs(size)
            size = size < limitSize ? limitSize : size;
            rect(0, 0, this.r / 2, this.r * 2)
            // circle(0, 0, size);
            // size = size < limitSize ? limitSize : size;
            // beginShape();
            // vertex(0, -size); // Arrow pointing upp
            // vertex(-size, size); // Lower left corner
            // vertex(size, size); // Lower right corner
            // endShape(CLOSE);
            pop();
        }

    }
}

