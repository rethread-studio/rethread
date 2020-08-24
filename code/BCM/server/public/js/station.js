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
    $("#visualization").show();
    setTimeout(() => {
      //$location.url("/visualization");
    }, 5000);
  })
  .controller("homeController", function ($scope) {
    $("#visualization").hide();
    const bg = document.getElementById("glishBackground");
    const count = 30;
    for (let index = 0; index < count; index++) {
      const element = document.createElement("div");
      element.className = "glishBox";
      bg.appendChild(element);
    }
    setInterval(() => {
      const glishBoxes = document.getElementsByClassName("glishBox");
      for (let index = 0; index < glishBoxes.length; index++) {
        const element = glishBoxes[index];
        element.style.left = Math.floor(Math.random() * 100) + "vw";
        element.style.top = Math.floor(Math.random() * 100) + "vh";

        element.style.width = Math.floor(Math.random() * 75) + "px";
        element.style.height = Math.floor(Math.random() * 30) + "px";
        element.style.opacity = Math.random() * 0.7;
      }
    }, 150);
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
