var isIFrame = window.top != window;

function injectStyle(file_path) {
  var script = document.createElement("link");
  script.href = file_path;
  script.rel = "stylesheet";
  var parent = document.head || document.documentElement;
  parent.insertBefore(script, parent.childNodes[0]);
}

function injectScript(file_path) {
  var script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", file_path);
  var parent = document.head || document.documentElement;
  parent.insertBefore(script, parent.childNodes[0]);
}

function createButton() {
  var button = document.createElement("div");
  button.id = "pellowHomeButton";
  button.innerText = "Home";
  button.onclick = function (event) {
    event.preventDefault();
    var iframe = document.getElementById("pellowHome");
    if (iframe) {
      closeHome();
    } else {
      displayHome();
    }
    return false;
  };
  document.documentElement.appendChild(button);
}

function displayHome() {
  closeHome();
  var iframe = document.createElement("iframe");
  iframe.id = "pellowHome";
  iframe.src = chrome.extension.getURL("startPage.html");
  document.documentElement.appendChild(iframe);

  var button = document.getElementById("pellowHomeButton");
  button.innerText = "close";
  document.body.className += " pellowOpen";

  chrome.runtime.sendMessage({ type: "home", action: "open" }, function () {});
}

function closeHome() {
  var iframe = document.getElementById("pellowHome");
  if (iframe) {
    document.documentElement.removeChild(iframe);
    var button = document.getElementById("pellowHomeButton");
    button.innerText = "Home";
    document.body.className = document.body.className.replace(
      " pellowOpen",
      ""
    );

    chrome.runtime.sendMessage(
      { type: "home", action: "close" },
      function () {}
    );
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.requested == "createDiv") {
    //Code to create the div
    sendResponse({ confirmation: "Successfully created div" });
  }
});
if (!isIFrame) {
  injectStyle(chrome.extension.getURL("style/tabStyle.css"), "head");
  createButton();
  // injectScript(chrome.extension.getURL("scripts/error_logging.js"), "head");

  function action() {
    chrome.runtime.sendMessage({ type: "action" }, function () {});
  }
  window.addEventListener("click", action);
  window.addEventListener("touchstart", action);
  window.addEventListener("scroll", action);
  window.addEventListener("mousemove", action);
  window.addEventListener("keydown", action);
}
