let button;

window.addEventListener('load', function() {
    let color_mode = localStorage.getItem("color_mode");
    button = document.getElementById("color-mode-button");
    if (color_mode == "dark") {
        let element = document.body;
        element.classList.toggle("dark-mode");
        button.innerText = " ☼ ";
    } else {
        button.innerText = " ☽ ";
    }
});

function toggle_color_mode() {
    let element = document.body;
    element.classList.toggle("dark-mode");
    let color_mode = localStorage.getItem("color_mode");
    if (color_mode == "dark") {
        localStorage.setItem("color_mode", "light");
        button.innerText = " ☽ ";
    } else {
        localStorage.setItem("color_mode", "dark");
        button.innerText = " ☼ ";
    }
}