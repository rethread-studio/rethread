let currentView, model;
window.onload = function () {
    //We instantiate our model
<<<<<<< HEAD
    let model = new DriftModel();
    model.init(); ``
=======
    model = new DriftModel();
    model.init();
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb

    let chatView = new ChatView('chat', model);
    miniChatController = new MiniChatController(chatView, model);

    //Initialize VIEWS and controllers
<<<<<<< HEAD
    let homeView = new HomeView('page-content', model);
=======
    let homeView = new HomeView('page-content')
>>>>>>> d52af47d62e3e6e28c1a9564957faf2495cbc0eb
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

    //start home view
    showView("legend");
};

//show view
//view: string with the name of the view to render
function showView(view) {
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
