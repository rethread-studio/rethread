filters.sepia = new Filter(
  "sepia",
  `function sepia (pixels, adj) {
    const d = <span id="code_1">pixels.data</span>;
    for (<span id="code_loop_init">let i = 0</span>; <span id="code_loop_cond">i < d.length</span>; <span id="code_loop_inc">i += 4</span>) {
      let r = <span id="code_2">d[i], g = d[i + 1], b = d[i + 2]</span>;
      d[i] = <span id="code_3">(r * (1 - (0.607 * adj))) + (g * .769 * adj) + (b * .189 * adj)</span>;
      d[i + 1] = <span id="code_4">(r * .349 * adj) + (g * (1 - (0.314 * adj))) + (b * .168 * adj)</span>;
      d[i + 2] = <span id="code_5">(r * .272 * adj) + (g * .534 * adj) + (b * (1 - (0.869 * adj)))</span>;
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
      let i = await wrapExp("loop_init", "loop_init", "i = 0", index, {
        adj,
        d,
        i: 0,
      });
      await wrapExp("loop_cond", "loop_cond", "i < d.length", i < d.length, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      });
      i = await wrapExp("loop_inc", "loop", "i += 4", i + 4, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      })
    ) {
      let r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      await wrapExp(
        "2",
        "assignment",
        "r = d[i], g = d[i + 1], b = d[i + 2]",
        null,
        {
          adj,
          d,
        }
      );
      pixels.data[i + 3] = d[i + 3];
      d[i] = r * (1 - 0.607 * adj) + g * 0.769 * adj + b * 0.189 * adj;
      await wrapExp(
        "3",
        "assignment",
        "r * (1 - 0.607 * adj) + g * 0.769 * adj + b * 0.189 * adj",
        r * (1 - 0.607 * adj) + g * 0.769 * adj + b * 0.189 * adj,
        {
          adj,
          d,
        }
      );
      d[i + 1] = r * 0.349 * adj + g * (1 - 0.314 * adj) + b * 0.168 * adj;
      await wrapExp(
        "4",
        "assignment",
        "r * 0.349 * adj + g * (1 - 0.314 * adj) + b * 0.168 * adj",
        r * 0.349 * adj + g * (1 - 0.314 * adj) + b * 0.168 * adj,
        {
          adj,
          d,
        }
      );
      d[i + 2] = r * 0.272 * adj + g * 0.534 * adj + b * (1 - 0.869 * adj);
      await wrapExp(
        "5",
        "assignment",
        "r * 0.272 * adj + g * 0.534 * adj + b * (1 - 0.869 * adj)",
        r * 0.272 * adj + g * 0.534 * adj + b * (1 - 0.869 * adj),
        {
          adj,
          d,
        }
      );
    }
  },
  1,
  "<nb_pixel> * 6 + 2"
);
