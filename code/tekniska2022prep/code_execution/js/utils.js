let current = null;
let jumpValue = 0;
let stopOnValue = "all";
stopOnValue = "loop";

function jump(nb) {
  jumpValue = nb;
}
function stopOn(type) {
  stopOnValue = type;
}

function getCurrent() {
  return current;
}
function step(display) {
  if (!current) return;

  current.resolve();

  if (display) {
    for (const e of document.getElementsByClassName("active")) {
      e.classList.remove("active");
    }
    const e = document.getElementById("code_" + current.id);
    e.setAttribute("value", current.value);
    e.className = "active";
  }
}

async function wrapExp(id, type, code, value, ctx) {
  stepNum++;
  if ((stopOnValue === "all" || stopOnValue === type) && jumpValue <= 0) {
    return new Promise((resolve, _) => {
      current = {
        id,
        type,
        code,
        value,
        ctx,
        resolve: () => {
          action = null;
          resolve(value);
        },
      };
    });
  }
  if (jumpValue > 0) jumpValue--;
  return value;
}
