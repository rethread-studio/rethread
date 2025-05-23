class CodeExecutor {
  stepNum = 0;
  original_pixels = null;
  canvas = {};
  contexts = {};
  listeners = {};

  current = null;
  jumpValue = 0;
  stopOnValue = "all";

  constructor(parentContainer, filters) {
    this.filters = filters;
    this.currentFilter = null;

    function createCanvas(name) {
      const e = document.createElement("div");
      e.className = "col center";
      const canvas = document.createElement("canvas");
      canvas.className = "image";
      canvas.id = name;
      e.appendChild(canvas);
      return { parent: e, canvas };
    }

    const nbFilters = this.filters.length + 1;
    
    parentContainer.style.width = 50 * nbFilters + "%";

    // const h = createCanvas("hex_image");
    // parentContainer.appendChild(h.parent);
    // h.parent.style.width = 100 / nbFilters + "%";
    // h.canvas.width = 1200;
    // h.canvas.height = 900;
    // this.canvas.hex_image = h.canvas;
    // this.contexts.hex_image = h.canvas.getContext("2d");

    const o = createCanvas("original_image");
    o.canvas.width = 600;
    o.canvas.height = 450;
    parentContainer.appendChild(o.parent);
    o.parent.style.width = 100 / nbFilters + "%";

    this.canvas.original = o.canvas;
    this.contexts.original = o.canvas.getContext("2d");

    for (const i in this.filters) {
      const f = createCanvas("filter-" + i);
      f.canvas.width = 600;
      f.canvas.height = 450;
      parentContainer.appendChild(f.parent);
      f.parent.style.width = 100 / nbFilters + "%";

      this.canvas[this.filters[i].name] = f.canvas;
      this.contexts[this.filters[i].name] = f.canvas.getContext("2d");
    }
  }

  async setImage(imgPath) {
    if (imgPath instanceof Image) {
      const img = imgPath;
      this.canvas.original.width = img.width;
      this.canvas.original.height = img.height;

      this.contexts.original.drawImage(img, 0, 0);

      for (const i in this.filters) {
        this.canvas[this.filters[i].name].width = img.width;
        this.canvas[this.filters[i].name].height = img.height;
      }

      this._emit("image", img);
      return img;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        this.canvas.original.width = img.width;
        this.canvas.original.height = img.height;

        this.contexts.original.drawImage(img, 0, 0);

        for (const i in this.filters) {
          this.canvas[this.filters[i].name].width = img.width;
          this.canvas[this.filters[i].name].height = img.height;
        }

        resolve(img);
        this._emit("image", img);
      };
      img.onerror = reject;
      img.src = imgPath || "img/portrait.jpg";
    });
  }

  init() {
    console.log("Start execution");
    this.stepNum = 0;

    const index = this.filters.indexOf(this.currentFilter);

    let ctx = this.contexts.original;
    if (index > 0) {
      ctx = this.contexts[this.filters[index - 1].name];
    }

    this.original_pixels = ctx.getImageData(
      0,
      0,
      this.canvas.original.width,
      this.canvas.original.height
    );

    this.contexts[this.currentFilter.name].clearRect(
      0,
      0,
      this.canvas.original.width,
      this.canvas.original.height
    );

    this.transformed_pixels = this.contexts[
      this.currentFilter.name
    ].getImageData(
      0,
      0,
      this.canvas.original.width,
      this.canvas.original.height
    );
  }

  jump(nb) {
    this.jumpValue = nb;
    this.currentJumpValue = nb;
  }

  stopOn(type) {
    this.stopOnValue = type;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _emit(event, obj) {
    if (!this.listeners[event]) return;
    for (const i in this.listeners[event]) {
      setTimeout(() => this.listeners[event][i](obj), 0);
    }
  }

  getCurrent() {
    return this.current;
  }

  currentCxt() {
    if (!this.currentFilter) return null;
    return this.contexts[this.currentFilter.name];
  }

  currentCanvas() {
    if (!this.currentFilter) return null;
    return this.canvas[this.currentFilter.name];
  }

  previousCanvas() {
    const index = this.filters.indexOf(this.currentFilter);
    if (index > 0) {
      return this.canvas[this.filters[index - 1].name];
    }
    return this.canvas.original;
  }

  isRunning = false;

  runStep() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      // execute code
      this.currentJumpValue = this.jumpValue;
      if (!this.current) return;
      this.current.resolve();
    } finally {
      this.isRunning = false;
    }
  }

  stopFilter() {
    if (this.current) {
      this.current.reject();
      this.current = null;
      this.stepNum = 0;
    }
  }

  async runFilter(filter) {
    if (!filter) filter = this.currentFilter;

    window.wrapExp = async (id, type, code, value, ctx) => {
      if (
        (this.stopOnValue === "all" || this.stopOnValue === type) &&
        this.currentJumpValue <= 0
      ) {
        return new Promise((resolve, reject) => {
          this.current = {
            id,
            type,
            code,
            value,
            ctx,
            resolve: () => {
              this.stepNum++;
              resolve(value);
            },
            reject,
          };
          this._emit("step", filter);
        });
      }
      if (
        this.currentJumpValue > 0 &&
        (this.stopOnValue === "all" || this.stopOnValue === type)
      )
        this.currentJumpValue--;
      this.stepNum++;
      return value;
    };

    const p = new Promise((resolve) => {
      filter.run(this.original_pixels, this.transformed_pixels).then(
        () => {
          this._emit("filter_end", filter);
          console.log("Finished filter", filter.name);
          this.current = null;
          resolve();
        },
        (error) => {
          if (error) console.error(error);
          this._emit("filter_end", filter);
          console.log("Stoped filter", filter.name);
          resolve();
        }
      );
    });
    this._emit("filter_start", filter);
    console.log("Started filter", filter.name);
    return p;
  }

  nextFilter() {
    const index = this.filters.indexOf(this.currentFilter);
    if (index < this.filters.length - 1) {
      this.currentFilter = this.filters[index + 1];
    } else {
      this.currentFilter = null;
    }
    return this.currentFilter;
  }

  hasNextFilter() {
    const index = this.filters.indexOf(this.currentFilter);
    if (index < this.filters.length - 1) {
      return this.filters[index + 1];
    }
    return false;
  }
}
