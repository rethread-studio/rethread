

class CountryManager {


    constructor(_countries, _font, fontSize, positions, colorPallete) {
        //list of countries to show
        this.countries = _countries;

        this.fontURL = _font;
        this.font = loadFont(_font);
        this.fontSize = fontSize;
        this.colPosPositions = positions;
        this.colorPallete = colorPallete;
        //initial positons and ending positions
        this.positions = {
            P0: {
                used: false,
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
                init: {
                    x: this.colPosPositions.row.r3 + 15,
                    y: this.colPosPositions.col.c1
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
        this.maxCountries = 9;//26;
        this.maxPackages = 400;
        this.currentPos = 0;
        console.log("hey", this.countries.length, this.maxPackages)
        for (let i = 0; i < this.maxCountries && i < this.countries.length; i++) {
            console.log("hola")
            this.addCountry(this.countries[this.currentPos]);
            this.currentPos++;
        }


        this.showPath = false;
    }

    //UPDATE ALL THE DATA
    updateData() {

    }

    addPackage(name) {
        // console.log(this.getCountry(name))
        if (this.getCountry(name) != undefined) {
            const country = this.getCountry(name)
            if (country != undefined) {
                const { x, y } = country.pos.init;
                // console.log(x, y, this.colorPallete, country.country, country.path)
                const pack = new Package(x, y, this.colorPallete, country.country, country.path)
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

        let { r, g, b } = colorPallete.red;
        fill(r, g, b);
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
        const place = this.currentPos % this.maxCountries;

        // const position = this.getFreePosition();
        // if (position == null) return;
        // console.log(position)
        //ADDS A PATH
        const path = new Path();
        path.addPoint(this.positions["P" + place].init.x - 1, this.positions["P" + place].init.y);
        path.addPoint(this.positions["P" + place].end.x, this.positions["P" + place].end.y);
        //ADDS A COUNTRY ELEM
        const country = new Country(this.positions["P" + place].init.x, this.positions["P" + place].init.y, this.colorPallete, this.positions["P" + place].end)
        //ADD TEXT
        const name = coutryName;
        const IsoName = getCountryName(name);

        const newCountry = {
            pos: {
                init: this.positions["P" + place].init,
                end: this.positions["P" + place].end
            },
            path: path,
            country: country,
            name: {
                name: name,
                iso: IsoName,
            }
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
        this.toRender.splice(index, 1);
    }

    getCountry(name) {
        return this.toRender.find(country => country.name.name == name);
    }

    //get a free position
    getFreePosition() {
        for (const key in this.positions) {
            if (this.positions[key].used == false) {
                this.positions[key].used = true;
                return this.positions[key];
            }
        }
        return null;
    }

    //change all the countries list
    changeCountries() {

    }
}