class Filter {
  constructor(name, sourceCode, code, adj) {
    this.name = name;
    this.sourceCode = sourceCode;
    this.code = code;
    this.adj = adj;
  }

  async run(originalPixels, transformedPixels) {
    return this.code(originalPixels, transformedPixels, this.adj);
  }
}

const filters = {};
