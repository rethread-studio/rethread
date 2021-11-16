async function getConfig() {
  return (
    await fetch("/api/config", {
      method: "get",
    })
  ).json();
}

async function getLaureate(id) {
  return (
    await fetch(game.config.serverURL + "api/laureates/" + id, {
      method: "get",
    })
  ).json();
}
