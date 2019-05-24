import { Common } from './animated-circle.common';
export declare class AnimatedCircle extends Common {
  private _ios;
  private _label;
  private _text;
  constructor();
  createNativeView(): any;
  initNativeView(): void;
  onLayout(left: any, top: any, right: any, bottom: any): void;
  readonly ios: any;
  progress: number;
  barColor: string | UIColor;
  rimColor: string | UIColor;
  clockwise: boolean;
  rimWidth: number;
  startAngle: number;
  endAngle: number;
  text: string;
  textColor: string | UIColor;
  textSize: number;
}
