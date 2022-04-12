filters.capture = new Filter(
  "capture",
  `function capture(video) {
    const canvas = <span id="code_1">document.createElement("canvas")</span>;
    const context = <span id="code_2">canvas.getContext("2d")</span>;
    canvas.width = <span id="code_3">video.width</span>;
    canvas.height = <span id="code_4">video.height</span>;
    <span id="code_5">context.drawImage(video, 0, 0, video.width, video.height)</span>;
  
    return <span id="code_6">canvas.toDataURL("image/png")</span>;
}`,
  async function (o_pixels, pixels, adj) {
    const canvas = document.createElement("canvas");
    await wrapExp(
      "1",
      "assignment",
      'document.createElement("canvas")',
      document.createElement("canvas"),
      {
        canvas,
      }
    );
    const context = canvas.getContext("2d");
    await wrapExp(
      "2",
      "assignment",
      'canvas.getContext("2d")',
      canvas.getContext("2d"),
      {
        canvas,
        context,
      }
    );
    await wrapExp("3", "assignment", "video.width", 0, {
      canvas,
      context,
    });
    await wrapExp("4", "assignment", "video.height", 0, {
      canvas,
      context,
    });
    await wrapExp(
      "5",
      "assignment",
      "context.drawImage(video, 0, 0, video.width, video.height)",
      null,
      {
        canvas,
        context,
      }
    );

    return await wrapExp(
      "6",
      "assignment",
      'canvas.toDataURL("image/png")',
      canvas.toDataURL("image/png"),
      {
        canvas,
      }
    );
  },
  0,
  "6"
);
