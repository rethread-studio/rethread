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
    $(".currentVisualization").show();
    $("#welcomeBg").hide();
  })
  .controller("instructionController", function ($scope, $location) {
    $(".currentVisualization").show();
    $("#welcomeBg").hide();
    setTimeout(() => {
      $location.url("/visualization");
    }, 5000);
  })
  .controller("homeController", function ($scope) {
    $(".visualization").hide();
    $("#welcomeBg").show();
  })
  .controller("mainController", function ($scope, $http, $location) {
    $scope.wifi = "BCM - SoundProxy";
    $scope.password = null;
    $scope.instruction = "";
    $scope.deviceName = "";

    function getConfig() {
      $http.get("/api/wifi/config").then((res) => {
        $scope.wifi = res.data.ssid;
        $scope.password = res.data.wpa_passphrase;
      });
    }
    getConfig();

    const visualizations = [
      "visualization1",
      "visualization2",
      //"visualization3",
      "visualizationGlobe",
      "visualizationSparse",
    ];
    let currentVisualization = 0;
    $("#" + visualizations[currentVisualization]).addClass(
      "currentVisualization"
    );
    function switchVisualization() {
      currentVisualization++;
      if (currentVisualization == visualizations.length) {
        currentVisualization = 0;
      }
      $(".visualization").hide().removeClass("currentVisualization");
      $("#" + visualizations[currentVisualization]).addClass(
        "currentVisualization"
      );
      if ($location.url() != "/") {
        $("#" + visualizations[currentVisualization]).show();
      }
      setTimeout(switchVisualization, 20000);
    }

    setTimeout(switchVisualization, 0);

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
    ws.addEventListener("message", onmessage)
  });
