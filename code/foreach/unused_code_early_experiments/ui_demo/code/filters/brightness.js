filters.brightness = new Filter(
  "brightness",
  `function brightness (pixels, adj) {
    const d = <span id="code_1">pixels.data</span>;
    adj = <span id="code_2">(adj > 1) ? 1 : adj</span>;
    adj = <span id="code_3">(adj < -1) ? -1 : adj</span>;
    adj = <span id="code_4">~~(255 * adj)</span>;
    for (<span id="code_5">let i = 0</span>; <span id="code_6">i < d.length</span>; <span id="code_7">i += 4</span>) {
      d[i] <span id="code_8">+= adj</span>;
      d[i + 1] <span id="code_9">+= adj</span>;
      d[i + 2] <span id="code_10">+= adj</span>;
    }
    return pixels;
};`,
  async function (o_pixels, pixels, adj) {
    const d = o_pixels.data;
    await wrapExp("1", "assignment", "pixels.data", o_pixels.data, {
      adj,
      d,
    });
    adj = await wrapExp("2", "assignment", "pixels.data", adj > 1 ? 1 : adj, {
      adj,
      d,
    });
    adj = await wrapExp("3", "assignment", "pixels.data", adj < -1 ? -1 : adj, {
      adj,
      d,
    });
    adj = await wrapExp("4", "assignment", "pixels.data", ~~(255 * adj), {
      adj,
      d,
    });
    for (
      let i = await wrapExp("5", "loop_init", "i = 0", 0, {
        adj,
        d,
        i: 0,
      });
      await wrapExp("6", "loop_cond", "i < d.length", i < d.length, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      });
      i = await wrapExp("7", "loop", "i += 4", i + 4, {
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
      pixels.data[i] = d[i] + adj;
      await wrapExp("8", "assignment", "adj", d[i] + adj, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": pixels.data[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      });
      pixels.data[i + 1] = d[i + 1] + adj;
      await wrapExp("9", "assignment", "adj", d[i + 1] + adj, {
        adj,
        d,
        i,
        "d.length": d.length,
        "d[i]": pixels.data[i],
        "d[i + 1]": pixels.data[i + 1],
        "d[i + 2]": d[i + 2],
      });
      pixels.data[i + 2] = d[i + 2] + adj;
      await wrapExp("10", "assignment", "adj", d[i + 2] + adj, {
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
  0.2,
  "<nb_pixel> * 5 + 5"
);
