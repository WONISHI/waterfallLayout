import { createStrategy, WaterfallLayoutType } from "./utils/index";

export default class WaterfallLayout {
  constructor(options = {}) {
    this.$options = this.normalizeOptions(options);
    return this.init();
  }

  async init() {
    const strategy = createStrategy(this.$options.type, this.$options);
    this.strategy = strategy;
    if (this.$options.lazyLoad) {
      strategy.setupLazyLoad();
    } else {
      await strategy.collectImageData(this.$options.urls);
    }
    return this.strategy
  }
  normalizeOptions(options) {
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
