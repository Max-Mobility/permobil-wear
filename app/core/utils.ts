import { View } from 'tns-core-modules/ui/core/view';

export function timeToString(milliseconds: number): string {
  const t = new Date(null);
  t.setSeconds(milliseconds / 1000.0);
  return t.toISOString().substr(11, 8);
}

export function hideOffScreenLayout(
  view: View,
  position: { x: number; y: number }
) {
  if (view) {
    view.visibility = 'collapse';
    view.animate({
      target: view,
      duration: 300,
      translate: {
        x: position.x,
        y: position.y
      }
    });
  }
}

export function showOffScreenLayout(view: View) {
  if (view) {
    view.visibility = 'visible';
    view.animate({
      target: view,
      duration: 300,
      translate: {
        x: 0,
        y: 0
      }
    });
  }
}
