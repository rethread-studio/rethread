filters.invert = new Filter(
  "invert",
  `function invert (pixels, adj) {
    const d = <span id="code_1">pixels.data</span>;
    for (<span id="code_2">let i = 0</span>; <span id="code_3">i < d.length</span>; <span id="code_4">i += 4</span>) {
      d[i] = <span id="code_5">255 - d[i]</span>;
      d[i + 1] = <span id="code_6">255 - d[i + 1]</span>;
      d[i + 2] = <span id="code_7">255 - d[i + 2]</span>;
    }
    return pixels;
};`,
  async function (pixels, index, adj) {
    const d = pixels.data;
    await wrapExp("1", "assignment", "pixels.data", pixels.data, {
      adj,
      d,
    });
    for (
      let i = await wrapExp("2", "loop_init", "i = 0", index, {
        adj,
        d,
        i: 0,
      });
      await wrapExp("3", "loop_cond", "i < d.length", i < d.length, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      });
      i = await wrapExp("4", "loop", "i += 4", i + 4, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      })
    ) {
      pixels.data[i + 3] = d[i + 3];

      pixels.data[i] = 255 - d[i];
      await wrapExp("5", "assignment", "\t255 - d[i]", 255 - d[i], {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": pixels.data[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      });

      pixels.data[i + 1] = 255 - d[i + 1];
      await wrapExp("6", "assignment", "\t255 - d[i + 1]", 255 - d[i + 1], {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": pixels.data[i],
        "d[i + 1]": pixels.data[i + 1],
        "d[i + 2]": d[i + 2],
      });
      pixels.data[i + 2] = 255 - d[i + 2];
      await wrapExp("7", "assignment", "\t255 - d[i + 2]", 255 - d[i + 2], {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": pixels.data[i],
        "d[i + 1]": pixels.data[i + 1],
        "d[i + 2]": pixels.data[i + 2],
      });
    }
  },
  null,
  "<nb_pixel> * 5 + 2"
);
