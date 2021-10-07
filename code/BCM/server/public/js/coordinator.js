const ws = WebSocketClient();

angular
  .module("bcm-dashboard", [])
  .filter("humanSize", () => (bytes) => {
    const dp = 1;
    const thresh = 1024;

    if (Math.abs(bytes) < thresh) {
      return bytes.toFixed(dp) + " B";
    }

    const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let u = -1;
    const r = 10 ** dp;

    do {
      bytes /= thresh;
      ++u;
    } while (
      Math.round(Math.abs(bytes) * r) / r >= thresh &&
      u < units.length - 1
    );

    return bytes.toFixed(dp) + " " + units[u];
  })
  .controller("mainController", function ($scope, $http) {
    $scope.status = { sample: false };
    $scope.stations = {};
    $scope.samples = [];
    $scope.sampleName = "Sample 1";
    $scope.instruction = "";

    function getSamples() {
      $http.get("/api/samples").then((res) => {
        $scope.samples = res.data;
      });
    }
    getSamples();

    function getStations() {
      $http.get("/api/stations").then((res) => {
        if (res) {
          $scope.stations = res.data;
          for (let station in $scope.stations) {
            $scope.stations[station].metrics.since = new Date(
              $scope.stations[station].metrics.since
            );
          }
        }
      });
    }

    getStations();
    setInterval(getStations, 10000);

    function getStatus() {
      for (let station in $scope.stations) {
        $http.get(`/api/station/${station}/status`).then((res) => {
          $scope.stations[res.data.name].status = res.data.status;
          $scope.stations[res.data.name].metrics = res.data.metrics;
          $scope.stations[res.data.name].client = res.data.client;
        });
      }
    }
    setInterval(getStations, 3000);

    $scope.loadSample = () => {
      $scope.stopSample();
      $http.get("/api/sample/" + $scope.sampleName).then((res) => {
        $scope.sample = res.data;
      });
    };

    $scope.playSample = () => {
      $http.post("/api/sample/play", { sample: $scope.sample }).then((res) => {
        $scope.status.sample = true;
        getStatus();
      });
    };

    $scope.stopSample = () => {
      $http.post("/api/sample/stop").then((res) => {
        $scope.status.sample = false;
        getStatus();
      });
    };

    $scope.sendInstruction = () => {
      $http
        .post("/api/instruction", { instruction: $scope.instruction })
        .then((res) => {
          $scope.instruction = "";
        });
    };

    $scope.toggleOSC = (station) => {
      $http.post(`/api/station/${station}/toggleosc`).then((res) => {
        $scope.stations[station].status = res.data;
      });
    };

    $scope.disconnect = (station, client) => {
      $http
        .post(`/api/station/${station}/disconnect`, client)
        .then((res) => {
          getStatus();
        });
    };

    $scope.toggleSniffing = (station) => {
      $http.post(`/api/station/${station}/togglesniffing`).then((res) => {
        $scope.stations[station].status = res.data;
      });
    };

    $scope.toggleMute = (station) => {
      $http.post(`/api/station/${station}/togglemute`).then((res) => {
        $scope.stations[station].status = res.data;
      });
    };

    $scope.openBrowser = (station) => {
      $http.post(`/api/station/${station}/openbrowser`).then((res) => {});
    };

    $scope.closeBrowser = (station) => {
      $http.post(`/api/station/${station}/closebrowser`).then((res) => {});
    };

    $scope.now = () => new Date();

    ws.onmessage = (message) => {
      const json = JSON.parse(message.data);
      if (json.event == "networkActivity") {
        $scope.$apply(() => {
          if (json.data.out) {
            $scope.stations[json.data.station].metrics.out++;
            $scope.stations[json.data.station].metrics.lenOut += json.data.len;
          } else {
            $scope.stations[json.data.station].metrics.in++;
            $scope.stations[json.data.station].metrics.lenIn += json.data.len;
          }
        });
      }
    };
  });
