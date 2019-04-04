import { Injectable } from 'injection-js';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { device, Device } from 'tns-core-modules/platform';
import { Log } from '../utils';

@Injectable()
export class SensorDataService {
  private _datastore = Kinvey.DataStore.collection<any>('WatchData');

  constructor() {
    Log.D('SensorDataService constructor...');
  }

  async saveRecord(record: WatchSensorData) {
    // make sure the record has sensor data and sensor type
    if (!record.data || !record.sensor) {
      Log.D(`No data or sensor for the record ${record}`);
      return;
    }
    (record.uuid = device.uuid),
      (record.manufacturer = device.manufacturer),
      (record.model = device.model),
      (record.osVersion = device.osVersion),
      (record.sdkVersion = device.sdkVersion),
      await this._datastore.save(record);
  }
}

interface WatchSensorData extends Device {
  data: {};
  sensor: string;
  time: number;
}
