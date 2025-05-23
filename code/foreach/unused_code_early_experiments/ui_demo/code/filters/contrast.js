filters.contrast = new Filter(
  "contrast",
  `function contrast (pixels, adj) {
    adj <span id="code_1">*= 255</span>;
    const d = <span id="code_2">pixels.data</span>;
    const factor = <span id="code_3">(259 * (adj + 255)) / (255 * (259 - adj))</span>;
    for (<span id="code_4">let i = 0</span>; <span id="code_5">i < d.length</span>; <span id="code_6">i += 4</span>) {
      d[i] = <span id="code_7">factor * (d[i] - 128) + 128</span>;
      d[i + 1] = <span id="code_8">factor * (d[i + 1] - 128) + 128</span>;
      d[i + 2] = <span id="code_9">factor * (d[i + 2] - 128) + 128</span>;
    }
    return pixels;
};`,
  async function (o_pixels, pixels, adj) {
    await wrapExp("1", "assignment", "*= 255", (adj *= 255), {
      adj,
    });
    let d = o_pixels.data;
    await wrapExp("2", "assignment", "pixels.data", o_pixels.data, {
      adj,
      d,
    });
    let factor = (259 * (adj + 255)) / (255 * (259 - adj));
    await wrapExp(
      "3",
      "assignment",
      "(259 * (adj + 255)) / (255 * (259 - adj))",
      (259 * (adj + 255)) / (255 * (259 - adj)),
      {
        adj,
        d,
        factor,
      }
    );
    for (
      let i = await wrapExp("4", "loop_init", "i = 0", 0, {
        adj,
        d,
        factor,
        i: 0,
      });
      await wrapExp("5", "loop_cond", "i < d.length", i < d.length, {
        adj,
        d,
        factor,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      });
      i = await wrapExp("6", "loop", "i += 4", i + 4, {
        adj,
        d,
        factor,
        i,
        "d.length": d.length,
        "d[i]": d[i],
        "d[i + 1]": d[i + 1],
        "d[i + 2]": d[i + 2],
      })
    ) {
      pixels.data[i + 3] = d[i + 3];
      pixels.data[i] = factor * (d[i] - 128) + 128;
      await wrapExp(
        "7",
        "assignment",
        "factor * (d[i] - 128) + 128",
        factor * (d[i] - 128) + 128,
        {
          adj,
          d,
          factor,
          i,
          "d.length": d.length,
          "d[i]": factor * (d[i] - 128) + 128,
          "d[i + 1]": d[i + 1],
          "d[i + 2]": d[i + 2],
        }
      );
      pixels.data[i + 1] = factor * (d[i + 1] - 128) + 128;
      await wrapExp(
        "8",
        "assignment",
        "factor * (d[i + 1] - 128) + 128",
        factor * (d[i + 1] - 128) + 128,
        {
          adj,
          d,
          factor,
          i,
          "d.length": d.length,
          "d[i]": factor * (d[i] - 128) + 128,
          "d[i + 1]": factor * (d[i + 1] - 128) + 128,
          "d[i + 2]": d[i + 2],
        }
      );
      pixels.data[i + 2] = factor * (d[i + 2] - 128) + 128;
      await wrapExp(
        "9",
        "assignment",
        "factor * (d[i + 2] - 128) + 128",
        factor * (d[i + 2] - 128) + 128,
        {
          adj,
          d,
          factor,
          i,
          "d.length": d.length,
          "d[i]": factor * (d[i] - 128) + 128,
          "d[i + 1]": factor * (d[i + 1] - 128) + 128,
          "d[i + 2]": factor * (d[i + 2] - 128) + 128,
        }
      );
    }
  },
  100,
  "<nb_pixel> * 5 + 3"
);
