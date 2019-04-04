/// <reference path="node_modules/tns-platform-declarations/android-25.d.ts" />
import { AccelerometerOptions, AccelerometerData } from './base';
export declare function startAccelerometerUpdates(
  callback: (AccelerometerData: AccelerometerData) => void,
  options?: AccelerometerOptions
): void;
export declare function stopAccelerometerUpdates(): void;
export declare function startTriggerSensor(): void;
export declare function stopTriggerSensor(): void;
export declare function getSensorList(): android.hardware.Sensor[];
export declare function getAltitude(pressure: any): number;
