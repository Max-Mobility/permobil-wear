export type SensorDelay = 'normal' | 'game' | 'ui' | 'fastest';

export interface AccelerometerData {
  data: {};
  sensor: string;
  date: number;
  timestamp: number;
}

export interface AccelerometerOptions {
  sensorDelay?: SensorDelay;
}

export enum SensorType {
  LINEAR_ACCELERATION = 'LINEAR_ACCELERATION',
  GRAVITY = 'GRAVITY',
  MAGNETIC_FIELD = 'MAGNETIC_FIELD',
  ROTATION_VECTOR = 'ROTATION_VECTOR',
  GAME_ROTATION_VECTOR = 'GAME_ROTATION_VECTOR',
  GYROSCOPE = 'GYROSCOPE',
  HEART_RATE = 'HEART_RATE',
  STATIONARY_DETECT = 'STATIONARY_DETECT',
  SIGNIFICANT_MOTION = 'SIGNIFICANT_MOTION'
}

declare function startAccelerometerUpdates(
  callback: (AccelerometerData) => void,
  options?: AccelerometerOptions
): void;

declare function stopAccelerometerUpdates(): void;
