
const videoPlayer = document.getElementById("videoPlayer")

const videoConfig = {
    width: 1920,
    height: 1080,
    loop: false
}

function initVid() {
    videoPlayer.width = videoConfig.width;
    videoPlayer.height = videoConfig.height;
    videoPlayer.pause();
}

function videoPlay(_play) {
    _play ? videoPlayer.play() : videoPlayer.pause();
}
