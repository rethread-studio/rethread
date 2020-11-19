

class WorldScene extends Scene {
    constructor() {
        super();
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
            "Viet Nam"
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
                r: 201,
                g: 44,
                b: 43
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
                r: 100,
                g: 100,
                b: 100
            }
        }



        // Performance - Disables FES
        // p5.disableFriendlyErrors = true;

        this.continentActivity = {
            africa: 0,
            eurasia: 0,
            oceania: 0,
            americas: 0,
        };

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
            tittle: 28 * subsampling,
            number: 10 * subsampling,
            countries: 12 * subsampling,
        }


        this.dashBoard;
        this.countryManager;

        this.focusLocation = {
            europe: "EU",
            america: "AME",
            asia: "AS",
            africa: "AF",
            oceanica: "OC"
        }

        this.test_country = [
            "Sweden",
            "Norway",
            "Netherlands",
            "United States",

        ]

        this.selectedRegion = this.eu_countries;
        this.focusRegion = this.focusLocation.europe;
        this.liveSign;

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
        this.dashBoard = new DashBoard(antonFont, this.colorPallete, this.positions, this.focusRegion, this.fontSize)
        //CRATE COUNTRY MANAGE
        this.countryManager = new CountryManager(this.selectedRegion, antonFont, this.fontSize, this.positions, this.colorPallete, this.dashBoard);
        this.liveSign = new LiveSign("", antonFont, false)
    }
    draw(dt) {
        // Update state and draw. dt is the time since last frame in seconds.
        // Set canvas background
        background("rgba(0,0,0,1)");

        //UPDATE COUNTRY MANAGER
        this.countryManager.updateData();
        this.countryManager.display();
        //UPDATE DASHBOARD
        this.dashBoard.updateData();
        this.dashBoard.display();

        this.liveSign.updateTickTime();
        this.liveSign.draw();
    }
    reset(sections) {
        // This is called to reset the state of the Scene before it is started
    }
    registerPacket(internalData, country, continent) {
        if (this.dashBoard != null && internalData.out == true && this.isInCountries(internalData.local_location.country, this.selectedRegion)) {

            this.dashBoard.addSize(internalData.len);
            // dashBoard.addPackage(1);
            this.countryManager.addPackage(internalData.local_location.country)
        };
    }
    fadeIn(duration) {
        // Called when the previous scene is starting to fade out
    }
    fadeOut(duration) {
        // Called from within the Scene when the "fade out" section starts
    }
    play() {
        // Called when this Scene becomes the current Scene (after teh crossfade)
    }


    isInCountries(country, countries) {
        return countries.includes(country);
    }
}




//SHOWS THE MAIN TEXT AND ITS INFO
class DashBoard {

    constructor(_font, colorPallete, positions, location, fontSize) {
        this.packages = 0;
        this.size = 0;

        this.tick = 400;
        this.time = Date.now() + this.tick;
        this.showTick = true;

        this.font = _font;

        this.fontSize = fontSize;

        this.colorPallete = colorPallete;
        this.positions = positions;
        this.focuLocation = location;


    }


    //update all the data and states
    updateData() {

        // this.updateTickTime();
    }

    //RENDER ALL THE ELEMENTS 
    display() {
        this.writeTittle();
        this.writePackages();
        // this.writeSize();
        // if (this.showTick) this.writeLocation();
        // this.drawTick();
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
            this.showTick = !this.showTick;
            this.time = Date.now() + this.tick;
        }
    }

    //WRITE THE TITTLE
    //write tittle centered
    writeTittle() {
        const { r, g, b } = this.colorPallete.white;
        fill(r, g, b);
        textFont('sans');
        textSize(this.fontSize.tittle);
        textAlign(CENTER, CENTER);
        textFont(this.font);
        text("STOCKHOLM", canvasX / 2, 129 * subsampling);
    }

    //Write the number of packages
    writePackages() {
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(LEFT);
        textFont(this.font);
        text(this.packages, this.positions.row.r3, this.positions.col.c2 + this.positions.padding.top);
    }

    //Write the size
    writeSize() {
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(LEFT);
        textFont(this.font);
        text(this.size, this.positions.row.r3, this.positions.col.c2 + 24 * subsampling);
    }

    //Write the size
    writeLocation() {
        const { r, g, b } = this.colorPallete.red;
        fill(r, g, b, 100);
        textFont('sans');
        textSize(this.fontSize.number);
        textAlign(RIGHT);
        textFont(this.font);
        text("LIVE", this.positions.row.r1 - 10 * subsampling, this.positions.col.c2 + this.positions.padding.top);
        circle(this.positions.row.r1 - 31 * subsampling, this.positions.col.c2 + this.positions.padding.top, 7 * subsampling);
        text(this.focuLocation, this.positions.row.r1 - 10 * subsampling, this.positions.col.c2 + this.positions.padding.top * 2 + 4 * subsampling);
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


    constructor(_countries, _font, fontSize, positions, colorPallete, dashBoard) {
        //list of countries to show
        this.countries = _countries;
        this.dashBoard = dashBoard;

        this.fontURL = _font;
        this.font = _font;
        this.fontSize = fontSize;
        this.colPosPositions = positions;
        this.colorPallete = colorPallete;
        //initial positons and ending positions
        this.offsetX = 2 * subsampling;
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
                        y: 314 * subsampling
                    },
                    {
                        x: 54 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    }
                    ,
                    this.endPoint
                ],
                init: {
                    x: 54 * subsampling,
                    y: 314 * subsampling
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
                        y: this.colPosPositions.col.c5
                    },
                    {
                        x: 80 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 80 * subsampling,
                    y: this.colPosPositions.col.c5
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
                        y: this.colPosPositions.col.c5
                    },
                    {
                        x: 140 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 140 * subsampling,
                    y: this.colPosPositions.col.c5
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
                        y: this.colPosPositions.col.c5
                    },
                    {
                        x: 160 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 160 * subsampling,
                    y: this.colPosPositions.col.c5
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
                        y: this.colPosPositions.col.c1 - 15 * subsampling
                    },
                    {
                        x: 54 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 54 * subsampling,
                    y: this.colPosPositions.col.c1 - 15 * subsampling
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
                        y: this.colPosPositions.col.c1 - 15 * subsampling
                    },
                    {
                        x: 80 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 80 * subsampling,
                    y: this.colPosPositions.col.c1 - 15 * subsampling
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
                        y: this.colPosPositions.col.c1 - 15 * subsampling
                    },
                    {
                        x: 140 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 140 * subsampling,
                    y: this.colPosPositions.col.c1 - 15 * subsampling
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
                        y: this.colPosPositions.col.c1 - 15 * subsampling
                    },
                    {
                        x: 160 * subsampling,
                        y: this.colPosPositions.col.c2 + 10 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: 160 * subsampling,
                    y: this.colPosPositions.col.c1 - 15 * subsampling
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
                        y: this.colPosPositions.col.c1 + 10 * subsampling,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 23 * subsampling,
                        y: this.colPosPositions.col.c1 + 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r3 + 15 * subsampling,
                    y: this.colPosPositions.col.c1 + 7 * subsampling
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
                        y: this.colPosPositions.col.c1 + 10 * subsampling,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23 * subsampling,
                        y: this.colPosPositions.col.c1 + 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: this.colPosPositions.col.c1 + 7 * subsampling
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
                        y: this.colPosPositions.col.c3 + 10 * subsampling,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23 * subsampling,
                        y: this.colPosPositions.col.c3 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: this.colPosPositions.col.c3 + 10 * subsampling,
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
                        y: this.colPosPositions.col.c4 + 10 * subsampling,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23 * subsampling,
                        y: this.colPosPositions.col.c4 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 8 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: this.colPosPositions.col.c4 + 10 * subsampling,
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
                        y: this.colPosPositions.col.c3 + 10 * subsampling,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 30 * subsampling,
                        y: this.colPosPositions.col.c3 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 12 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r3 + (15 * subsampling) - this.offsetX,
                    y: this.colPosPositions.col.c3 + 10 * subsampling,
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
                        y: this.colPosPositions.col.c4 + 10 * subsampling,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 28 * subsampling,
                        y: this.colPosPositions.col.c4 - 15 * subsampling
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20 * subsampling,
                        y: this.colPosPositions.col.c2 + 15 * subsampling
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r3 + (15 * subsampling) - this.offsetX,
                    y: this.colPosPositions.col.c4 + 10 * subsampling,
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

    //UPDATE ALL THE DATA
    updateData() {

    }

    addPackage(name) {

        if (this.getCountry(name) != undefined) {
            const country = this.getCountry(name)

            if (country.country != undefined) country.country.addPackage(1);

            if (country != undefined && country.country.getPackagesNumb() % country.country.getBigPacket() == 0) {
                const { x, y } = country.pos.init;
                const pack = new Package(x, y, this.colorPallete, country.country, country.path, name)
                this.packages.push(pack)
            }

        }
    }

    //RENDER ALL THE ELEMENTS
    display() {
        //RENDER COUNTRY
        const toRemove = [];
        for (let i = 0; i < this.toRender.length; i++) {
            this.renderObject(this.toRender[i]);
            if (this.toRender[i].country.state == "REMOVE") toRemove.push(this.toRender[i].name.name);
        }
        this.removeItems(toRemove);

        //RENDER PACKAGES
        for (let j = 0; j < this.packages.length; j++) {
            this.packages[j].follow();
            this.packages[j].update();
            this.packages[j].display();
        }
        if (this.packages.length > this.maxPackages) this.cleanPackages();

    }




    //render objecte
    renderObject(object) {

        let { r, g, b } = this.colorPallete.green;
        fill(r, g, b, object.country.textAlpha);
        textFont('sans');
        textSize(this.fontSize.countries);
        textAlign(RIGHT, TOP);
        textFont(this.font);
        text(object.name.iso, object.pos.init.x, object.pos.init.y);


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
        const country = new Country(points[0].x, points[0].y, this.colorPallete, points[points.length - 1], position, coutryName)
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
        // console.log(this.toRender[index].country.packages);
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
    changeCountries() {

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

    constructor(x, y, colorPallete, goalPos, refPoint, name) {
        this.colorPallete = colorPallete;
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(2, 0);
        this.position = createVector(x, y);
        this.countryName = name;

        this.r = 1.0; // Half the width of veihcle's back side
        this.maxspeed = random(0.5, 1) * subsampling//random(0.0005, 0.5)//random(0.00001, 0.004); //
        this.maxforce = 0.1 * subsampling;

        this.goalPos = createVector(goalPos.x, goalPos.y);;

        this.size = 5 * subsampling;
        this.state = "MOVE";
        this.packages = 0;
        this.bigPacket = 1;
        this.refPoint = refPoint;
        this.textAlpha = 100;
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
                // console.log("stop")
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
            this.theta = this.velocity.heading() + PI / 2;
            let { r, g, b } = this.colorPallete.red;
            fill(r, g, b);
            noStroke()
            push();
            translate(this.position.x, this.position.y);
            circle(0, 0, this.size);
            // rotate(this.theta);
            // beginShape();
            // vertex(0, -this.r * 2); // Arrow pointing upp
            // vertex(-this.r, this.r * 2); // Lower left corner
            // vertex(this.r, this.r * 2); // Lower right corner
            // endShape(CLOSE);
            pop();
        }

    }
}

class Package {

    constructor(x, y, colorPallete, country, path, name) {
        this.colorPallete = colorPallete;
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(2, 0);
        this.position = createVector(x, y);
        this.countryName = name;

        this.r = random(1, 2.5) * subsampling; // Half the width of veihcle's back side
        this.maxspeed = random(2, 3) * subsampling; //
        this.maxforce = 0.1 * subsampling;
        this.country = country;
        this.goalPos = country.getPosition();

        this.size = random(1, 4) * subsampling;
        this.state = "APPEAR";
        this.path = path;
        this.alpha = 0;
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
                this.goalPos = this.country.getPosition();
                this.alpha += 10;
                if (this.alpha > 100) {
                    this.state = "MOVE";
                    this.alpha = 100;
                }


                break;
            case "MOVE":

                this.velocity.add(this.acceleration);
                this.velocity.limit(this.maxspeed);
                this.position.add(this.velocity);
                this.acceleration.mult(0);
                this.goalPos = this.country.getPosition();
                if (this.position.dist(this.goalPos) < 25 * subsampling) {
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
                // console.log("stop")
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
            let { r, g, b } = this.colorPallete.lightBlue;
            fill(r, g, b, this.alpha);
            noStroke()
            push();
            translate(this.position.x, this.position.y);
            // circle(0, 0, this.size);
            rotate(this.theta);
            beginShape();
            vertex(0, -this.r); // Arrow pointing upp
            vertex(-this.r, this.r); // Lower left corner
            vertex(this.r, this.r); // Lower right corner
            endShape(CLOSE);
            pop();
        }

    }
}

