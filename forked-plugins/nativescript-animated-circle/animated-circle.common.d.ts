import { View, Style, CssProperty } from 'tns-core-modules/ui/core/view';
export declare const rimColorProperty: CssProperty<Style, string>;
export declare const barColorProperty: CssProperty<Style, string>;
export declare class Common extends View {
  constructor();
  rimColor: string;
  barColor: string;
}
declare module 'tns-core-modules/ui/styling/style' {
  interface Style {
    rimColor: string;
    barColor: string;
  }
}
