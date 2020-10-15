// Saves options to chrome.storage
function save_options() {
  var cache = document.getElementById("cache").checked;
  var closeTabs = document.getElementById("close_tabs").checked;
  var reload = document.getElementById("reload").checked;
  const server = document.getElementById("server").value.trim();
  const port = document.getElementById("port").value.trim();
  chrome.storage.local.set(
    {
      server,
      port,
      cache,
      closeTabs,
      reload,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(function () {
        status.textContent = "";
      }, 750);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get(bcm_config, function (items) {
    document.getElementById("server").value = items.server;
    document.getElementById("port").value = items.port;
    document.getElementById("cache").value = items.cache;
    document.getElementById("close_tabs").checked = items.closeTabs;
    document.getElementById("reload").checked = items.reload;
  });
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
