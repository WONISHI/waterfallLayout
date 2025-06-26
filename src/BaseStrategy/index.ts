import type {
  WaterfallOptions,
  WaterfallSourceList,
  WaterfallSource,
  WaterfallItem,
} from "waterfall";
import type { WaterfallLayoutTypeValue } from "../utils";
export default class BaseStrategy {
  public options: WaterfallOptions<WaterfallLayoutTypeValue>;
  public lazyIndex: number;
  private totalLoaded: number;
  private _scrollIndex: number;
  public container: HTMLElement | null;
  private sizeCache: any;
  public _hasInitialLoaded: boolean = false;
  constructor(options: WaterfallOptions<WaterfallLayoutTypeValue>) {
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
    if (typeof target === "string") {
      this.container = document.querySelector(target);
    } else if (target instanceof HTMLElement) {
      this.container = target;
    } else if (target === true) {
      this.container = document.body; // 或指定默认容器
    } else {
      this.container = null;
    }
  }

  get scrollIndex() {
    return this._scrollIndex;
  }

  set scrollIndex(newVal) {
    this._scrollIndex = newVal;
    if (this._hasInitialLoaded) {
      (this as any).loadUntilFilled?.();
    }
  }

  toAbsoluteUrl(path: WaterfallSource) {
    try {
      if (typeof path === "object") return path;
      return new URL(path).href;
    } catch {
      return new URL(path as string, window.location.href).href;
    }
  }

  async fetchImageSizes(urls: WaterfallSourceList) {
    const batch = Array.from({ length: urls.length }, (_, i: number) =>
      this.getImageSize(urls[i])
    );
    return Promise.all(batch);
  }

  getCacheKey(url: WaterfallSource) {
    if (typeof url === "string") return url;
    if (url && typeof url === "object") return `${url.width}x${url.height}`;
    throw new Error("Invalid URL or size object");
  }

  getCachedSize(url: WaterfallSource) {
    return this.sizeCache.get(this.getCacheKey(url));
  }

  setCachedSize(url: WaterfallSource, size: WaterfallSource) {
    this.sizeCache.set(this.getCacheKey(url), size);
  }

  async getImageSize(url: WaterfallSource) {
    const cached = this.getCachedSize(url);
    if (cached) return cached;
    if (typeof url === "object" && url.width && url.height) {
      this.setCachedSize(url, url);
      return url;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const size: WaterfallItem | any = {
          width: img.width,
          height: img.height,
          url,
        };
        this.setCachedSize(size, size);
        resolve(size);
      };
      img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
      img.src = url as string;
    });
  }
}
