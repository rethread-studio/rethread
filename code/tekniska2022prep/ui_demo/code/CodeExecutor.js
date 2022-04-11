class CodeExecutor {
  stepNum = 0;
  original_pixels = null;
  canvas = {};
  contexts = {};

  current = null;
  jumpValue = 0;
  stopOnValue = "all";

  constructor(parentContainer, filters) {
    this.filters = filters;
    this.currentFilter = this.filters[0];

    function createCanvas(name) {
      const e = document.createElement("div");
      e.className = "col center";
      const canvas = document.createElement("canvas");
      canvas.className = "image";
      canvas.id = name;
      e.appendChild(canvas);
      return { parent: e, canvas };
    }

    parentContainer.style.width = 50 * (filters.length + 1) + "%";

    const o = createCanvas("original_image");
    parentContainer.appendChild(o.parent);
    o.parent.style.width = 100 / (filters.length + 1) + "%";

    this.canvas.original = o.canvas;
    this.contexts.original = o.canvas.getContext("2d");

    for (const i in filters) {
      const f = createCanvas("filter-" + i);
      parentContainer.appendChild(f.parent);
      f.parent.style.width = 100 / (filters.length + 1) + "%";

      this.canvas[filters[i].name] = f.canvas;
      this.contexts[filters[i].name] = f.canvas.getContext("2d");
    }

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
  }

  async setImage(imgPath) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        this.canvas.original.width = img.width;
        this.canvas.original.height = img.height;

        this.contexts.original.drawImage(img, 0, 0);

        for (const i in filters) {
          this.canvas[filters[i].name].width = img.width;
          this.canvas[filters[i].name].height = img.height;
        }

        resolve(img);
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

  getCurrent() {
    return this.current;
  }

  currentCxt() {
    return this.contexts[this.currentFilter.name];
  }

  runStep() {
    // execute code
    this.currentJumpValue = this.jumpValue;
    if (!this.current) return;
    this.current.resolve();
  }

  async runFilter() {
    console.log("Started filter", this.currentFilter.name);
    return new Promise((resolve) => {
      this.currentFilter
        .run(this.original_pixels, this.transformed_pixels)
        .then(
          () => {
            console.log("Finished filter", this.currentFilter.name);
            this.current = null;
            resolve();
          },
          (_) => {
            console.log("Stoped filter", this.currentFilter.name);
            resolve();
          }
        );
    });
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
}
