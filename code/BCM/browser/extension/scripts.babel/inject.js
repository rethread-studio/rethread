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
  if (document.body) {
    document.documentElement.appendChild(button);
  }
  document.documentElement.appendChild(button);
}

function displayHome() {
  closeHome();
  var iframe = document.createElement("iframe");
  iframe.id = "pellowHome";
  iframe.src = "http://localhost:8873/startPage.html";
  document.documentElement.appendChild(iframe);

  var button = document.getElementById("pellowHomeButton");
  button.innerText = "close";
  document.body.className += " pellowOpen";
}

function closeHome() {
  var iframe = document.getElementById("pellowHome");
  if (iframe) {
    document.documentElement.removeChild(iframe);
  }
  var button = document.getElementById("pellowHomeButton");
  button.innerText = "Home";
  document.body.className = document.body.className.replace(" pellowOpen", "");
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.requested == "createDiv") {
    //Code to create the div
    sendResponse({ confirmation: "Successfully created div" });
  }
});
if (!isIFrame) {
  createButton();
  // injectScript(chrome.extension.getURL("scripts/error_logging.js"), "head");
  injectStyle(chrome.extension.getURL("style/tabStyle.css"), "head");
}
