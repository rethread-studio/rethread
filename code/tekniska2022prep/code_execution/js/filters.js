async function saturation(pixels, adj) {
  let d = await wrapExp("1", "assignment", "pixels.data", pixels.data);
  adj = await wrapExp(
    "2",
    "assignment",
    "adj < -1 ? -1 : adj",
    adj < -1 ? -1 : adj
  );
  for (let i = 0; i < d.length; i += 4) {
    await wrapExp("3", "loop", "i", i);
    const r = await wrapExp("4", "assignment", "d[i]", d[i]);
    const g = await wrapExp("5", "assignment", "d[i + 1]", d[i + 1]);
    const b = await wrapExp("6", "assignment", "d[i + 2]", d[i + 2]);
    // weights from CCIR 601 spec
    const gray = await wrapExp(
      "7",
      "assignment",
      "0.2989 * r + 0.587 * g + 0.114 * b",
      0.2989 * r + 0.587 * g + 0.114 * b
    );
    d[i] = await wrapExp(
      "8",
      "assignment",
      "-gray * adj + d[i] * (1 + adj)",
      -gray * adj + d[i] * (1 + adj)
    );
    d[i + 1] = await wrapExp(
      "9",
      "assignment",
      "-gray * adj + d[i + 1] * (1 + adj)",
      -gray * adj + d[i + 1] * (1 + adj)
    );
    d[i + 2] = await wrapExp(
      "10",
      "assignment",
      "-gray * adj + d[i + 2] * (1 + adj)",
      -gray * adj + d[i + 2] * (1 + adj)
    );
  }
}
