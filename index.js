// 优化版 Waterfall Layout 实现，支持懒加载配置（使用 IntersectionObserver）并支持 count 控制与详细信息返回
const WaterfallLayoutType = {
    Ascending: "ascending",
    EqualWidth: "equal-width",
    EqualWidthAscending: "equal-width-ascending",
  };
  
  export default class WaterfallLayout {
    constructor(options = {}) {
      this.$options = this.normalizeOptions(options);
      return this.init();
    }
  
    async init() {
      const strategy = createStrategy(this.$options.type, this.$options);
      const result = await strategy.collectImageData(this.$options.urls);
  
      const response = {
        rows: result,
        type: this.$options.type,
        detail: {
          rowCount: result.length,
          imageCount: result.flat().length,
          containerWidth: this.$options.containerWidth,
          gap: this.$options.gap,
          count: this.$options.count,
        },
      };
  
      if (this.$options.lazyLoad) {
        this.observeLazyTarget(() => this.$options.lazyLoadCallback?.(response));
      } else {
        this.$options.success?.(response);
      }
  
      return response;
    }
  
    normalizeOptions(options) {
      const defaultOptions = {
        type: WaterfallLayoutType.Ascending,
        gap: 10,
        toFixed: 2,
        containerWidth: 375,
        lazyLoad: false,
        count: null,
      };
      return { ...defaultOptions, ...options };
    }
  
    observeLazyTarget(callback) {
      const selector = this.$options.lazyLoad;
      let target;
  
      if (typeof selector === 'string') {
        target = document.querySelector(selector);
      } else if (selector === true) {
        target = document.documentElement;
      }
      console.log(target);
      if (!target) return;
  
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'width: 100%; height: 1px;';
      target.appendChild(sentinel);
  
      const observer = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          sentinel.remove();
          callback();
        }
      }, {
        root: selector === true ? null : target,
        threshold: 0.01,
      });
      console.log("sentinel appended", sentinel, "to", target);
      observer.observe(sentinel);
    }
  }
  
  class BaseStrategy {
    constructor(options) {
      this.options = options;
      this.sizeCache = new Map();
    }
  
    async getImageSize(url) {
      if (this.sizeCache.has(url)) return this.sizeCache.get(url);
      const size = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
        img.src = url;
      });
      this.sizeCache.set(url, size);
      return size;
    }
  
    toAbsoluteUrl(path) {
      try {
        return new URL(path).href;
      } catch {
        return new URL(path, window.location.href).href;
      }
    }
  
    async fetchImageSizes(urls, concurrency = 5) {
      const results = [];
      for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency).map(async (url, j) => {
          try {
            const absoluteUrl = this.toAbsoluteUrl(url);
            const size = await this.getImageSize(absoluteUrl);
            results.push({ index: i + j, url: absoluteUrl, ...size });
          } catch (e) {
            console.warn(e);
          }
        });
        await Promise.all(batch);
      }
      results.sort((a, b) => a.index - b.index);
      return results;
    }
  }
  
  class AscendingStrategy extends BaseStrategy {
    constructor(options) {
      super(options);
      this.rows = [];
      this.rowIndex = 0;
      this.clientWidth = options.containerWidth;
      this.gap = options.gap;
      this.count = options.count;
    }
  
    async collectImageData(urls) {
      const images = await this.fetchImageSizes(urls);
      const rowBuffer = [];
  
      if (this.count === 1) {
        const scaledRow = this.scaleToFit(images, this.clientWidth - (images.length - 1) * this.gap, 0);
        this.rows.push(scaledRow);
        return this.rows;
      }
  
      for (const item of images) {
        rowBuffer.push(item);
        const totalWidth = rowBuffer.reduce((sum, img) => sum + img.width, 0) + (rowBuffer.length - 1) * this.gap;
  
        if (totalWidth > this.clientWidth) {
          const scaledRow = this.scaleToFit(
            rowBuffer.slice(0, -1),
            this.clientWidth - (rowBuffer.length - 2) * this.gap,
            this.rowIndex++
          );
          this.rows.push(scaledRow);
          const last = rowBuffer.pop();
          rowBuffer.length = 0;
          rowBuffer.push(last);
        }
      }
  
      if (rowBuffer.length) {
        const scaledRow = this.scaleToFit(
          rowBuffer,
          this.clientWidth - (rowBuffer.length - 1) * this.gap,
          this.rowIndex++
        );
        this.rows.push(scaledRow);
      }
  
      return this.rows;
    }
  
    scaleToFit(arr, availableWidth, rowIndex) {
      if (arr.length === 1) {
        const scale = availableWidth / arr[0].width;
        return [
          {
            ...arr[0],
            rowIndex,
            scale,
            scaledWidth: arr[0].width * scale,
            scaledHeight: arr[0].height * scale,
          },
        ];
      }
  
      const totalRatio = arr.reduce((sum, item) => sum + item.width / item.height, 0);
      const targetHeight = availableWidth / totalRatio;
  
      return arr.map((item) => {
        const scale = targetHeight / item.height;
        return {
          ...item,
          scale,
          rowIndex,
          scaledWidth: item.width * scale,
          scaledHeight: targetHeight,
        };
      });
    }
  }
  
  class EqualWidthStrategy extends BaseStrategy {
    constructor(options) {
      super(options);
      this.rows = [];
      this.count = options.count || 3;
      this.rowIndex = 0;
    }
  
    async collectImageData(urls) {
      const images = await this.fetchImageSizes(urls);
      const rowBuffer = [];
  
      for (let i = 0; i < images.length; i++) {
        rowBuffer.push(images[i]);
  
        if ((i + 1) % this.count === 0) {
          const scaledRow = this.scaleToFit(rowBuffer, this.options.containerWidth - (this.count - 1) * this.options.gap, this.rowIndex++);
          this.rows.push(scaledRow);
          rowBuffer.length = 0;
        }
      }
  
      if (rowBuffer.length) {
        const scaledRow = this.scaleToFit(rowBuffer, this.options.containerWidth - (rowBuffer.length - 1) * this.options.gap, this.rowIndex++);
        this.rows.push(scaledRow);
      }
  
      return this.rows;
    }
  
    scaleToFit(arr, availableWidth, rowIndex) {
      const totalWidth = arr.reduce((sum, item) => sum + item.width, 0);
      const scale = availableWidth / totalWidth;
      return arr.map((item, columnIndex) => ({
        ...item,
        scale,
        rowIndex,
        columnIndex,
        scaledWidth: item.width * scale,
        scaledHeight: item.height * scale,
      }));
    }
  }
  
  class EqualWidthAscendingStrategy extends BaseStrategy {
    layout(items) {
      console.log("使用等宽登高瀑布流策略进行布局");
      // TODO: 实现等宽登高布局逻辑
    }
  
    async collectImageData(urls) {
      const images = await this.fetchImageSizes(urls);
      return [images];
    }
  }
  
  function createStrategy(type, options) {
    switch (type) {
      case WaterfallLayoutType.Ascending:
        return new AscendingStrategy(options);
      case WaterfallLayoutType.EqualWidth:
        return new EqualWidthStrategy(options);
      case WaterfallLayoutType.EqualWidthAscending:
        return new EqualWidthAscendingStrategy(options);
      default:
        throw new Error(`未知的瀑布流类型: ${type}`);
    }
  }
  