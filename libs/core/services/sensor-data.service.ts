/// <reference path="../node_modules/tns-platform-declarations/android-26.d.ts" />

import { Injectable } from 'injection-js';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { device } from 'tns-core-modules/platform';
import {
  AccelerometerData,
  getSensorList
} from 'nativescript-accelerometer-advanced';
import { Log } from '../utils';

@Injectable()
export class SensorDataService {
  private _datastore = Kinvey.DataStore.collection<any>('WatchData');

  constructor() {
    Log.D('SensorDataService constructor...');
  }

  async saveRecord(sensor_data: AccelerometerData[]) {
    try {
      const deviceSensors = getSensorList() as android.hardware.Sensor[];
      const sensor_list = [];
      deviceSensors.forEach(i => {
        sensor_list.push({
          id: i.getId(),
          vendor: i.getVendor(),
          version: i.getVersion(),
          name: i.getName(),
          power: i.getPower()
        });
      });
      Log.D(`Saving data collection record for WatchData to Kinvey...`);
      const dbRecord = {
        sensor_data,
        sensor_list,
        device_uuid: device.uuid,
        device_manufacturer: device.manufacturer,
        device_model: device.model,
        device_os_version: device.osVersion,
        device_sdk_version: device.sdkVersion
      };
      await this._datastore.save(dbRecord);
      Log.D('WatchData record saved on Kinvey.');
    } catch (error) {
      Log.E(error);
    }
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
