import { Common } from './animated-circle.common';
import { Color } from 'tns-core-modules/color';
import { View } from 'tns-core-modules/ui/core/view';
export declare class AnimatedCircle extends Common {
  private _android;
  private _layout;
  private _androidViewId;
  private _childViews;
  private _progress;
  private _animateFrom;
  private _animationDuration;
  private _animated;
  private _maxValue;
  private _barColor;
  private _barWidth;
  private _rimColor;
  private _rimWidth;
  private _spinBarColor;
  private _startAngle;
  private _text;
  private _textColor;
  private _textSize;
  clockwise: boolean;
  fillColor: any;
  constructor();
  createNativeView(): globalAndroid.widget.RelativeLayout;
  initNativeView(): void;
  disposeNativeView(): void;
  onLoaded(): void;
  _addChildFromBuilder(name: string, value: View): void;
  readonly android: any;
  progress: number;
  animateFrom: number;
  animationDuration: number;
  animated: boolean;
  maxValue: number;
  rimColor: Color;
  barColor: Color;
  rimWidth: number;
  spinBarColor: any;
  startAngle: number;
  barWidth: number;
  text: string;
  textColor: string;
  textSize: number;
  private _updateAnimatedCircle;
}
