import BaseStrategy from "../BaseStrategy/index";
export default class EqualWidthAscendingStrategy extends BaseStrategy {
    layout(items:any) {
      console.log("使用等宽登高瀑布流策略进行布局");
    }
  
    async collectImageData(urls:any[]) {

    }
  }