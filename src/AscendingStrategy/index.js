import BaseStrategy from "../BaseStrategy/index";

export default class AscendingStrategy extends BaseStrategy {
  constructor(options) {
    super(options);
    this.rows = [];
    this.rowIndex = 0;
    this.clientWidth = options.containerWidth;
    this.gap = options.gap;
    this.count = options.count;
    this.rowBuffer = [];
    this.lazyCallback = options.lazyLoadCallback;
    this.step = options.step || 10;
    this.success=options.success;
    this._hasInitialLoaded = false;
    this._initialCallbackEmitted = false;
  }
  async collectImageData() {
    const urls = this.options.urls.map((url) => this.toAbsoluteUrl(url));
    const images = await this.fetchImageSizes(urls);
    console.log(images)
    this.insertImages(images);
    this.success && this.success(this.waterfallResult())
  }
  insertImages(images) {
    for (const img of images) {
      this.pushImage(img, img.url);
    }
    return this.rows;
  }
  async setupLazyLoad() {
    const urls = this.options.urls.map((url) => this.toAbsoluteUrl(url));
    let pendingRows = [];

    while (this.lazyIndex < urls.length) {
      const nextUrls = urls.slice(this.lazyIndex, this.lazyIndex + this.step);
      const data = await this.fetchImageSizes(nextUrls);
      this.lazyIndex += data.length;

      for (const img of data) {
        const item = { ...img, url: img.url || "" };
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
          pendingRows.push(scaledRow);

          const last = this.rowBuffer.pop();
          this.rowBuffer.length = 0;
          this.rowBuffer.push(last);
        }
      }

      if (pendingRows.length > 0) {
        pendingRows.forEach((row) => this.rows.push(row));
        pendingRows = [];
        await this._emitLazyCallback("initial");
      }

      if (this._checkFilled()) break;
    }

    this._hasInitialLoaded = true;
    this._bindScroll();
  }

  _checkFilled() {
    if (!this.container) return true;
    const containerHeight = this.container.clientHeight;
    let totalHeight = 0;
    for (const row of this.rows) {
      if (Array.isArray(row) && row.length > 0) {
        totalHeight += row[0].scaledHeight || 0;
      }
    }
    return totalHeight >= containerHeight;
  }

  _bindScroll() {
    this.container?.addEventListener("scroll", () => {
      if (!this._hasInitialLoaded) return;
      const { scrollTop, clientHeight, scrollHeight } = this.container;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        this.scrollIndex++;
      }
    });
  }

  async loadUntilFilled() {
    const { urls } = this.options;
    if (this.lazyIndex >= urls.length) return;
    const nextBatch = urls
      .slice(this.lazyIndex, this.lazyIndex + this.step)
      .map((url) => this.toAbsoluteUrl(url));
    const data = await this.fetchImageSizes(nextBatch);
    this.lazyIndex += data.length;

    for (const img of data) {
      this.pushImage(img, img.url || "");
    }

    await this._emitLazyCallback("scroll");
  }

  async _emitLazyCallback(from) {
    if (from === "initial" && this._initialCallbackEmitted) return;
    if (from === "initial") this._initialCallbackEmitted = true;
    this.lazyCallback?.(this.waterfallResult(form));
  }

  waterfallResult(form) {
    const detail = this.getDetail();
    return {
      rows: JSON.parse(JSON.stringify(this.rows)),
      type: this.options.type,
      detail,
      from: form || "initial",
      scrollRowIndex: this.rows.length - 1,
    };
  }

  append() {
    // 保留空实现，兼容性调用
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
      console.log(totalWidth,this.clientWidth)
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
    const validRows = this.rows.filter(
      (row) => Array.isArray(row) && row.length > 0
    );
    return {
      rows: validRows.length,
    };
  }
}
