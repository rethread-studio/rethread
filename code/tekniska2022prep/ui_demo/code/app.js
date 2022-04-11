function render() {
  const current = codeExecutor.getCurrent();
  codeExecutor.currentCxt().putImageData(codeExecutor.transformed_pixels, 0, 0);

  // progress
  const total = (codeExecutor.original_pixels.data.length / 4) * 9 + 3;
  document.querySelector("#progress .text").innerText = `${
    codeExecutor.stepNum
  }/${total} (${((codeExecutor.stepNum / total) * 100).toFixed()}%)`;
  document.querySelector("#progress .fill").style.width = `${(
    (codeExecutor.stepNum / total) *
    100
  ).toFixed()}%`;

  for (const e of document.getElementsByClassName("active")) {
    e.classList.remove("active");
  }

  if (current == null) return;

  const e = document.getElementById("code_" + current.id);
  e.setAttribute("value", current.value);
  e.className = "active";

  if (current.ctx.i != null) {
    const o_r = codeExecutor.original_pixels.data[current.ctx.i];
    const o_g = codeExecutor.original_pixels.data[current.ctx.i + 1];
    const o_b = codeExecutor.original_pixels.data[current.ctx.i + 2];
    document.getElementById(
      "original_pixel"
    ).style.backgroundColor = `rgb(${o_r}, ${o_g}, ${o_b})`;
    document.getElementById("o_r").innerText = o_r;
    document.getElementById("o_g").innerText = o_g;
    document.getElementById("o_b").innerText = o_b;

    const r = codeExecutor.transformed_pixels.data[current.ctx.i];
    const g = codeExecutor.transformed_pixels.data[current.ctx.i + 1];
    const b = codeExecutor.transformed_pixels.data[current.ctx.i + 2];
    document.getElementById(
      "transformed_pixel"
    ).style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    document.getElementById("t_r").innerText = r;
    document.getElementById("t_g").innerText = g;
    document.getElementById("t_b").innerText = b;
  }
}
