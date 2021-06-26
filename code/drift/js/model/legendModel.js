
export default class Legend {

    constructor(data) {
        this.data = data;
        this.isVisible = false;
        this.posX = 0;
        this.posY = 0;
        this.text = `Hello this is text`;
        this.observers = [];
    }

    //add observers to the model
    addObserver(observer) {
        this.observers.push(observer);

    }
    //remove observer from the observers list
    removeObserver(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }
    // USE this function to notify all observers the changes
    notifyObservers(changeDetails) {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i].update(changeDetails);
        }
    }

    getInfo(key) {
        return this.data[key];
    }

    getIsVisible() {
        return this.isVisible;
    }

    getPosition() {
        return {
            posX: this.posX,
            posY: this.posY
        };
    }

    getContent() {
        return this.text
    }

    setContent(text) {
        this.text = text;
    }

    setVisible(visible = false) {
        this.isVisible = visible == undefined ? !this.isVisible : visible;
    }

    setPosition(_x, _y) {
        this.posX = _x;
        this.posY = _y;
    }








}