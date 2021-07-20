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

export let mainVizTD, robotView, miniChatController, homeViewController, exhibitionViewController, robotViewController, tourViewController, aboutViewController, mainMenuViewController, emojiController, chatBtnController, mainVizController;
// let mainVizTD
export let currentView, model, legendModel;

export let apiService;

window.onload = function () {

    apiService = new ApiService();
    //We instantiate our model
    model = new DriftModel();
    model.init();

    //We instantiate our model
    mainVizTD = new MainVizTDModel();
    mainVizTD.init();

    legendModel = new Legend(legendTexts);

    let chatView = new ChatView('chat', model);
    miniChatController = new MiniChatController(chatView, model);

    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content', model);
    homeViewController = new HomeViewController(homeView, model);

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

    //start home view
    showView("home");
};

//show view
//view: string with the name of the view to render
export default function showView(view) {

    start_sound_effect(); // Play a sound effect
    
    model.interaction.page(view);
    if (currentView == exhibitionViewController) {
        mainVizTD.removeImages();
        model.toggleNoNotification(true);
    }
    if (currentView != null) currentView.unMountView()
    switch (view) {
        case 'home':
            currentView = homeViewController;
            mainMenuViewController.unMountView();
            homeViewController.renderView();
            break;
        case 'exhibition':
            currentView = exhibitionViewController;
            exhibitionViewController.renderView();
            mainMenuViewController.renderView();
            model.toggleChatVisible(false);
            break;
        case 'robot':
            currentView = robotViewController;
            robotViewController.renderView();
            mainMenuViewController.renderView();
            break;
        case 'tour':
            currentView = tourViewController;
            tourViewController.renderView();
            mainMenuViewController.renderView();
            break;
        case 'about':
            currentView = aboutViewController;
            aboutViewController.renderView();
            mainMenuViewController.renderView();
            break;
        default:
            currentView = homeViewController;
            homeViewController.renderView();
            mainMenuViewController.unMountView();
    }
}
