import BaseStrategy from "../BaseStrategy/index";
export default class EqualWidthStrategy extends BaseStrategy {
    constructor(options) {
      super(options);
      this.rows = [];
      this.count = options.count || 3;
      this.rowIndex = 0;
      this.buffer = [];
    }
  
    getDetail() {
      return {
        totalRows: this.rows.length,
      };
    }
  }