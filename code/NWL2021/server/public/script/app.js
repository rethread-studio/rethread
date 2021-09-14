const socket = io("/control");

angular
  .module("nwl2021", ["ngRoute", "ngSanitize"])
  .config([
    "$routeProvider",
    "$locationProvider",
    function ($routeProvider, $locationProvider) {
      $routeProvider
        .when("/", {
          templateUrl: "/partials/home.htm",
          controller: "homeController",
          title: "NWL 2021",
        })
        .when("/select", {
          templateUrl: "/partials/select.htm",
          controller: "selectController",
          title: "NWL 2021",
        })
        .when("/control", {
          templateUrl: "/partials/control.htm",
          controller: "controlController",
          title: "NWL 2021",
        })
        .otherwise({
          templateUrl: "/partials/404.htm",
          title: "Page not found ",
        });
      $locationProvider.html5Mode(true);
    },
  ])
  .controller("mainController", [
    function () {
      // key handling
      document.addEventListener(
        "keydown",
        function (e) {
          if (e.key == "ArrowDown") {
            socket.emit("down");
          } else if (e.key == "ArrowUp") {
            socket.emit("up");
          } else if (e.key == "ArrowLeft") {
            socket.emit("left");
          } else if (e.key == "ArrowRight") {
            socket.emit("right");
          }
        },
        false
      );
    },
  ])
  .controller("homeController", [
    "$scope",
    function ($scope) {
      $scope.title = "Turing Lights";
    },
  ])
  .controller("selectController", [
    "$scope",
    "$rootScope",
    "$location",
    "$http",
    function ($scope, $rootScope, $location, $http) {
      $scope.laureates = [
        {
          name: "Françoise Barré-Sinoussi",
          domain: "Physiology or Medicine",
          year: 2008,
          country: "France",
          img: "/img/laureate.png",
        },
        {
          name: "Elizabeth Blackburn",
          domain: "Physiology or Medicine",
          year: 2009,
          country: "France",
          img: "/img/laureate2.png",
        },
      ];
      $scope.currentIndex = 0;

      function getLaureates() {
        $http.get("/api/laureates").then((res) => {
          $scope.laureates = res.data;
        });
      }
      getLaureates();

      $scope.next = () => {
        $scope.currentIndex = Math.min(
          ++$scope.currentIndex,
          $scope.laureates.length - 1
        );
      };
      $scope.previous = () =>
        ($scope.currentIndex = Math.max(--$scope.currentIndex, 0));

      $scope.select = () => {
        $rootScope.laureate = $scope.laureates[$scope.currentIndex];
        $location.url("/control");
      };
    },
  ])
  .controller("controlController", [
    "$scope",
    "$rootScope",
    "$location",
    function ($scope, $rootScope, $location) {
      $scope.laureate = $rootScope.laureate;
      $scope.answer = undefined;
      $scope.question = undefined;

      if (!$scope.laureate) {
        return $location.url("/select");
      }
      $scope.laureate.img = "/img/laureate.png";

      socket.emit("start", $scope.laureate);
      socket.on("question", (question) => {
        $scope.question = question;
        $scope.answer = undefined;
        $scope.$apply();
      });

      socket.on("answer", ({ question, answer }) => {
        $scope.answer = answer;
        $scope.$apply();
      });

      $scope.up = () => {
        socket.emit("up");
      };
      $scope.down = () => {
        socket.emit("down");
      };
      $scope.left = () => {
        socket.emit("left");
      };
      $scope.right = () => {
        socket.emit("right");
      };
    },
  ]);
