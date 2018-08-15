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
import { Prop } from '../../obs-prop';
import * as application from 'tns-core-modules/application';
import * as accelerometer from 'nativescript-accelerometer-advanced';

export class HelloWorldModel extends Observable {
  @Prop()
  public heartRate: string;
  @Prop()
  public accelerometer: string;
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

  public startAccelerometer() {
    accelerometer.startAccelerometerUpdates(
      data => {
        this.accelerometer = `X: ${data.x} - Y: ${data.y}`;

        console.log(
          `X: ${data.x} - Y: ${data.y} - Sensor Type: ${
            data.sensortype
          } - Time in milliseconds: ${data.timemilli}`
        );
      },
      { sensorDelay: 'normal' }
    );
  }

  public async onAlertTap() {
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

  public getHeartRateData() {
    try {
      console.log('getHeartRateData');
      const activity =
        application.android.startActivity ||
        application.android.foregroundActivity;
      if (!activity) {
        alert({
          message: 'Could not get the current Activity.',
          okButtonText: 'Okay'
        });
      }
      const mSensorManager = activity.getSystemService(
        android.content.Context.SENSOR_SERVICE
      );

      if (!mSensorManager) {
        alert({
          message: 'Could not initialize SensorManager.',
          okButtonText: 'Okay'
        });
      }

      const mHeartRateSensor = mSensorManager.getDefaultSensor(
        (android.hardware.Sensor as any).TYPE_HEART_RATE
      );
      console.log('mHeartRateSensor', mHeartRateSensor);

      const sensorListener = new android.hardware.SensorEventListener({
        onAccuracyChanged: (sensor, accuracy) => {},
        onSensorChanged: event => {
          console.log(`Sensor: ${event.sensor}`);
          console.log(`Timestamp: ${event.timestamp}`);
          console.log(`Values: ${event.values}`);
          this.heartRate = event.values[0].toString();
        }
      });

      console.log('sensorListener', sensorListener);

      mSensorManager.registerListener(
        sensorListener,
        mHeartRateSensor,
        android.hardware.SensorManager.SENSOR_DELAY_NORMAL
      );

      console.log('Registered heart rate sensor listener');
    } catch (error) {
      console.log(error);
    }
  }
}
