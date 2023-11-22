const socket = io("/screen");
angular
  .module("nwl", ["ngRoute", "ngSanitize"])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "/admin/partials/home.htm",
        controller: "homeController",
      })
      .when("/state", {
        templateUrl: "/admin/partials/state.htm",
        controller: "stateController",
      })
      .when("/laureates", {
        templateUrl: "/admin/partials/laureates.htm",
        controller: "laureatesController",
      })
      .when("/questions", {
        templateUrl: "/admin/partials/questions.htm",
        controller: "questionsController",
      })
      .when("/bot", {
        templateUrl: "/admin/partials/bot.htm",
        controller: "botController",
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
      $scope.gameState = null;
      socket.off("gameStateUpdate");
      socket.on("question", (data) => {
        $scope.$apply(() => {
          $scope.gameState.questionEndDate = data.endDate;
          $scope.gameState.question = data.question;
        });
      });
      socket.on("gameStateUpdate", (data) => {
        $scope.$apply(() => {
          $scope.gameState = data;
        });
      });

      function getNbUsers() {
        $http.get("/api/admin/users/").then((response) => {
          $scope.nbUsers = response.data;
        });
      }

      let interval = setInterval(getNbUsers, 1000);

      new Twitch.Player("twitch-embed", {
        channel: "rethread",
        width: 600,
        height: 300,
      });

      $scope.$on("$destroy", function () {
        clearInterval(interval);
      });
    },
  ])
  .controller("stateController", [
    "$scope",
    "$http",
    "$location",
    function ($scope, $http, $location) {
      function getState() {
        $http.get("/api/admin/state").then((res) => {
          $scope.state = res.data;
        });
      }

      getState();

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
    },
  ])
  .controller("questionsController", [
    "$scope",
    "$http",
    "$location",
    function ($scope, $http, $location) {
      $scope.currentQuestion = null;
      function getQuestions() {
        $http.get("/api/admin/questions").then((res) => {
          $scope.questions = res.data;
        });
      }
      getQuestions();

      $scope.addQuestion = function () {
        $scope.questions.push({ text: "", answers: [] });
      };

      $scope.addAnswer = function (question) {
        question.answers.push({ text: "", isCorrect: false });
      };

      $scope.activate = function (question) {
        $http
          .post(`/api/admin/questions/${question._id}/activate`)
          .then((question) => {
            $scope.currentQuestion = question;
          });
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
    },
  ])
  .controller("laureatesController", [
    "$scope",
    "$http",
    "$location",
    function ($scope, $http, $location) {
      function getLaureates() {
        $http.get("/api/laureates").then((res) => {
          $scope.laureates = res.data;
        });
      }

      getLaureates();

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
  ])
  .controller("botController", [
    "$scope",
    "$http",
    function ($scope, $http) {
      $scope.bots = [];
      const directions = ["up", "down", "left", "right"];
      $scope.laureates = [];
      function getLaureates() {
        $http.get("/api/laureates").then((res) => {
          $scope.laureates = res.data;
        });
      }
      getLaureates();
      $scope.addBot = function () {
        const bot = {
          socket: io("/control"),
          status: "active",
          position: null,
          laureate: null,
        };
        bot.socket.on("connect", () => {
          bot.laureate =
            $scope.laureates[
              Math.floor(Math.random() * $scope.laureates.length)
            ];
          bot.socket.emit("start", bot.laureate._id);
        });

        bot.socket.on("move", (position) => {
          $scope.$apply(() => {
            bot.position = position;
          });
        });

        bot.socket.on("leave", leave);
        bot.socket.on("disconnect", leave);

        function leave() {
          clearTimeout(botinterval);
          $scope.$apply(() => {
            bot.status = "inactive";
            $scope.bots.slice(0, $scope.bots.indexOf(bot));
          });
        }

        function take_action() {

          let botinterval = setTimeout(() => {
            if (Math.random() > 0.3) {
              bot.socket.emit(directions[Math.floor(Math.random() * 4)]);
            } else {
              bot.socket.emit("click", { x: 0, y: 0 });
            }
            take_action();
          }, Math.random() *600 + 200);
        }

        take_action();

        $scope.bots.push(bot);
      };
      $scope.$on("$destroy", function () {
        for (let bot of $scope.bots) {
          bot.socket.close();
        }
      });
    },
  ]);
