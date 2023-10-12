window.addEventListener('load', function() {
    let mode = localStorage.getItem("mode");
    if (mode == "dark") {
        let element = document.body;
        element.classList.toggle("dark-mode");
    }
});

function toggle_dark_mode() {
    let element = document.body;
    element.classList.toggle("dark-mode");
    let mode = localStorage.getItem("mode");
    if (mode == "dark") localStorage.setItem("mode", "light");
    else localStorage.setItem("mode", "dark");
}