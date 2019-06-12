import { Color } from 'tns-core-modules/color';
import {
  View,
  Style,
  InheritedCssProperty
} from 'tns-core-modules/ui/core/view';
export declare const rimColorProperty: InheritedCssProperty<Style, Color>;
export declare const barColorProperty: InheritedCssProperty<Style, Color>;
export declare class Common extends View {
  constructor();
}
declare module 'tns-core-modules/ui/styling/style' {
  interface Style {
    rimColor: Color;
    barColor: Color;
  }
}
