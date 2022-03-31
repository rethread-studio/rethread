const ws = WebSocketClient();

angular
  .module("bcm", ["ngRoute"])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "/partials/home.htm",
        controller: "homeController",
        title: "Home",
      })
      .when("/close", {
        templateUrl: "/partials/close.htm",
        controller: "closeController",
        title: "Close",
      })
      .when("/", {
        templateUrl: "/partials/visualization.htm",
        controller: "visualizationController",
        title: "Visualization",
      })
      .when("/notitle", {
        templateUrl: "/partials/visualization-no-title.htm",
        controller: "visualizationController",
        title: "Visualization",
      })
      .when("/404", {
        templateUrl: "/partials/404.htm",
        title: "Not Found!",
      });
    //.otherwise("/error");
    $locationProvider.html5Mode(true);
  })
  .controller("visualizationController", function ($rootScope, $location) {
    $(".currentVisualization").show();
  })
  .controller("mainController", function ($scope, $http, $location) {
    $scope.wifi = "BCM";
    $scope.password = null;

    const visualizations = [
      "visualization1",
      // "visualization2",
      // "visualizationGlobe",
      // "visualizationSparse",
    ];
    let currentVisualization = 0;
    $("#" + visualizations[currentVisualization]).addClass(
      "currentVisualization"
    );

    let switchTimeout = null;
    function switchVisualization() {
      clearTimeout(switchTimeout);
      currentVisualization++;
      if (currentVisualization == visualizations.length) {
        currentVisualization = 0;
      }
      $(".visualization").hide().removeClass("currentVisualization");
      $("#" + visualizations[currentVisualization]).addClass(
        "currentVisualization"
      );
      $("#" + visualizations[currentVisualization]).show();
      let duration = 30;
      if (currentVisualization == 1 || currentVisualization == 3) {
        duration = 5;
      }
      switchTimeout = setTimeout(switchVisualization, duration * 1000);
    }

    setTimeout(switchVisualization, 2500);

    $scope.switch = () => switchVisualization();

    const onmessage = (message) => {
      const json = JSON.parse(message.data);
      if (json.event == "alive") {
        $scope.$apply(() => {
          $scope.deviceName = json.deviceName;
          if (!json.alive) {
            $location.url("/");
          } else if ($location.url() == "/") {
            $location.url("/welcome");
          }
        });
      } else if (json.event == "instruction") {
        $location.url("/instruction");
        $scope.$apply(() => {
          $scope.instruction = json.instruction;
        });
      }
    };
    ws.addEventListener("message", onmessage);
    ws.addEventListener("error", () => {
      $scope.$apply(() => {
        $location.url("/close");
      });
    });
    ws.addEventListener("open", () => {
      $scope.$apply(() => {
        $location.url("/");
      });
    });
  });
