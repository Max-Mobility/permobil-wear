export interface AccelerometerData {
  data: {};
  sensor: string;
  date: number;
}

export type SensorDelay = 'normal' | 'game' | 'ui' | 'fastest';
export interface AccelerometerOptions {
  sensorDelay?: SensorDelay;
}

declare function startAccelerometerUpdates(
  callback: (AccelerometerData) => void,
  options?: AccelerometerOptions
): void;

declare function stopAccelerometerUpdates(): void;

export enum SensorType {
  LINEAR_ACCELERATION = 'LINEAR_ACCELERATION',
  GRAVITY = 'GRAVITY',
  MAGNETIC_FIELD = 'MAGNETIC_FIELD',
  ROTATION_VECTOR = 'ROTATION_VECTOR',
  GYROSCOPE = 'GYROSCOPE',
  STATIONARY_DETECT = 'STATIONARY_DETECT',
  SIGNIFICANT_MOTION = 'SIGNIFICANT_MOTION'
}
