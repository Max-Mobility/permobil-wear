import { Injectable } from 'injection-js';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { device } from 'tns-core-modules/platform';
import * as app from 'tns-core-modules/application';
import { Log } from '../utils';
import {
  AndroidSensors,
  SensorDelay,
  AndroidSensorListener
} from 'nativescript-android-sensors';
import { Observable, EventData } from 'tns-core-modules/data/observable';

@Injectable()
export class SensorService extends Observable {
  public static SensorChanged = 'SensorChanged';
  public static AccuracyChanged = 'AccuracyChanged';
  public androidSensorClass: AndroidSensors;
  public androidSensorListener;
  public registeredSensors: android.hardware.Sensor[];
  private _datastore: Kinvey.CacheStore;

  constructor() {
    super();

    Log.D('SensorService constructor...');
    // pass true for `liteData` for the sensor changed events
    // use false in the constructor to get the heavier JSON data structure
    this.androidSensorClass = new AndroidSensors(true);
    this.androidSensorListener = new AndroidSensorListener({
      onAccuracyChanged: (
        sensor: android.hardware.Sensor,
        accuracy: number
      ) => {
        const event: AccuracyChangedEventData = {
          eventName: SensorService.AccuracyChanged,
          object: this,
          data: {
            sensor,
            accuracy
          }
        };
        this.notify(event);
      },
      onSensorChanged: (result: string) => {
        const event: SensorChangedEventData = {
          eventName: SensorService.SensorChanged,
          object: this,
          data: JSON.parse(result) // parsing it here so it's JSON when observing the event
        };
        this.notify(event);
      }
    });

    // set the sensor listener
    this.androidSensorClass.setListener(this.androidSensorListener);
    // init the registered sensors array
    this.registeredSensors = [];
    // connect to the Kinvey WatchData collection
    this._datastore = Kinvey.DataStore.collection<any>('WatchData');
  }

  /**
   * Starts all of the device sensors for data collection.
   * @param delay [number | SensorDelay] - Default is GAME.
   */
  startDeviceSensors(
    delay = SensorDelay.GAME,
    maxReportingDelay: number = null
  ) {
    // linear_acceleration
    const accelerationSensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_LINEAR_ACCELERATION,
      delay,
      maxReportingDelay
    );
    if (accelerationSensor) this.registeredSensors.push(accelerationSensor);

    // gravity
    const gravitySensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_GRAVITY,
      delay,
      maxReportingDelay
    );
    if (gravitySensor) this.registeredSensors.push(gravitySensor);

    // magnetic
    const magneticSensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_MAGNETIC_FIELD,
      delay,
      maxReportingDelay
    );
    if (magneticSensor) this.registeredSensors.push(magneticSensor);

    // rotation_vector
    const rotationVectorSensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_ROTATION_VECTOR,
      delay,
      maxReportingDelay
    );
    if (rotationVectorSensor) this.registeredSensors.push(rotationVectorSensor);

    // game rotation_vector
    const gameRotationVector = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_GAME_ROTATION_VECTOR,
      delay,
      maxReportingDelay
    );
    if (gameRotationVector) this.registeredSensors.push(gameRotationVector);

    // gyroscope
    const gyroscopeSensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_GYROSCOPE,
      delay,
      maxReportingDelay
    );
    if (gyroscopeSensor) this.registeredSensors.push(gyroscopeSensor);

    // stationary detect
    const stationaryDetectSensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_STATIONARY_DETECT,
      delay,
      maxReportingDelay
    );
    if (stationaryDetectSensor)
      this.registeredSensors.push(stationaryDetectSensor);

    // significant motion
    const significantMotionSensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_SIGNIFICANT_MOTION,
      delay,
      maxReportingDelay
    );
    if (significantMotionSensor)
      this.registeredSensors.push(significantMotionSensor);

    // proximity
    const proximitySensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_PROXIMITY,
      delay,
      maxReportingDelay
    );
    if (proximitySensor) this.registeredSensors.push(proximitySensor);

    // off body
    const offbodySensor = this.androidSensorClass.startSensor(
      android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT,
      delay,
      maxReportingDelay
    );
    if (offbodySensor) this.registeredSensors.push(offbodySensor);
  }

  /**
   * Iterates all the sensors and unregisters them.
   */
  stopDeviceSensors() {
    this.registeredSensors.forEach(sensor => {
      this.androidSensorClass.stopSensor(sensor);
    });
  }

  /**
   * Saves a record to Kinvey with all of the sensor data and device information.
   * @param sensor_data [any[]] - An array of sensor data.
   */
  saveRecord(sensor_data: any[]) {
    const deviceSensors = this.androidSensorClass.getDeviceSensors();
    const sensor_list = [];

    deviceSensors.forEach(i => {
      if (i) {
        sensor_list.push({
          id: i.getId(),
          vendor: i.getVendor(),
          version: i.getVersion(),
          name: i.getName(),
          power: i.getPower(),
          type: i.getType(),
          string_type: i.getStringType(),
          max_range: i.getMaximumRange(),
          max_delay: i.getMaxDelay(),
          min_delay: i.getMinDelay(),
          resolution: i.getResolution(),
          reporting_mode: i.getReportingMode()
        });
      }
    });

    Log.D(`Saving data collection record for WatchData to Kinvey...`);
    // getting the UUID of the device here. We've seen some crashes with core-modules device.uuid not resolving the android app instance.
    const nApp = app.android.nativeApp as android.app.Application;
    const resolver = nApp.getContentResolver();
    const deviceUUID = android.provider.Settings.Secure.getString(
      resolver,
      android.provider.Settings.Secure.ANDROID_ID
    );

    const dbRecord = {
      sensor_data,
      sensor_list,
      device_uuid: deviceUUID,
      // device_uuid: device.uuid,
      device_manufacturer: device.manufacturer,
      device_model: device.model,
      device_os_version: device.osVersion,
      device_sdk_version: device.sdkVersion
    };

    // now save to kinvey data collection
    return this._datastore.save(dbRecord);
  }

  public flush() {
    this.androidSensorClass.flush();
  }
}

export interface AccuracyChangedEventData extends EventData {
  data: {
    sensor: android.hardware.Sensor;
    accuracy: number;
  };
}
export interface SensorChangedEventData extends EventData {
  data: SensorDataStructure;
}

export interface SensorDataStructure {
  /// LiteData Structure ---------------------------------------------------------------
  /**
   * The sensor int type, only valid using the LiteData option for AndroidSensors plugin.
   */
  s: number;

  /**
   * The sensor event time, only valid using the LiteData option for AndroidSensors plugin.
   */
  t: number;

  /**
   * The system time stamp, only valid using the LiteData option for AndroidSensors plugin.
   */
  ts: number;

  /**
   * The raw sensor data, only valid using the LiteData option for AndroidSensors plugin.
   */
  d: any;
  /// ---------------------------------------------------------------------------------

  /// Heavy Data, which is what will be used when you don't set the LiteData boolean on the constructor of the Android Sensors plugin.
  /**
   * The sensor string type, only valid when NOT using lite data option for AndroidSensors plugin.
   */
  sensor: string;

  /**
   * The sensor event timestamp, only valid when NOT using lite data option for AndroidSensors plugin.
   */
  time: number;

  /**
   * The system time, only valid when NOT using lite data option for AndroidSensors plugin.
   */
  timestamp: number;

  /**
   * The raw sensor data, only valid when NOT using lite data option for AndroidSensors plugin.
   */
  data: any;
}
