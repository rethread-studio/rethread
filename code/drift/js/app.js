window.onload = function () {
    //We instantiate our model
    let model = new DriftModel();



    //Initialize VIEWS and controllers
    let homeView = new HomeView('page-content');
    homeViewController = new HomeViewController(homeView);

    let exhibitionView = new ExhibitionView('page-content');
    // exhibitionViewController = new ExhibitionViewController(exhibitionView);


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
            console.log("viewexhibition")
            // exhibitionViewController.renderView();
            break;
        default:
            homeViewController.renderView();
    }
}
