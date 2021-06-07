let currentView;
window.onload = function () {
    //We instantiate our model
    let model = new DriftModel();
    model.init(); ``

    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content', model);
    homeViewController = new HomeViewController(homeView, model);

    let exhibitionView = new ExhibitionView('page-content', model);
    exhibitionViewController = new ExhibitionViewController(exhibitionView);

    let robotView = new RobotView('page-content', model);
    robotViewController = new RobotViewController(robotView);

    let tourView = new TourView('page-content', model);
    tourViewController = new TourViewController(tourView);

    let aboutView = new AboutView('page-content', model);
    aboutViewController = new AboutViewController(aboutView);

    let mainMenuView = new MainMenuView('mainMenu', model);
    mainMenuViewController = new MainMenuViewController(mainMenuView, model);

    let legendView = new LegendView('page-content', model);
    legendViewController = new LegendViewController(legendView);

    //start home view
    showView("about");
};

//show view
//view: string with the name of the view to render
function showView(view) {

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
