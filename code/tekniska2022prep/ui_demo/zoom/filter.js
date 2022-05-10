class Filter {
  constructor(name, sourceCode, code, adj, nbStepStr) {
    this.name = name;
    this.sourceCode = sourceCode;
    this.code = code;
    this.adj = adj;
    this.nbStepStr = nbStepStr;
  }

  async run(originalPixels, transformedPixels) {
    return this.code(originalPixels, transformedPixels, this.adj);
  }
}

const filters = {};
