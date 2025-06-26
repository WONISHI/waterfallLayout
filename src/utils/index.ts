import AscendingStrategy from "../AscendingStrategy/index";
import EqualWidthStrategy from "../EqualWidthStrategy/index";
import EqualWidthAscendingStrategy from "../EqualWidthAscendingStrategy/index";
import type { WaterfallOptions } from "@/typings";
export const WaterfallLayoutType = {
  Ascending: "ascending",
  EqualWidth: "equal-width",
  EqualWidthAscending: "equal-width-ascending",
} as const;
export type WaterfallLayoutTypeValue =
  (typeof WaterfallLayoutType)[keyof typeof WaterfallLayoutType];
export function createStrategy(
  type: WaterfallLayoutTypeValue,
  options: WaterfallOptions<WaterfallLayoutTypeValue>
) {
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
