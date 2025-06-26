import { createStrategy, WaterfallLayoutType } from "./utils";
import type { WaterfallLayoutTypeValue } from "./utils";
import type { WaterfallOptions } from "waterfall";
export default class WaterfallLayout {
  public $options: WaterfallOptions<WaterfallLayoutTypeValue>;
  private strategy: any;
  constructor(options: WaterfallOptions<WaterfallLayoutTypeValue>) {
    this.$options = this.normalizeOptions(options);
  }
  static async create(options: WaterfallOptions<WaterfallLayoutTypeValue>): Promise<WaterfallLayout> {
    const instance = new WaterfallLayout(options);
    await instance.init();
    return instance;
  }
  async init() {
    const strategy = createStrategy(this.$options.type, this.$options) as any;
    this.strategy = strategy;
    if (this.$options.lazyLoad) {
      strategy.setupLazyLoad();
    } else {
      await strategy.collectImageData(this.$options.urls);
    }
    return this.strategy;
  }
  normalizeOptions(options: WaterfallOptions<WaterfallLayoutTypeValue>) {
    const defaultOptions = {
      type: WaterfallLayoutType.Ascending,
      gap: 10,
      toFixed: 2,
      containerWidth: 375,
      lazyLoad: false,
      count: null,
      step: 5,
    };
    return { ...defaultOptions, ...options };
  }
}
