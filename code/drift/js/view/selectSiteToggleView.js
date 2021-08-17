
import CheckBoxListView from './checkBoxListView.js';
import CheckBoxViewController from '../controller/checkBoxViewController.js';
import RadialListView from './radialListView.js';
import RadialViewController from '../controller/radialViewController.js';

export default class SelectSiteToggleView {
    constructor(container, model) {
        this.model = model;
        this.container = document.getElementById(container);

    }

    render() {
        const stack = this.model.getStack()
        const content = `
        <div id="radialList" class="${stack ? "block" : "hidden"}"> </div> 
		`;
        this.container.innerHTML = content;
        this.renderRadialList();
    }

    unmount() {
        this.sitesRadialController.unMountView();
    }

    hideOptions() {
        this.sitesRadialController.hideOptions();
    }
    showOptions() {
        this.sitesRadialController.showOptions();
    }

    renderRadialList() {
        let sitesRadial = new RadialListView("radialList", this.model);
        this.sitesRadialController = new RadialViewController(sitesRadial, this.model);
        this.sitesRadialController.renderView();
    }

}
