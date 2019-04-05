import { Injectable } from 'injection-js';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { device } from 'tns-core-modules/platform';
import {
  AccelerometerData,
  getSensorList
} from 'nativescript-accelerometer-advanced';
import * as app from 'tns-core-modules/application';
import { Log } from '../utils';

@Injectable()
export class SensorDataService {
  private _datastore = Kinvey.DataStore.collection<any>('WatchData');

  constructor() {
    Log.D('SensorDataService constructor...');
  }

  saveRecord(sensor_data: AccelerometerData[]) {
    const deviceSensors = getSensorList() as android.hardware.Sensor[];
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
}

interface WatchData {
  data: AccelerometerData[];
  uuid: string;
  manufacturer: string;
  model: string;
  osVersion: string;
  sdkVersion: string;
}
