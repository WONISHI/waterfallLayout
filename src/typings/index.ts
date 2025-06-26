import type { WaterfallLayoutType } from "../utils";
export type WaterfallLayoutTypeValue =
  (typeof WaterfallLayoutType)[keyof typeof WaterfallLayoutType];
export interface WaterfallItem {
  width: number;
  height: number;
  url?: string; // 运行时用的别名，可选
  scaledWidth?: number;
  scaledHeight?: number;
  scale?: number;
  rowIndex?: number;
  src?: string;
  [key: string]: any;
}
export type WaterfallDetailType = "scroll" | "initial";
export type WaterfallSource = string | WaterfallItem;
export type WaterfallSourceList = Array<WaterfallSource>;
export interface WaterfallOptions {
  urls: WaterfallSourceList;
  type: WaterfallLayoutTypeValue;
  gap?: number;
  toFixed?: number;
  containerWidth: number;
  lazyLoad?: boolean | string | HTMLElement;
  count?: null | number;
  step?: number;
  success?: (data: any) => void;
  lazyLoadCallback?: (data: any) => void;
}
