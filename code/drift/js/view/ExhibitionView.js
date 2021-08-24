import SideMenuView from './sideMenuView.js';
import SideMenuController from '../controller/sideMenuController.js';
import DropDownToggleView from './dropDownToggleView.js';
import DropDownToggleController from '../controller/dropDownToggleController.js';
import DropDownView from './dropDownView.js';
import DropDownController from '../controller/dropDownController.js';
import SelectSiteToggleView from './selectSiteToggleView.js';
import SelectSiteToggleViewController from '../controller/selectSiteToggleViewController.js';
import TimeLineView from './timeLineView.js';
import TimeLineController from '../controller/timeLineController.js';
import CurrentTimeView from './currentTimeView.js';
import CurrentTimeViewController from '../controller/currentTimeViewController.js';
import TextView from './textView.js';
import TextViewController from '../controller/textViewController.js';
import exhibitionTexts from '../staticData.js';
import LegendView from './legendView.js';
import LegendViewController from '../controller/legendViewController.js';

export default class ExhibitionView {
    constructor(container, model, vizModel, legendModel) {

        this.container = document.getElementById(container);
        this.model = model;
        this.vizModel = vizModel;
        this.legendModel = legendModel;
        // this.meetRobot_btn = null;
    }

    renderMobile() {
        const content = `
        <div id="exhibitContent" class="">
            <div id="visContainer" class="h-screen w-screen fixed top-0">
                    <div id="viewSideMenu" class="absolute top-28 md:top-2-4 -translate-y-2-4  mr-5 right-0 from-mid-right  "></div>
                    <div id="timeLineWrapper" class="absolute bottom-0  left-0  flex flex-col flex-wrap justify-start from-down"></div>
                    <div id="currentTimeWrapper" class= "relative top-14 md:top-100 ml-6 md:ml-5 fade-in"></div>
                    <div id="sitesMenuWrapper" class="absolute top-28 md:top-2-4 -translate-y-2-4  ml-5  "></div>
                    <div id="legend" class="absolute z-10 top-0 p-5 bg-gray-800 rounded-xl transition-transform duration-500 ease-in-out w-5/12 hidden"></div>
            </div>
            <div id="exhibitionIntro" value = "0" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20  "> </div>
            <div id="exhibitionProcess" value = "1" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20 "> </div>
            <div id="exhibitionExplanation" value = "2" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20 "> </div>
            <div id="mainExhibit" value = "4" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20 "> </div>
            </div>
            
            `;
        // <div id="exhibitionSpread" value = "3" class="flex content-center items-center justify-left h-screen  white  z-10 pl-20 fade-in"> </div>
        this.container.innerHTML = content;
        this.renderTexts();
        this.renderSideMenuMobile(); //
        this.renderTimeLine();
        this.renderSitesMenuMobile(); //
        this.renderCurrentTime();
        this.setIdentifications()

    }

    render() {
        // <div id="webSitesWrapper"></div>

        const content = `
        <div id="exhibitContent" class="">
            <div id="visContainer" class="h-screen w-screen fixed top-0">
                    <div id="viewSideMenu" class="absolute top-2-4 -translate-y-2-4  mr-5 right-0 from-mid-right  "></div>
                    <div id="timeLineWrapper" class="absolute bottom-0  left-0  flex flex-col flex-wrap justify-start from-down"></div>
                    <div id="currentTimeWrapper" class= "relative top-14 md:top-100 ml-6 md:ml-5 fade-in"></div>
                    <div id="sitesMenuWrapper" class="absolute top-2-4 -translate-y-2-4  ml-5  "></div>
                    <div id="legend" class="absolute z-10 top-0 p-5 bg-gray-800 rounded-xl transition-transform duration-500 ease-in-out w-5/12 hidden"></div>
            </div>
            <div id="exhibitionIntro" value = "0" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20  "> </div>
            <div id="exhibitionProcess" value = "1" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20 "> </div>
            <div id="exhibitionExplanation" value = "2" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20 "> </div>
            <div id="mainExhibit" value = "4" class="flex content-center items-center justify-center h-screen  white  z-10 pl-0 md:pl-20 "> </div>
            </div>
            
            `;
        // <div id="exhibitionSpread" value = "3" class="flex content-center items-center justify-left h-screen  white  z-10 pl-20 fade-in"> </div>
        this.container.innerHTML = content;
        this.renderTexts();
        // this.renderMainVis();
        this.renderLegend();
        this.renderSideMenu();
        this.renderTimeLine();
        this.renderSitesMenu();
        this.renderCurrentTime();
        this.setIdentifications()

    }



    renderCurrentTime() {
        //ADD MAIN VISUALIZATION VIEWda
        let currentTimeView = new CurrentTimeView("currentTimeWrapper", this.model);
        this.currentTimeController = new CurrentTimeViewController(currentTimeView, this.model);
        this.currentTimeController.renderView();
    }

    renderLegend() {
        let legendView = new LegendView('legend', this.legendModel);
        this.legendViewController = new LegendViewController(legendView, this.legendModel);
        this.legendViewController.renderView()
    }
    // renderMainVis() {
    //     //ADD MAIN VISUALIZATION VIEW
    //     let mainVisView = new MainVisView("webSitesWrapper", this.model);
    //     this.mainVizController = new MainVisController(mainVisView, this.model);
    //     this.mainVizController.renderView();
    // }

    renderSideMenuMobile() {
        //ADD SIDE MENU VIEW
        let dropDownView = new DropDownView("viewSideMenu", this.model);
        this.sideMenuController = new DropDownController(dropDownView, this.model, this.vizModel);
        this.sideMenuController.renderView();
    }

    renderSideMenu() {
        //ADD SIDE MENU VIEW
        let sideMenuView = new SideMenuView("viewSideMenu", this.model);
        this.sideMenuController = new SideMenuController(sideMenuView, this.model, this.vizModel, this.legendViewController);
        this.sideMenuController.renderView();
    }

    renderTexts() {
        let introView = new TextView("exhibitionIntro", exhibitionTexts.intro.tittle, exhibitionTexts.intro.text);
        this.introController = new TextViewController(introView, this.vizModel);
        this.introController.renderView();

        let whatView = new TextView("exhibitionProcess", exhibitionTexts.views.tittle, exhibitionTexts.views.text);
        this.whatController = new TextViewController(whatView, this.vizModel);
        this.whatController.renderView();

        let explanationView = new TextView("exhibitionExplanation", exhibitionTexts.timeline.tittle, exhibitionTexts.timeline.text);
        this.explainController = new TextViewController(explanationView, this.vizModel);
        this.explainController.renderView();

        // let spreadView = new TextView("exhibitionSpread", exhibitionTexts.spread.tittle, exhibitionTexts.spread.text);
        // this.spreadController = new TextViewController(spreadView, this.vizModel);
        // this.spreadController.renderView();
    }

    renderTimeLine() {
        let timeLineView = new TimeLineView("timeLineWrapper", this.model);
        this.timeLineController = new TimeLineController(timeLineView, this.model);
        this.timeLineController.renderView();
    }

    renderSitesMenuMobile() {
        let sitesMenuView = new DropDownToggleView("sitesMenuWrapper", this.model);
        this.sitesMenuViewController = new DropDownToggleController(sitesMenuView, this.model);
        this.sitesMenuViewController.renderView();
    }

    renderSitesMenu() {
        let sitesMenuView = new SelectSiteToggleView("sitesMenuWrapper", this.model);
        this.sitesMenuViewController = new SelectSiteToggleViewController(sitesMenuView, this.model);
        this.sitesMenuViewController.renderView();
    }
    unMountView() {
        this.timeLineController.unMountView();
    }

    setIdentifications() {
        this.intro = document.getElementById('exhibitionIntro')
        this.process = document.getElementById('exhibitionProcess')
        this.explanation = document.getElementById('exhibitionExplanation')
        this.spread = document.getElementById('exhibitionSpread')
        this.visContainer = document.getElementById('visContainer')
        this.timeline = document.getElementById('timeLineWrapper')
        this.viewsMenu = document.getElementById('viewSideMenu')
        this.exhibitContent = document.getElementById('exhibitContent');
        this.currentTime = document.getElementById('currentTimeWrapper');
    }
}
