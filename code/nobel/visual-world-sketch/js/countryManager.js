

class CountryManager {


    constructor(_countries, _font, fontSize, positions, colorPallete, dashBoard) {
        //list of countries to show
        this.countries = _countries;
        this.dashBoard = dashBoard;

        this.fontURL = _font;
        this.font = loadFont(_font);
        this.fontSize = fontSize;
        this.colPosPositions = positions;
        this.colorPallete = colorPallete;
        //initial positons and ending positions
        this.offsetX = 2;
        this.endPoint =
        {
            x: this.colPosPositions.row.r3,
            y: this.colPosPositions.col.c2 + 10
        }
        this.positions = {
            P0: {
                used: false,
                points: [
                    {
                        x: 54 - this.offsetX,
                        y: 314
                    },
                    {
                        x: 54,
                        y: this.colPosPositions.col.c2 + 10
                    }
                    ,
                    this.endPoint
                ],
                init: {
                    x: 54,
                    y: 314
                },
                end: {
                    x: 54,
                    y: this.colPosPositions.col.c2 + 36
                }
            },
            P1: {
                used: false,
                points: [
                    {
                        x: 80 - this.offsetX,
                        y: this.colPosPositions.col.c5
                    },
                    {
                        x: 80,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 80,
                    y: this.colPosPositions.col.c5
                },
                end: {
                    x: 80,
                    y: this.colPosPositions.col.c2 + 36
                }
            },
            P2: {
                used: false,
                points: [
                    {
                        x: 140 - this.offsetX,
                        y: this.colPosPositions.col.c5
                    },
                    {
                        x: 140,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 140,
                    y: this.colPosPositions.col.c5
                },
                end: {
                    x: 140,
                    y: this.colPosPositions.col.c2 + 36
                }
            },
            P3: {
                used: false,
                points: [
                    {
                        x: 160 - this.offsetX,
                        y: this.colPosPositions.col.c5
                    },
                    {
                        x: 160,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 160,
                    y: this.colPosPositions.col.c5
                },
                end: {
                    x: 160,
                    y: this.colPosPositions.col.c2 + 36
                }
            },
            P4: {
                used: false,
                points: [
                    {
                        x: 54 - this.offsetX,
                        y: this.colPosPositions.col.c1 - 15
                    },
                    {
                        x: 54,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 54,
                    y: this.colPosPositions.col.c1 - 15
                },
                end: {
                    x: 54,
                    y: this.colPosPositions.col.c2
                }
            },
            P5: {
                used: false,
                points: [
                    {
                        x: 80 - this.offsetX,
                        y: this.colPosPositions.col.c1 - 15
                    },
                    {
                        x: 80,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 80,
                    y: this.colPosPositions.col.c1 - 15
                },
                end: {
                    x: 80,
                    y: this.colPosPositions.col.c2
                }
            },
            P6: {
                used: false,
                points: [
                    {
                        x: 140 - this.offsetX,
                        y: this.colPosPositions.col.c1 - 15
                    },
                    {
                        x: 140,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 140,
                    y: this.colPosPositions.col.c1 - 15
                },
                end: {
                    x: 140,
                    y: this.colPosPositions.col.c2
                }
            },
            P7: {
                used: false,
                points: [
                    {
                        x: 160 - this.offsetX,
                        y: this.colPosPositions.col.c1 - 15
                    },
                    {
                        x: 160,
                        y: this.colPosPositions.col.c2 + 10
                    },
                    this.endPoint
                ],
                init: {
                    x: 160,
                    y: this.colPosPositions.col.c1 - 15
                },
                end: {
                    x: 160,
                    y: this.colPosPositions.col.c2
                }
            },///ADD NO THE LATERAL ONES
            P8: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r3 + 15 - this.offsetX,
                        y: this.colPosPositions.col.c1 + 10,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 23,
                        y: this.colPosPositions.col.c1 + 15
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20,
                        y: this.colPosPositions.col.c2 + 8
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r3 + 15,
                    y: this.colPosPositions.col.c1 + 7
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10,
                    y: this.colPosPositions.col.c2
                }
            },
            P9: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r1,
                        y: this.colPosPositions.col.c1 + 10,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23,
                        y: this.colPosPositions.col.c1 + 15
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20,
                        y: this.colPosPositions.col.c2 + 8
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: this.colPosPositions.col.c1 + 7
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10,
                    y: this.colPosPositions.col.c2
                }
            },
            P10: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r1,
                        y: this.colPosPositions.col.c3 + 10,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23,
                        y: this.colPosPositions.col.c3 - 15
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20,
                        y: this.colPosPositions.col.c2 + 8
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: this.colPosPositions.col.c3 + 10,
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10,
                    y: this.colPosPositions.col.c2
                }
            },
            P11: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r1,
                        y: this.colPosPositions.col.c4 + 10,
                    },
                    {
                        x: this.colPosPositions.row.r2 - 23,
                        y: this.colPosPositions.col.c4 - 15
                    },
                    {
                        x: this.colPosPositions.row.r2 - 20,
                        y: this.colPosPositions.col.c2 + 8
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r1,
                    y: this.colPosPositions.col.c4 + 10,
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10,
                    y: this.colPosPositions.col.c2
                }
            },

            P12: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r3 + 15 - this.offsetX,
                        y: this.colPosPositions.col.c3 + 10,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 30,
                        y: this.colPosPositions.col.c3 - 15
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20,
                        y: this.colPosPositions.col.c2 + 12
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r3 + 15 - this.offsetX,
                    y: this.colPosPositions.col.c3 + 10,
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10,
                    y: this.colPosPositions.col.c2
                }
            },
            P13: {
                used: false,
                points: [
                    {
                        x: this.colPosPositions.row.r3,
                        y: this.colPosPositions.col.c4 + 10,
                    },
                    {
                        x: this.colPosPositions.row.r3 - 28,
                        y: this.colPosPositions.col.c4 - 15
                    },
                    {
                        x: this.colPosPositions.row.r3 - 20,
                        y: this.colPosPositions.col.c2 + 15
                    },
                    this.endPoint
                ],
                init: {
                    x: this.colPosPositions.row.r3 + 15 - this.offsetX,
                    y: this.colPosPositions.col.c4 + 10,
                },
                end: {
                    x: this.colPosPositions.row.r3 - 10,
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

        let { r, g, b } = colorPallete.green;
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