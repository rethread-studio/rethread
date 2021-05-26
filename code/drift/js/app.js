window.onload = function () {
    //We instantiate our model
    let model = new DriftModel();
    model.getData()


    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content');
    homeViewController = new HomeViewController(homeView);

    let exhibitionView = new ExhibitionView('page-content', model);
    exhibitionViewController = new ExhibitionViewController(exhibitionView);


    //start home view
    showView("exhibition");
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
        default:
            homeViewController.renderView();
    }
}
