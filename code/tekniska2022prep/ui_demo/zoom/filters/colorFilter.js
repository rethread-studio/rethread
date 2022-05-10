filters.colorFilter = new Filter(
  "colorFilter",
  `function colorFilter (pixels, rgbColor) {
  	const d = <span id="code_1">pixels.data</span>;
		const adj = <span id="code_2">rgbColor[3]</span>;
		for (<span id="code_loop_init">let i = 0</span>; <span id="code_loop_cond">i < d.length</span>; <span id="code_loop_inc">i += 4</span>) {
			d[i] -= <span id="code_3">(d[i] - rgbColor[0]) * adj</span>;
			d[i + 1] -= <span id="code_4">(d[i + 1] - rgbColor[1]) * adj</span>;
			d[i + 2] -= <span id="code_5">(d[i + 2] - rgbColor[2]) * adj</span>;
		}
		return pixels;
};`,
  async function (pixels, index, rgbColor) {
    const d = pixels.data;
    await wrapExp("1", "assignment", "pixels.data", pixels.data, {
      rgbColor,
      d,
    });
    let adj = rgbColor[3];
    await wrapExp("2", "assignment", "rgbColor[3]", rgbColor[3], {
      rgbColor,
      d,
      adj,
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
      pixels.data[i + 3] = d[i + 3];
      d[i] -= (d[i] - rgbColor[0]) * adj;
      d[i + 1] -= (d[i + 1] - rgbColor[1]) * adj;
      d[i + 2] -= (d[i + 2] - rgbColor[2]) * adj;
    }
  },
  [125, 255, 43, 0.5],
  "<nb_pixel> * 5 + 3"
);
