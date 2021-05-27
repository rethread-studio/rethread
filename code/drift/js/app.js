window.onload = function () {
    //We instantiate our model
    let model = new DriftModel();
    model.init();

    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content');
    homeViewController = new HomeViewController(homeView);

    let exhibitionView = new ExhibitionView('page-content', model);
    exhibitionViewController = new ExhibitionViewController(exhibitionView);

    let robotView = new RobotView('page-content', model);
    robotViewController = new RobotViewController(robotView);

    let tourView = new TourView('page-content', model);
    tourViewController = new TourViewController(tourView);

    let aboutView = new AboutView('page-content', model);
    aboutViewController = new AboutViewController(aboutView);

    let mainMenuView = new MainMenuView('mainMenu', model);
    mainMenuViewController = new MainMenuViewController(mainMenuView);

    //start home view
    showView("home");
};

//show view
//view: string with the name of the view to render
function showView(view) {

    switch (view) {
        case 'home':
            homeViewController.renderView();
            mainMenuViewController.unMountView();
            break;
        case 'exhibition':
            exhibitionViewController.renderView();
            mainMenuViewController.renderView();
            break;
        case 'meetTheRobot':
            robotViewController.renderView();
            mainMenuViewController.renderView();
            break;
        case 'tour':
            tourViewController.renderView();
            mainMenuViewController.renderView();
            break;
        case 'about':
            aboutViewController.renderView();
            mainMenuViewController.renderView();
            break;
        default:
            homeViewController.renderView();
            mainMenuViewController.unMountView();
    }
}
