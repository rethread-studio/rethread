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

function createButton(id, text, onclick) {
  var button = document.createElement("div");
  button.id = id;
  button.innerText = text;
  button.onclick = onclick;
  document.body.appendChild(button);
}
function displayLegend() {
  closeHome();
  var iframe = document.createElement("iframe");
  iframe.id = "pellowLegend";
  iframe.src = chrome.extension.getURL("legend.html");
  document.body.appendChild(iframe);

  var button = document.getElementById("pellowLegendButton");
  button.innerText = "close";
  document.body.className += " pellowOpen";
}

function closeLegend() {
  var iframe = document.getElementById("pellowLegend");
  if (iframe) {
    document.body.removeChild(iframe);
    var button = document.getElementById("pellowLegendButton");
    button.innerText = "Legend";
    document.body.className = document.body.className.replace(
      " pellowOpen",
      ""
    );
  }
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

var initTimeout = null;
function init() {
  clearTimeout(initTimeout);
  injectStyle(chrome.extension.getURL("style/tabStyle.css"), "head");
  createButton("pellowHomeButton", "Home", function (event) {
    event.preventDefault();
    var iframe = document.getElementById("pellowHome");
    if (iframe) {
      closeHome();
    } else {
      displayHome();
    }
    return false;
  });
  createButton("pellowLegendButton", "Legend", function (event) {
    event.preventDefault();
    var iframe = document.getElementById("pellowLegend");
    if (iframe) {
      closeLegend();
    } else {
      displayLegend();
    }
    return false;
  });
}
if (!isIFrame) {
  window.addEventListener("DOMContentLoaded", init);
  initTimeout = setTimeout(init, 2000);

  function action() {
    chrome.runtime.sendMessage({ type: "action" }, function () {});
  }
  window.addEventListener("click", action);
  window.addEventListener("touchstart", action);
  window.addEventListener("scroll", action);
  window.addEventListener("mousemove", action);
  window.addEventListener("keydown", action);
}
