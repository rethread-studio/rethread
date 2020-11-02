function action() {
  chrome.runtime.sendMessage({ type: "action" }, function () {});
}
window.addEventListener("DOMContentLoaded", action);
window.addEventListener("load", action);
window.document.addEventListener("load", action);
window.addEventListener("click", action);
window.addEventListener("touchstart", action);
window.addEventListener("scroll", action);
window.addEventListener("mousemove", action);
window.addEventListener("keydown", action);

chrome.runtime.sendMessage({ type: "home", action: "open" }, function () {});

window.addEventListener('beforeunload', function(event) {
  chrome.runtime.sendMessage({ type: "home", action: "close" }, function () {});
});

window.addEventListener("DOMContentLoaded", () => {
  var elements = document.getElementsByTagName("a");
  for (var i = 0, len = elements.length; i < len; i++) {
    elements[i].addEventListener("click", () => {
      chrome.runtime.sendMessage(
        { type: "home", action: "close" },
        function () {}
      );
    });
  }
});
