angular
  .module("nwl", ["ngRoute", "ngSanitize"])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "/admin/partials/home.htm",
        controller: "homeController",
      })
      .otherwise({
        templateUrl: "/admin/partials/404.htm",
      });
    $locationProvider.html5Mode(true);
  })
  .controller("mainController", [
    "$scope",
    "$http",
    "$location",
    function ($scope, $http, $location) {},
  ])
  .controller("homeController", [
    "$scope",
    "$http",
    "$location",
    function ($scope, $http, $location) {
      function getState() {
        $http.get("/api/admin/state").then((res) => {
          $scope.state = res.data;
        });
      }

      function getQuestions() {
        $http.get("/api/admin/questions").then((res) => {
          $scope.questions = res.data;
        });
      }

      function getLaureates() {
        $http.get("/api/laureates").then((res) => {
          $scope.laureates = res.data;
        });
      }

      getState();
      getLaureates();
      getQuestions();

      $scope.saveState = function () {
        $http.post("/api/admin/state", $scope.state).then((res) => {
          getState();
        });
      };

      $scope.load = function () {
        $http.post("/api/admin/state/load").then((res) => {
          getState();
        });
      };

      $scope.export = function () {
        $http.post("/api/admin/state/export").then((res) => {
          getState();
        });
      };

      $scope.addQuestion = function () {
        $scope.questions.push({ text: "", answers: [] });
      };

      $scope.addAnswer = function (question) {
        question.answers.push({ text: "", isCorrect: false });
      };

      let questionsTimeout = null;
      $scope.$watch(
        "questions",
        (newValue, oldValue) => {
          if (oldValue == null) return;
          clearTimeout(questionsTimeout);
          questionsTimeout = setTimeout(() => {
            $http.post("/api/admin/questions", newValue).then(() => {
              getQuestions();
            });
          }, 1500);
        },
        true
      );

      let stateTimeout = null;
      $scope.$watch(
        "state",
        (newValue, oldValue) => {
          if (oldValue == null) return;
          clearTimeout(stateTimeout);
          stateTimeout = setTimeout(() => {
            $http.post("/api/admin/state", newValue).then(() => {
              getState();
            });
          }, 1500);
        },
        true
      );

      let laureatesTimeout = null;
      $scope.$watch(
        "laureates",
        (newValue, oldValue) => {
          if (oldValue == null) return;
          clearTimeout(laureatesTimeout);
          laureatesTimeout = setTimeout(() => {
            $http.post("/api/admin/laureates", newValue).then(() => {});
          }, 1500);
        },
        true
      );
    },
  ]);
