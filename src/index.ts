import { createStrategy, WaterfallLayoutType } from "./utils";
import type { WaterfallOptions } from "./typings";
export default class WaterfallLayout {
  public $options: WaterfallOptions;
  private strategy: any;
  constructor(options: WaterfallOptions) {
    this.$options = this.normalizeOptions(options);
  }
  static async create(options: WaterfallOptions): Promise<WaterfallLayout> {
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
  normalizeOptions(options: WaterfallOptions) {
    const defaultOptions = {
      type: WaterfallLayoutType.Ascending,
      gap: 10,
      toFixed: 2,
      containerWidth: 375,
      lazyLoad: false,
      count: null,
      step: 5,
    };
    return Object.freeze({ ...defaultOptions, ...options });
  }
}
