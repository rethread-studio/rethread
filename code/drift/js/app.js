import MainVizTDModel from './model/mainVizTDModel.js';
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


export let mainVizTD, robotView, miniChatController, homeViewController, exhibitionViewController, robotViewController, tourViewController, aboutViewController, mainMenuViewController, legendViewController, emojiController, chatBtnController, mainVizController;
// let mainVizTD
export let currentView;
let model;

window.onload = function () {
    //We instantiate our model
    model = new DriftModel();
    model.init();

    //We instantiate our model
    mainVizTD = new MainVizTDModel();
    mainVizTD.init();

    let chatView = new ChatView('chat', model);
    miniChatController = new MiniChatController(chatView, model);

    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content', model);
    homeViewController = new HomeViewController(homeView, model);

    let exhibitionView = new ExhibitionView('page-content', model);
    exhibitionViewController = new ExhibitionViewController(exhibitionView);

    let robotView = new RobotView('page-content', model);
    robotViewController = new RobotViewController(robotView, chatView, model);

    let tourView = new TourView('page-content', model);
    tourViewController = new TourViewController(tourView);

    let aboutView = new AboutView('page-content', model);
    aboutViewController = new AboutViewController(aboutView);

    let mainMenuView = new MainMenuView('mainMenu', model);
    mainMenuViewController = new MainMenuViewController(mainMenuView, model);

    let legendView = new LegendView('page-content', model);
    legendViewController = new LegendViewController(legendView);

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

    model.interaction.page(view);
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
        case 'legend':
            currentView = legendViewController;
            legendViewController.renderView();
            mainMenuViewController.renderView();
            break;
        default:
            currentView = homeViewController;
            homeViewController.renderView();
            mainMenuViewController.unMountView();
    }
}
