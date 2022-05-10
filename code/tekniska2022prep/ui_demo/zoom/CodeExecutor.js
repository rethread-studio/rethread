class CodeExecutor {
  stepNum = 0;
  original_pixels = null;
  canvas = {};
  contexts = {};
  listeners = {};

  current = null;
  jumpValue = 0;
  currentJumpValue = 0;
  iterationIndex = 0;
  stopOnValue = "all";

  constructor() {
    this.currentFilter = null;
  }

  init() {
    console.log("Start execution");
    this.stepNum = 0;
    this.iterationIndex = 0;
    this.jump(0);
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

  async runFilter(filter, imageData) {
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
      filter.run(imageData, this.iterationIndex | 0).then(
        () => {
          console.log("Finished filter", filter.name);
          this.current = null;
          this.iterationIndex = 0;
          this._emit("filter_end", filter);
          resolve();
        },
        (error) => {
          if (error) console.error(error);
          this.current = null;
          this.iterationIndex = 0;
          this._emit("filter_end", filter);
          console.log("Stopped filter", filter.name);
          resolve();
        }
      );
    });
    return p;
  }
}
