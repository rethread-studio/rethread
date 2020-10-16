function action() {
  chrome.runtime.sendMessage({ type: "action" }, function () {});
}
window.addEventListener("load", action);
window.document.addEventListener("load", action);
window.addEventListener("click", action);
window.addEventListener("touchstart", action);
window.addEventListener("scroll", action);
window.addEventListener("mousemove", action);
window.addEventListener("keydown", action);
