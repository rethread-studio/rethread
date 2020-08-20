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
  .module("bcm-dashboard", [])
  .controller("mainController", function ($scope, $http) {
    $scope.stations = {};
    $scope.instruction = "";

    $scope.sendInstruction = () => {
      $http
        .post("/api/instruction", { instruction: $scope.instruction })
        .then((res) => {
          $scope.instruction = "";
        });
    };

    $http.get("/api/stations").then((res) => {
      if (res) {
        for (let station of res.data) {
          $scope.stations[station] = {
            name: station,
            nbPackage: 0,
            len: 0,
          };
        }
      }
    });

    ws.onmessage = (message) => {
      const json = JSON.parse(message.data);
      if (json.event == "networkActivity") {
        $scope.$apply(() => {
          $scope.stations[json.data.station].len += json.data.len;
          $scope.stations[json.data.station].nbPackage++;
        });
      }
    };
  });
