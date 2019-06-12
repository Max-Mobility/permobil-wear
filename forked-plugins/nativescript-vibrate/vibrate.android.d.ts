import { Common } from './vibrate.common';
export declare class Vibrate extends Common {
  constructor();
  hasVibrator(): boolean;
  hasAmplitudeControl(): boolean;
  vibrate(
    param?: number | number[],
    repeat?: number,
    amplitude?: number | number[]
  ): void;
  cancel(): void;
}
