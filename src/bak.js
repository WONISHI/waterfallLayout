// 优化版 Waterfall Layout 实现，支持懒加载配置（使用 IntersectionObserver）并支持 count 控制
const WaterfallLayoutType = {
  Ascending: "ascending",
  EqualWidth: "equal-width",
  EqualWidthAscending: "equal-width-ascending",
};

export default class WaterfallLayout {
  constructor(options = {}) {
    this.$options = this.normalizeOptions(options);
    this.lazyIndex = 0;
    this.totalLoaded = 0;
    return this.init();
  }

  async init() {
    const strategy = createStrategy(this.$options.type, this.$options);
    this.strategy = strategy;

    if (this.$options.lazyLoad) {
      this.container =
        typeof this.$options.lazyLoad === "string"
          ? document.querySelector(this.$options.lazyLoad)
          : document.documentElement;
      this.$options.urls = this.$options.urls.map((url) =>
        this.strategy.toAbsoluteUrl(url)
      );
      this.setupLazyLoad();
    } else {
      const result = await strategy.collectImageData(this.$options.urls);
      const response = {
        rows: result,
        type: this.$options.type,
        detail: strategy.getDetail?.(),
      };
      this.$options.success?.(response);
      return response;
    }
  }

  normalizeOptions(options) {
    const defaultOptions = {
      type: WaterfallLayoutType.Ascending,
      gap: 10,
      toFixed: 2,
      containerWidth: 375,
      lazyLoad: false,
      count: null,
      step: 10,
    };
    return { ...defaultOptions, ...options };
  }

  setupLazyLoad() {
    const sentinel = document.createElement("div");
    sentinel.id = "__waterfall_trigger__";
    sentinel.style.cssText = "width: 100%; height: 1px;";
    this.container.appendChild(sentinel);
    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            await this.loadUntilFilled();
            observer.observe(entry.target);
          }
        }
      },
      {
        root:
          this.container === document.documentElement ? null : this.container,
        threshold: 0.01,
      }
    );

    this.loadUntilFilled().then(() => {
      observer.observe(sentinel);
    });
  }

  async loadUntilFilled() {
    const { urls, lazyLoadCallback, type } = this.$options;
    const container = this.container;
    const visibleHeight = container.clientHeight;
    let lastHeight = container.scrollHeight;

    while (
      this.lazyIndex < urls.length &&
      container.scrollHeight <= visibleHeight + 50
    ) {
      const batch = urls[this.lazyIndex];
      const imgData = await this.strategy.getImageSize(batch);
      this.strategy.pushImage(imgData, batch);
      this.lazyIndex++;

      const response = {
        rows: this.strategy.rows,
        type,
        detail: this.strategy.getDetail?.(),
      };
      lazyLoadCallback?.(response);
    }
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
    this.rowBuffer = [];
  }

  async collectImageData(urls) {
    const images = await this.fetchImageSizes(urls);
    return this.insertImages(images);
  }

  insertImages(images) {
    for (const img of images) {
      this.pushImage(img, img.url);
    }
    return this.rows;
  }

  pushImage(img, url) {
    const item = { ...img, url };

    if (this.count === 1 && this.rowIndex === 0) {
      const scaledRow = this.scaleToFit(
        [item],
        this.clientWidth,
        this.rowIndex++
      );
      this.rows.push(scaledRow);
      return;
    }

    this.rowBuffer.push(item);
    const totalWidth =
      this.rowBuffer.reduce((sum, i) => sum + i.width, 0) +
      (this.rowBuffer.length - 1) * this.gap;

    if (totalWidth > this.clientWidth) {
      const scaledRow = this.scaleToFit(
        this.rowBuffer.slice(0, -1),
        this.clientWidth - (this.rowBuffer.length - 2) * this.gap,
        this.rowIndex++
      );
      this.rows.push(scaledRow);
      const last = this.rowBuffer.pop();
      this.rowBuffer.length = 0;
      this.rowBuffer.push(last);
    }
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

    const totalRatio = arr.reduce(
      (sum, item) => sum + item.width / item.height,
      0
    );
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

  getDetail() {
    return {
      rows: this.rows.length,
    };
  }
}

class EqualWidthStrategy extends BaseStrategy {
  constructor(options) {
    super(options);
    this.rows = [];
    this.count = options.count || 3;
    this.rowIndex = 0;
    this.buffer = [];
  }

  async collectImageData(urls) {
    const images = await this.fetchImageSizes(urls);
    return this.insertImages(images);
  }

  insertImages(images) {
    for (const img of images) {
      this.pushImage(img, img.url);
    }
    return this.rows;
  }

  pushImage(img, url) {
    const item = { ...img, url };
    this.buffer.push(item);

    if (this.buffer.length === this.count) {
      const scaledRow = this.scaleToFit(
        this.buffer,
        this.options.containerWidth - (this.count - 1) * this.options.gap,
        this.rowIndex++
      );
      this.rows.push(scaledRow);
      this.buffer.length = 0;
    }
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

  getDetail() {
    return {
      totalRows: this.rows.length,
    };
  }
}

class EqualWidthAscendingStrategy extends BaseStrategy {
  layout(items) {
    console.log("使用等宽登高瀑布流策略进行布局");
  }

  async collectImageData(urls) {
    const images = await this.fetchImageSizes(urls);
    return [images];
  }
}


