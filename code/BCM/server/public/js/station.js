let protocol = "ws";
if (document.location.protocol == "https:") {
  protocol += "s";
}
let host = document.location.hostname;
if (document.location.port) {
  host += ":" + document.location.port;
}
const ws = new WebSocket(protocol + "://" + host);

angular
  .module("bcm", ["ngRoute"])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "/partials/home.htm",
        controller: "homeController",
        title: "Home",
      })
      .when("/welcome", {
        templateUrl: "/partials/welcome.htm",
        controller: "instructionController",
        title: "Welcome",
      })
      .when("/instruction", {
        templateUrl: "/partials/instruction.htm",
        controller: "instructionController",
        title: "Instruction",
      })
      .when("/visualization", {
        templateUrl: "/partials/visualization.htm",
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
    $("#visualization").show();
  })
  .controller("instructionController", function ($scope, $location) {
    $("#visualization").hide();
    setTimeout(() => {
      $location.url("/visualization");
    }, 5000);
  })
  .controller("homeController", function ($scope) {
    $("#visualization").hide();
  })
  .controller("mainController", function (
    $scope,
    $rootScope,
    $http,
    $location
  ) {
    $scope.wifi = "BCM - SoundProxy";
    $scope.instruction = "Go to Google.com";

    ws.onmessage = (message) => {
      const json = JSON.parse(message.data);
      if (json.event == "alive") {
        $scope.$apply(() => {
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
  });
