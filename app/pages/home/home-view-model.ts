/// <reference path="../../../node_modules/tns-platform-declarations/android.d.ts" />

import {
  Observable,
  PropertyChangeData
} from 'tns-core-modules/data/observable';
import { alert, action } from 'tns-core-modules/ui/dialogs';
import { device, screen } from 'tns-core-modules/platform';
// import { Bluetooth } from 'nativescript-bluetooth';
import { Prop } from '../../obs-prop';
import * as application from 'tns-core-modules/application';
import * as accelerometer from 'nativescript-accelerometer-advanced';
import { Toasty } from 'nativescript-toasty';
import { topmost, Page } from 'tns-core-modules/ui/frame';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import * as permissions from 'nativescript-permissions';
import { LottieView } from 'nativescript-lottie';
import { Bluetooth } from 'nativescript-bluetooth';
import { BluetoothService } from '../../services';
import * as complications from '../../complications';
import { Packet, SmartDrive, BlueFruit } from '../../core';

import * as appSettings from 'tns-core-modules/application-settings';
import { StartScanningOptions } from 'nativescript-bluetooth/common';

const THRESHOLD = 0.5; // change this threshold as you want, higher is more spike movement

export class HelloWorldModel extends Observable {
  /**
   * The heart rate data to render.
   */
  @Prop()
  heartRate: string;

  /**
   * The label text to display accelerometer data.
   */
  @Prop()
  accelerometerData: string;

  /**
   * Button text for starting/stopping accelerometer.
   */
  @Prop()
  accelerometerBtnText = 'Accelerometer';

  /**
   * Boolean to toggle when motion event detected to show animation in UI.
   */
  @Prop()
  motionDetected = false;

  /**
   * Boolean to track if heart rate is being monitored.
   */
  @Prop()
  public isGettingHeartRate = false;

  /**
   * Boolean to handle logic if we have connected to a SD unit.
   */
  @Prop()
  public connected = false;

  @Prop()
  public rColor = '00';
  @Prop()
  public gColor = '00';
  @Prop()
  public bColor = '00';
  @Prop()
  public hexValue: '#000000';

  /**
   * Boolean to track if accelerometer is already registered listener events.
   */
  private _isListeningAccelerometer = false;
  private _heartrateListener;
  private _page: Page;
  private _smartDrive: SmartDrive;
  private _motionDetectedLottie: LottieView;
  private _heartRateLottie: LottieView;
  private _bluetoothService: BluetoothService;
  private _colorLayout: StackLayout;
  private _bluetooth: Bluetooth;

  constructor(page: Page) {
    super();
    this._page = page;

    this._colorLayout = page.getViewById('colorLayout') as StackLayout;
    this._bluetoothService = new BluetoothService();
    this._bluetooth = new Bluetooth();

    console.log(
      { device },
      'Device Info: ',
      device.manufacturer,
      device.model,
      device.os,
      device.osVersion,
      device.sdkVersion,
      device.region,
      device.language,
      device.uuid
    );

    this.on(Observable.propertyChangeEvent, (args: PropertyChangeData) => {
      // Do your magic here
      console.log('propertyName', args.propertyName, 'value : ' + args.value);
      const hexColor = this._setColor(this.rColor, this.gColor, this.bColor);
      this._colorLayout.backgroundColor = hexColor;
    });
  }

  scanForBluefruit() {
    console.log('scan for bluefruits');
    // const scanOpts: StartScanningOptions = {
    //   serviceUUIDs: [BlueFruit.UART_Service],
    //   seconds: 10,
    //   onDiscovered: peripheral => {
    //     console.log('Periperhal found with UUID: ' + peripheral.UUID);
    //     if (peripheral.name.includes('Bluefruit')) {
    //       alert('BLUEFRUIT FOUND 🧟‍♂️');
    //     }

    //     if (BlueFruit.isBlueFruitDevice(peripheral)) {
    //       console.log('*** found the bluefruit device ***');
    //       console.dir(peripheral);
    //     }
    //   }
    // };

    this._bluetoothService
      .scan([], 5)
      .then(result => {
        console.log('scan reslt', result);
      })
      .catch(error => {
        console.log('scan error', error);
      });

    // this._bluetooth.startScanning(scanOpts).then(
    //   () => {
    //     console.log('scanning complete');
    //   },
    //   err => {
    //     console.log('error while scanning: ' + err);
    //   }
    // );
  }

  motionDetectedLoaded(args) {
    this._motionDetectedLottie = args.object;
  }

  heartRateLoaded(args) {
    this._heartRateLottie = args.object;
  }

  toggleAccelerometer() {
    // if already listening stop and reset isListening boolean
    if (this._isListeningAccelerometer === true) {
      accelerometer.stopAccelerometerUpdates();
      this._isListeningAccelerometer = false;
      this.accelerometerBtnText = 'Accelerometer';
      this.accelerometerData = '';
      return;
    }

    accelerometer.startAccelerometerUpdates(
      accelerometerdata => {
        // only showing linear acceleration data for now
        if (
          accelerometerdata.sensortype ===
          android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
        ) {
          // console.log({ accelerometerdata });
          const x = this._trimAccelerometerData(accelerometerdata.x);
          const y = this._trimAccelerometerData(accelerometerdata.y);
          const z = this._trimAccelerometerData(accelerometerdata.z);

          let diff = Math.sqrt(
            accelerometerdata.x * accelerometerdata.x +
              accelerometerdata.y * accelerometerdata.y +
              accelerometerdata.z * accelerometerdata.z
          );
          diff = Math.abs(accelerometerdata.z);

          if (diff > THRESHOLD) {
            if (this._smartDrive && this._smartDrive.ableToSend) {
              console.log('Sending tap!');
              this._smartDrive
                .sendTap()
                .catch(err => console.log('could not send tap', err));
            }
            this.accelerometerData = `Motion detected ${diff
              .toString()
              .substring(0, 8)}`;
            console.log('Motion detected!', { diff });
            this.motionDetected = true;
            this._motionDetectedLottie.playAnimation();
            setTimeout(() => {
              this.motionDetected = false;
              this._motionDetectedLottie.cancelAnimation();
            }, 600);
          }
        }
      },
      { sensorDelay: 'game' }
    );

    // set true so next tap doesn't try to register the listeners again
    this._isListeningAccelerometer = true;
    this.accelerometerBtnText = 'Stop Accelerometer';
  }

  async onDistance(args: any) {
    // save the updated distance
    appSettings.setNumber('sd.distance.case', this._smartDrive.coastDistance);
    appSettings.setNumber('sd.distance.drive', this._smartDrive.driveDistance);
  }

  async onSmartDriveVersion(args: any) {
    // save the updated battery
    appSettings.setNumber('sd.version.mcu', this._smartDrive.mcu_version);
    appSettings.setNumber('sd.version.ble', this._smartDrive.ble_version);
    appSettings.setNumber('sd.battery', this._smartDrive.battery);
  }

  async onScanTap() {
    console.log('onScanTap()');
    return this._bluetoothService
      .scanForSmartDrive()
      .then(() => {
        const sds = BluetoothService.SmartDrives;
        const addresses = sds.map(sd => sd.address);
        action({
          message: `Found ${sds && sds.length} SmartDrives!.`,
          actions: addresses,
          cancelButtonText: 'Dismiss'
        }).then(result => {
          console.log('result', result);
          if (addresses.indexOf(result) > -1) {
            this._smartDrive = sds.filter(sd => sd.address === result)[0];
            this._smartDrive.on(
              SmartDrive.smartdrive_mcu_version_event,
              this.onSmartDriveVersion,
              this
            );
            this._smartDrive.on(
              SmartDrive.smartdrive_distance_event,
              this.onDistance,
              this
            );
            this._smartDrive.connect();
            this.connected = true;
            new Toasty('Connecting to ' + result).show();
          }
        });
      })
      .catch(err => {
        console.log('could not scan', err);
      });
  }

  async onDisconnectTap() {
    if (this._smartDrive.connected) {
      this._smartDrive.off(
        SmartDrive.smartdrive_mcu_version_event,
        this.onSmartDriveVersion,
        this
      );
      this._smartDrive.off(
        SmartDrive.smartdrive_distance_event,
        this.onDistance,
        this
      );
      this._smartDrive.disconnect().then(() => {
        this.connected = false;
        new Toasty('Disconnected from ' + this._smartDrive.address).show();
      });
    }
  }

  async startHeartRate() {
    try {
      // check permissions first
      const hasPermission = permissions.hasPermission(
        android.Manifest.permission.BODY_SENSORS
      );
      if (!hasPermission) {
        await permissions.requestPermission(
          android.Manifest.permission.BODY_SENSORS
        );
      }

      const activity: android.app.Activity =
        application.android.startActivity ||
        application.android.foregroundActivity;
      const mSensorManager = activity.getSystemService(
        android.content.Context.SENSOR_SERVICE
      ) as android.hardware.SensorManager;

      if (!this._heartrateListener) {
        this._heartrateListener = new android.hardware.SensorEventListener({
          onAccuracyChanged: (sensor, accuracy) => {},
          onSensorChanged: event => {
            console.log(event.values[0]);
            this.heartRate = event.values[0].toString().split('.')[0];
            appSettings.setNumber('heartrate', parseInt(this.heartRate));
            // this._heartRateLottie.playAnimation();
            // setTimeout(() => {
            //   // this._heartRateLottie.cancelAnimation();
            // }, 600);
          }
        });
      }

      // if already getting the HR, then turn off on this tap
      if (this.isGettingHeartRate === true) {
        this.isGettingHeartRate = false;
        this._heartRateLottie.autoPlay = false;
        this._heartRateLottie.cancelAnimation();
        mSensorManager.unregisterListener(this._heartrateListener);
        return;
      }

      if (!mSensorManager) {
        alert({
          message: 'Could not initialize the device sensors.',
          okButtonText: 'Okay'
        });
      }

      const mHeartRateSensor = mSensorManager.getDefaultSensor(
        android.hardware.Sensor.TYPE_HEART_RATE
      );
      console.log(mHeartRateSensor);

      const didRegListener = mSensorManager.registerListener(
        this._heartrateListener,
        mHeartRateSensor,
        android.hardware.SensorManager.SENSOR_DELAY_NORMAL
      );
      console.log({ didRegListener });

      if (didRegListener) {
        this.isGettingHeartRate = true;
        this._heartRateLottie.autoPlay = true;
        this._heartRateLottie.playAnimation();
        console.log('Registered heart rate sensor listener');
      } else {
        console.log('Heart Rate listener did not register.');
      }
    } catch (error) {
      console.log({ error });
    }
  }

  openHeartRateModal(args) {
    try {
      const modalPage = '../heart-rate/heart-rate';
      args.object.page.showModal(modalPage, null, () => {}, true, true);
    } catch (error) {
      console.log({ error });
    }
  }

  private _trimAccelerometerData(value: number) {
    const x = value.toString();
    return x.substring(0, 8);
  }

  private _setColor(r, g, b) {
    const r_hex = parseInt(r, 10).toString(16);
    const g_hex = parseInt(g, 10).toString(16);
    const b_hex = parseInt(b, 10).toString(16);
    const hex = '#' + this._pad(r_hex) + this._pad(g_hex) + this._pad(b_hex);
    console.log('hex === ', hex);
    return hex;
  }

  private _pad(n) {
    return n.length < 2 ? '0' + n : n;
  }
}
