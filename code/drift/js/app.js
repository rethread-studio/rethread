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
    robotViewController = new RobotController(exhibitionView);



    //start home view
    showView("home");
};

//show view
//view: string with the name of the view to render
function showView(view) {

    switch (view) {
        case 'home':
            homeViewController.renderView();
            break;
        case 'exhibition':
            exhibitionViewController.renderView();
            break;
        case 'robot':
            robotViewController.renderView();
            break;
        default:
            homeViewController.renderView();
    }
}
