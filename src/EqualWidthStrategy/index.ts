import BaseStrategy from "../BaseStrategy/index";
import type { WaterfallOptions } from "../typings";
export default class EqualWidthStrategy extends BaseStrategy {
  private rows: Array<any>;
  private count: number;
  private rowIndex: number;
  private buffer: Array<any>;
  constructor(options: WaterfallOptions) {
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
