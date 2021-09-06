import MainVizTDModel from './model/mainVizTDModel.js';
import DriftModel from './model/DriftModel.js';
import ChatView from './view/miniChatView.js';
import MiniChatController from './controller/miniChatController.js';
import HomeView from './view/HomeView.js';
import HomeViewController from './controller/homeViewController.js';
import AboutView from './view/aboutView.js';
import AboutViewController from './controller/aboutViewController.js'
import MainMenuView from './view/mainMenuView.js';
import MainMenuViewController from './controller/mainMenuViewController.js';
import RobotView from './view/robotView.js';
import RobotViewController from './controller/robotViewController.js';
import TourView from './view/tourView.js';
import TourViewController from './controller/tourViewController.js';
import ApiService from './apiService.js';
import ExhibitionView from './view/ExhibitionView.js';
import ExhibitionViewController from './controller/exhibitionViewController.js';
import ChatButtonView from './view/chatButtonView.js';
import ChatBtnViewController from './controller/chatButtonViewController.js';
import MainVizTDView from './view/MainVizTDView.js';
import MainVizTDViewController from './controller/mainVizTDViewController.js';
import EmojiView from './view/emojiView.js';
import EmojiController from './controller/emojiController.js';
import { legendTexts } from './staticData.js'
import Legend from './model/legendModel.js'
import LoadingView from './view/loadingView.js';
import LoadingController from './controller/loadingController.js';

export let mainVizTD, robotView, miniChatController, homeViewController, exhibitionViewController, robotViewController, tourViewController, aboutViewController, mainMenuViewController, emojiController, chatBtnController, mainVizController;
// let mainVizTD
export let currentView, model, legendModel;

export let apiService;

let loadingController;

window.onload = function () {

    apiService = new ApiService();
    //We instantiate our model
    model = new DriftModel();
    //We instantiate our model
    mainVizTD = new MainVizTDModel();

    let loadingView = new LoadingView('page-content');
    loadingController = new LoadingController(loadingView);
    currentView = loadingController;
    loadingController.renderView();
    // showView("loading");


    model.init()
        .then(e => {
            mainVizTD.init();
            initViewsAndControllers()
            goToLocation();
        })
    // .catch(error => {
    //     console.log("error", error.error)
    //     //TAKE TO ERROR PAGE
    // })



};

function initViewsAndControllers() {
    legendModel = new Legend(legendTexts);

    let chatView = new ChatView('chat', model);
    miniChatController = new MiniChatController(chatView, model);

    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content', model);
    homeViewController = new HomeViewController(homeView, model, mainVizTD);

    let exhibitionView = new ExhibitionView('page-content', model, mainVizTD, legendModel);
    exhibitionViewController = new ExhibitionViewController(exhibitionView, mainVizTD, model);

    let robotView = new RobotView('page-content', model);
    robotViewController = new RobotViewController(robotView, chatView, model);

    let tourView = new TourView('page-content', model);
    tourViewController = new TourViewController(tourView);

    let aboutView = new AboutView('page-content', model);
    aboutViewController = new AboutViewController(aboutView);

    let mainMenuView = new MainMenuView('mainMenu', model);
    mainMenuViewController = new MainMenuViewController(mainMenuView, model);

    let emojiView = new EmojiView('emojiParty');
    emojiController = new EmojiController(emojiView, model);

    let chatBtnView = new ChatButtonView('chatButton', model);
    chatBtnController = new ChatBtnViewController(chatBtnView, model);

    let mainViztDView = new MainVizTDView('mainViz', mainVizTD);
    mainVizController = new MainVizTDViewController(mainViztDView, mainVizTD);

    //loading view
    //loading controller

}

function goToLocation() {
    let loadingPage = "home";
    const paths = document.location.pathname.substring(1).split('/')
    if (paths.length > 0) {
        loadingPage = paths[0];
    }
    showView(loadingPage);
}

window.onpopstate = function () {
    goToLocation();
};

//show view
//view: string with the name of the view to render
export default function showView(view) {

    start_sound_effect(); // Play a sound effect
    model.interaction.page(view);
    if (currentView == exhibitionViewController) {
        // mainVizTD.removeImages();
        model.toggleNoNotification(true);
        model.removeLayerStepInterval();
    }
    if (currentView != null) currentView.unMountView()
    switch (view) {
        case 'home':
            currentView = homeViewController;
            mainMenuViewController.unMountView();
            homeViewController.renderView();
            mainVizTD.toggleParticles(true);
            break;
        case 'exhibition':
            currentView = exhibitionViewController;
            exhibitionViewController.renderView();
            mainMenuViewController.renderView();
            model.toggleChatVisible(false);
            mainVizTD.toggleParticles(false);
            break;
        case 'driftbot':
            currentView = robotViewController;
            robotViewController.renderView();
            mainMenuViewController.renderView();
            mainVizTD.toggleParticles(false);
            break;
        case 'tour':
            currentView = tourViewController;
            tourViewController.renderView();
            mainMenuViewController.renderView();
            mainVizTD.toggleParticles(false);
            break;
        case 'about':
            currentView = aboutViewController;
            aboutViewController.renderView();
            mainMenuViewController.renderView();
            mainVizTD.toggleParticles(true);
            break;
        case 'loading':
            console.log("loading page")
            currentView = loadingController;
            loadingController.renderView();
            break;
        case 'error':
            console.log("error page")
            currentView = loadingController;
            loadingController.renderView();
            break;
        default:
            currentView = homeViewController;
            homeViewController.renderView();
            mainMenuViewController.unMountView();
            mainVizTD.toggleParticles(true)
    }
}
