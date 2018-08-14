import { Observable } from 'tns-core-modules/data/observable';
import * as HTTP from 'tns-core-modules/http';
import { alert } from 'tns-core-modules/ui/dialogs';
import { device, screen } from 'tns-core-modules/platform';
import {
  Bluetooth,
  BondState,
  Central,
  ConnectionState
} from 'nativescript-bluetooth';

export class HelloWorldModel extends Observable {
  private _data;
  private _bluetooth = new Bluetooth();

  constructor() {
    super();
    console.log('Device Type', device.deviceType);
    console.log(`Manufacturer: ${device.manufacturer}`);
    console.log(device.model);
    console.log(device.os);
    console.log(device.osVersion);
    console.log(device.sdkVersion);
    console.log(device.uuid);
    console.log(
      `Screen scale: ${screen.mainScreen.scale}, width: ${
        screen.mainScreen.widthDIPs
      }`
    );
    this._bluetooth
      .isBluetoothEnabled()
      .then(result => {
        console.log(result);
      })
      .catch(err => {
        console.log('error', err);
      });
  }

  public async onTap() {
    alert({
      message: 'Tap Away Kids',
      okButtonText: 'Okay'
    });
    // try {
    //   console.log('going to fetch remote data...');
    //   const result = await HTTP.getJSON(
    //     'https://storage.googleapis.com/59b74a76eff148919d9f10a7b3d5cfbb/14fa7599-5a7c-4a82-937c-9b1e53b3a0e7/en.json'
    //   );
    //   // console.log(result);
    // } catch (error) {
    //   alert({
    //     message: `Error getting json data ${error}`,
    //     okButtonText: 'Okay'
    //   });
    // }
  }
}
