export declare type SensorDelay = 'normal' | 'game' | 'ui' | 'fastest';
export interface AccelerometerData {
  data: {};
  sensor: string;
  date: number;
  timestamp: number;
}
export interface AccelerometerOptions {
  sensorDelay?: SensorDelay;
}
export declare enum SensorType {
  LINEAR_ACCELERATION = 'LINEAR_ACCELERATION',
  GRAVITY = 'GRAVITY',
  MAGNETIC_FIELD = 'MAGNETIC_FIELD',
  ROTATION_VECTOR = 'ROTATION_VECTOR',
  GAME_ROTATION_VECTOR = 'GAME_ROTATION_VECTOR',
  GYROSCOPE = 'GYROSCOPE',
  STATIONARY_DETECT = 'STATIONARY_DETECT',
  SIGNIFICANT_MOTION = 'SIGNIFICANT_MOTION'
}
