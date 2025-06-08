export default class BaseStrategy {
  constructor(options) {
    this.options = options;
    this.sizeCache = new Map();
    this.lazyIndex = 0;
    this.totalLoaded = 0;
    this._scrollIndex = 0;
    this.container = null;
    this._initLazyContainer();
  }

  _initLazyContainer() {
    const target = this.options.lazyLoad;
    if (target) {
      this.container = typeof target === 'string' ? document.querySelector(target) : target;
    }
  }

  get scrollIndex() {
    return this._scrollIndex;
  }

  set scrollIndex(newVal) {
    this._scrollIndex = newVal;
    if (this._hasInitialLoaded) {
      this.loadUntilFilled?.();
    }
  }

  toAbsoluteUrl(path) {
    try {
      if (typeof path === "object") return path;
      return new URL(path).href;
    } catch {
      return new URL(path, window.location.href).href;
    }
  }

  async fetchImageSizes(urls) {
    const batch = Array.from({ length: urls.length }, (_, i) =>
      this.getImageSize(urls[i], i)
    );
    return Promise.all(batch);
  }

  getCacheKey(url) {
    if (typeof url === "string") return url;
    if (url && typeof url === "object") return `${url.width}x${url.height}`;
    throw new Error("Invalid URL or size object");
  }

  getCachedSize(url) {
    return this.sizeCache.get(this.getCacheKey(url));
  }

  setCachedSize(url, size) {
    this.sizeCache.set(this.getCacheKey(url), size);
  }

  async getImageSize(url) {
    const cached = this.getCachedSize(url);
    if (cached) return cached;
    if (typeof url === "object" && url.width && url.height) {
      this.setCachedSize(url, url);
      return url;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const size = { width: img.width, height: img.height, url };
        this.setCachedSize(size, size);
        resolve(size);
      };
      img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
      img.src = url;
    });
  }
}