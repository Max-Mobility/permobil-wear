export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}
export declare type SensorDelay = 'normal' | 'game' | 'ui' | 'fastest';
export interface AccelerometerOptions {
  sensorDelay?: SensorDelay;
}

declare function startAccelerometerUpdates(
  callback: (AccelerometerData) => void,
  options?: AccelerometerOptions
): void;

declare function stopAccelerometerUpdates(): void;
