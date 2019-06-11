import { ContentView } from 'tns-core-modules/ui/content-view';
import { View, Style, CssProperty } from 'tns-core-modules/ui/core/view';

export const rimColorProperty = new CssProperty<Style, string>({
  name: 'rimColor',
  cssName: 'rim-color',
  defaultValue: 'gray',
  valueConverter: v => {
    return v;
  }
});
export const barColorProperty = new CssProperty<Style, string>({
  name: 'barColor',
  cssName: 'bar-color',
  defaultValue: 'blue',
  valueConverter: v => {
    return v;
  }
});
export class Common extends View {
  constructor() {
    super();
  }

  get rimColor(): string {
    return this.style.rimColor;
  }
  set rimColor(value: string) {
    this.style.rimColor = value;
  }
  get barColor(): string {
    return this.style.barColor;
  }
  set barColor(value: string) {
    this.style.barColor = value;
  }
}
declare module 'tns-core-modules/ui/styling/style' {
  interface Style {
    rimColor: string;
    barColor: string;
  }
}

rimColorProperty.register(Style);
barColorProperty.register(Style);
