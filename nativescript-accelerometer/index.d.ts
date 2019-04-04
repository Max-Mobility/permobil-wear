export interface AccelerometerData {
  data: {};
  sensor: string;
  date: number;
}
export declare type SensorDelay = 'normal' | 'game' | 'ui' | 'fastest';
export interface AccelerometerOptions {
  sensorDelay?: SensorDelay;
}
export declare enum SensorType {
  LINEAR_ACCELERATION = 'LINEAR_ACCELERATION',
  GRAVITY = 'GRAVITY',
  MAGNETIC_FIELD = 'MAGNETIC_FIELD',
  ROTATION_VECTOR = 'ROTATION_VECTOR',
  GYROSCOPE = 'GYROSCOPE',
  STATIONARY_DETECT = 'STATIONARY_DETECT',
  SIGNIFICANT_MOTION = 'SIGNIFICANT_MOTION'
}

export declare function startAccelerometerUpdates(
  callback: (AccelerometerData: AccelerometerData) => void,
  options?: AccelerometerOptions
): void;
export declare function stopAccelerometerUpdates(): void;
export declare function startTriggerSensor(): void;
export declare function stopTriggerSensor(): void;
export declare function getSensorList(): android.hardware.Sensor[];
export declare function getAltitude(pressure: any): number;
