const WaterfallLayoutType = {
  Ascending: "ascending", // 登高瀑布流
  EqualWidth: "equal-width", // 等宽瀑布流
  EqualWidthAscending: "equal-width-ascending", // 等宽登高
};
export default class WaterfallLayout {
  constructor(options = {}) {
    this.$options = this.normalizeOptions(options);
    return this.init();
  }
  async init() {
    const strategy = createStrategy(this.$options.type, this.$options);

    if (strategy instanceof AscendingStrategy) {
      // 等待图片加载完成 + 布局完成
      const result = await strategy.collectImageData(this.$options.urls);
      strategy.result = strategy.layout(result);
    }

    return {
      strategy,
    };
  }
  normalizeOptions(options) {
    return {
      type: WaterfallLayoutType.Ascending,
      gap: 10,
      toFixed: 2,
      containerWidth: 375,
      ...options,
    };
  }
}

// 每种策略都应实现这个接口
class BaseStrategy {
  constructor(options) {
    this.options = options;
  }
  getImageSize(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = (err) => {
        reject(new Error(`图片加载失败: ${url}`));
      };
      img.src = url;
    });
  }
}

class AscendingStrategy extends BaseStrategy {
  constructor(options) {
    super(options);
    this.result = [];
    this.rowIndex = 0;
    this.clientWidth = options.containerWidth;
    this.gap = options.gap;
    this._scaleToFit = null;
    this.finish = false;
    // if (options.urls.length) {
    //   this.collectImageData(options.urls).then((data) => {
    //     this.result = this.layout(data);
    //   });
    // }
  }
  async collectImageData(urls) {
    const iterator = urls[Symbol.iterator]();
    const rowBuffer = [];
    let index = 0;
    while (true) {
      const { value, done } = iterator.next();
      if (done) break;
      const url = this.toAbsoluteUrl(value);
      const { width, height } = await this.getImageSize(url);
      rowBuffer.push({ index, url, width, height });
      const totalWidth =
        rowBuffer.reduce((sum, img) => sum + img.width, 0) +
        (rowBuffer.length - 1) * this.gap;
      if (totalWidth > this.clientWidth) {
        const scaledRow = this.scaleToFit(
          rowBuffer.slice(0, -1), // 当前行，去掉最后一张
          this.clientWidth - (rowBuffer.length - 2) * this.gap,
          this.rowIndex
        );
        this.result.push(...scaledRow); // ⭐ 展平写入
        this.rowIndex++;
        const last = rowBuffer.pop(); // 留给下一行
        rowBuffer.length = 0;
        rowBuffer.push(last);
      }
      index++;
    }
    if (rowBuffer.length) {
      const scaledRow = this.scaleToFit(
        rowBuffer,
        this.clientWidth - (rowBuffer.length - 1) * this.gap,
        this.rowIndex
      );
      this.result.push(...scaledRow); // ⭐ 继续展平写入
    }
    return this.result;
  }

  toAbsoluteUrl(path) {
    try {
      const url = new URL(path);
      return url.href;
    } catch (e) {
      return new URL(path, window.location.href).href;
    }
  }
  scaleToFit(arr, remainingWidth, rowIndex) {
    if (arr.length === 1) {
      const scale = remainingWidth / arr[0].width;
      return [
        {
          ...arr[0],
          rowIndex,
          scaledWidth: arr[0].width * scale,
          scaledHeight: arr[0].height * scale,
          scale,
        },
      ];
    } else {
      const totalRatio = arr.reduce((sum, item) => {
        return sum + item.width / item.height;
      }, 0);
      const targetHeight = remainingWidth / totalRatio;
      const result = arr.map((item) => {
        const scale = targetHeight / item.height;
        return {
          ...item,
          scale,
          rowIndex,
          scaledWidth: item.width * scale,
          scaledHeight: targetHeight * 1,
        };
      });

      return result;
    }
  }
  layout(data) {
    const groupedMap = new Map();
    data.forEach((item) => {
      if (!groupedMap.has(item.rowIndex)) {
        groupedMap.set(item.rowIndex, []);
      }
      groupedMap.get(item.rowIndex).push(item);
    });
    const result = Array.from(groupedMap.values()).map((row) =>
      row.map((item, columnIndex) => ({
        ...item,
        columnIndex,
      }))
    );

    return result;
  }
}

class EqualWidthStrategy extends BaseStrategy {
  layout(items) {
    console.log("使用等宽瀑布流策略进行布局");
    // 实现：等宽顺序排布，自动换行
  }
}

class EqualWidthAscendingStrategy extends BaseStrategy {
  layout(items) {
    console.log("使用等宽登高瀑布流策略进行布局");
    // 实现：先计算列数，后进行登高布局
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
