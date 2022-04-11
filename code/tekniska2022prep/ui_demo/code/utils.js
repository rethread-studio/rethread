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
function step() {
  if (!current) return;
  current.resolve();
}

async function wrapExp(id, type, code, value, ctx) {
  if ((stopOnValue === "all" || stopOnValue === type) && jumpValue <= 0) {
    return new Promise((resolve, reject) => {
      current = {
        id,
        type,
        code,
        value,
        ctx,
        resolve: () => {
          action = null;
          stepNum++;
          resolve(value);
        },
        reject
      };
    });
  }
  if (jumpValue > 0 && (stopOnValue === "all" || stopOnValue === type))
    jumpValue--;
  stepNum++;
  return value;
}
