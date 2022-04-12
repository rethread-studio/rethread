filters.saturation = new Filter(
  "saturation",
  `function saturation(pixels, adj) {
  let d = <span id="code_1">pixels.data</span>;
  adj = <span id="code_2">adj < -1 ? -1 : adj</span>;
  for (<span id="code_11">let i = 0</span>; <span id="code_12">i < d.length</span>; <span id="code_3">i += 4</span>) {
    const r = <span id="code_4">d[i];</span>
    const g = <span id="code_5">d[i + 1];</span>
    const b = <span id="code_6">d[i + 2];</span>
    // weights from CCIR 601 spec
    const gray = <span id="code_7">0.2989 * r + 0.587 * g + 0.114 * b;</span>
    d[i] = <span id="code_8">-gray * adj + d[i] * (1 + adj);</span>
    d[i + 1] = <span id="code_9">-gray * adj + d[i + 1] * (1 + adj);</span>
    d[i + 2] = <span id="code_10">-gray * adj + d[i + 2] * (1 + adj);</span>
  }
}`,
  async function (o_pixels, pixels, adj) {
    let d = await wrapExp("1", "assignment", "pixels.data", o_pixels.data, {
      i: null,
      pixels,
      adj,
    });
    adj = await wrapExp(
      "2",
      "assignment",
      "adj < -1 ? -1 : adj",
      adj < -1 ? -1 : adj,
      {
        i: null,
        pixels,
        adj,
      }
    );
    for (
      let i = await wrapExp("11", "loop_init", "i = 0", 0, {
        i: null,
        pixels,
        adj,
      });
      await wrapExp("12", "loop_cond", "i < d.length", i < d.length, {
        i,
        pixels,
        adj,
      });
      i = await wrapExp("3", "loop", "i += 4", i + 4, {
        i,
        pixels,
        adj,
      })
    ) {
      pixels.data[i + 3] = d[i + 3];

      const r = d[i];
      await wrapExp("4", "assignment", "d[i]", d[i], {
        i,
        pixels,
        adj,
        r: null,
        g: null,
        b: null,
        gray: null,
      });
      const g = d[i + 1];
      await wrapExp("5", "assignment", "d[i + 1]", d[i + 1], {
        i,
        pixels,
        adj,
        r,
        g: null,
        b: null,
        gray: null,
      });
      const b = d[i + 2];
      await wrapExp("6", "assignment", "d[i + 2]", d[i + 2], {
        i,
        pixels,
        adj,
        r,
        g,
        b: null,
        gray: null,
      });
      // weights from CCIR 601 spec
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      await wrapExp(
        "7",
        "assignment",
        "0.2989 * r + 0.587 * g + 0.114 * b",
        0.2989 * r + 0.587 * g + 0.114 * b,
        {
          i,
          pixels,
          adj,
          r,
          g,
          b,
          gray: null,
        }
      );
      pixels.data[i] = -gray * adj + d[i] * (1 + adj);
      await wrapExp(
        "8",
        "output",
        "-gray * adj + d[i] * (1 + adj)",
        -gray * adj + d[i] * (1 + adj),
        {
          i,
          pixels,
          adj,
          r,
          g,
          b,
          gray,
        }
      );
      pixels.data[i + 1] = -gray * adj + d[i + 1] * (1 + adj);
      await wrapExp(
        "9",
        "output",
        "-gray * adj + d[i + 1] * (1 + adj)",
        -gray * adj + d[i + 1] * (1 + adj),
        {
          i,
          pixels,
          adj,
          r,
          g,
          b,
          gray,
        }
      );
      pixels.data[i + 2] = -gray * adj + d[i + 2] * (1 + adj);
      await wrapExp(
        "10",
        "output",
        "-gray * adj + d[i + 2] * (1 + adj)",
        -gray * adj + d[i + 2] * (1 + adj),
        {
          i,
          pixels,
          adj,
          r,
          g,
          b,
          gray,
        }
      );
    }
  },
  -1,
  "<nb_pixel> * 9 + 3"
);
