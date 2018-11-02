/// <reference path="../../../node_modules/tns-platform-declarations/android.d.ts" />

import * as accelerometer from 'nativescript-accelerometer-advanced';
import * as geoLocation from 'nativescript-geolocation';
import { LottieView } from 'nativescript-lottie';
import * as permissions from 'nativescript-permissions';
import { Toasty } from 'nativescript-toasty';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
// import { Bluetooth } from 'nativescript-bluetooth';
import { Color } from 'tns-core-modules/color';
import {
  Observable,
  PropertyChangeData
} from 'tns-core-modules/data/observable';
import { device } from 'tns-core-modules/platform';
import { action, alert, confirm } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/frame';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { BlueFruit, SmartDrive } from '../../core';
import { Prop } from '../../obs-prop';
import { BluetoothService } from '../../services';

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

  /**
   * Boolean to handle logic for when bluetooth is scanning
   */
  @Prop()
  public isSearchingBluetooth = false;

  /**
   * Button text for scanning for blue fruits
   */
  @Prop()
  public bluefruitScanningText = 'Scan For BlueFruits';

  @Prop()
  public brightnessSlider = 100;

  @Prop()
  public rColor = '00';
  @Prop()
  public gColor = '00';
  @Prop()
  public bColor = '00';

  @Prop()
  public currentHexColor = '#336699';

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
  private _bluefruitDevice: BlueFruit = null;
  private _blueFruitConnected = false;

  public static UUID_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

  constructor(page: Page) {
    super();
    this._page = page;

    this._colorLayout = page.getViewById('colorLayout') as StackLayout;
    this._bluetoothService = new BluetoothService();

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

    // Listener for prop changes - used to calc the sliders for color value and set background
    this.on(Observable.propertyChangeEvent, (args: PropertyChangeData) => {
      // Do your magic here
      console.log('propertyName', args.propertyName, 'value : ' + args.value);
      // handle the brightness slider updating
      if (args.propertyName === 'brightnessSlider') {
        this.brightnessSlider = args.value;
      } else {
        // right now this is handling the color sliders changing
        const hexColor = this._setColor(this.rColor, this.gColor, this.bColor);
        this.currentHexColor = hexColor;
        // this._colorLayout.backgroundColor = hexColor;
      }
    });
  }

  async scanForBluefruit() {
    try {
      // check and see if already connected to a bluefruit device
      // const x = BluetoothService.BlueFruits.forEach()

      console.log('scan for bluefruits');
      // make sure location is enabled or can't scan for peripherals
      const geoEnabled = await !geoLocation.isEnabled();
      console.log('geoEnabled', geoEnabled);

      this.isSearchingBluetooth = true;

      await this._bluetoothService.scanForBluefruits();

      console.log('bluefruits on service', BluetoothService.BlueFruits.length);
      if (BluetoothService.BlueFruits.length >= 1) {
        const cResult = await confirm({
          message: `Found ${
            BluetoothService.BlueFruits.length
          } Bluefruits nearby.`,
          okButtonText: 'Okay',
          cancelButtonText: 'Cancel'
        });
        if (cResult === true) {
          const bf = BluetoothService.BlueFruits.getItem(0);
          this._bluefruitDevice = BluetoothService.BlueFruits.getItem(0);
          console.log('attempting to connect to Bluefruit ', bf.address);
          this._bluetoothService._bluetooth.connect({
            UUID: bf.address,
            onConnected: peripheral => {
              console.log('connected to the bluefruit, now what?');
              // the peripheral object now has a list of available services:
              peripheral.services.forEach(service => {
                // console.log('service found: ' + JSON.stringify(service));
                console.log(service);
              });
            },
            onDisconnected: () => {
              console.log('oh crap we disconnected from the bluefruit...');
            }
          });
          // this._bluetoothService.connect(
          //   bf.address,
          //   peripheral => {
          //     console.log('connected to the bluefruit, now what?');
          //     // the peripheral object now has a list of available services:
          //     peripheral.services.forEach(function(service) {
          //       console.log('service found: ' + JSON.stringify(service));
          //     });
          //   },
          //   () => {
          //     console.log('oh crap we disconnected from the bluefruit...');
          //   }
          // );
        }
      } else {
        alert({
          message:
            'No Bluefruits found nearby. Check that your location is enabled to scan for peripherals and the Bluefruit you are trying to find is not currently connected to a device.',
          okButtonText: 'Okay'
        });
      }

      this.isSearchingBluetooth = false;
    } catch (error) {
      this.isSearchingBluetooth = false;
    }
  }

  async clearBluefruitBoard() {
    const ourColor = new Color('green').android;
    const red = android.graphics.Color.red(ourColor);
    const green = android.graphics.Color.green(ourColor);
    const blue = android.graphics.Color.blue(ourColor);

    const colorWValue = 0;

    const byteArray = Array.create('byte', 20);
    byteArray[0] = '0x43'; // 0x43 === 'C' - this is the "Command: Clear"
    byteArray[1] = red;
    byteArray[2] = green;
    byteArray[3] = blue;
    byteArray[4] = colorWValue;

    this._bluetoothService._bluetooth
      .write({
        peripheralUUID: this._bluefruitDevice.address,
        serviceUUID: BlueFruit.UART_Service,
        characteristicUUID: BlueFruit.TXD,
        value: byteArray
      })
      .then(() => {
        console.log('success clearing the board');
      })
      .catch(error => {
        console.log('error writing brightness ' + error);
      });
  }

  async sendColorToBluefruit() {
    try {
      // we should be connected to the Bluefruit when we try this

      const ourColor = new Color(this.currentHexColor).android;

      const red = android.graphics.Color.red(ourColor);
      console.log('red', red);
      const green = android.graphics.Color.green(ourColor);
      console.log('green', green);
      const blue = android.graphics.Color.blue(ourColor);
      console.log('blue', blue);

      const colorArray = Array.create('byte', 20);
      colorArray[0] = '0x50'; // '0x50' === 'P' this is Command: Set Pixel
      colorArray[1] = 0;
      colorArray[2] = 1;
      colorArray[3] = red;
      colorArray[4] = green;
      colorArray[5] = blue;
      // colorArray[6] = colorWValue;

      this._bluetoothService._bluetooth
        .write({
          peripheralUUID: this._bluefruitDevice.address,
          serviceUUID: BlueFruit.UART_Service,
          characteristicUUID: BlueFruit.TXD,
          value: colorArray
        })
        .then(
          function(result) {
            console.log('success sending color to bluefruit');
          },
          function(err) {
            console.log('sending color error: ' + err);
          }
        );
    } catch (error) {
      console.log('Error writing to Bluefruit device.', error);
    }
  }

  async sendBrightnessToBoard() {
    try {
      // try setting the brightness
      const brightness = this.brightnessSlider * 255; //
      const brightnessArray = Array.create('byte', 20);
      brightnessArray[0] = '0x42'; // 0x42 === 'B' - which is Command: set Brightness
      brightnessArray[1] = brightness;

      this._bluetoothService._bluetooth
        .write({
          peripheralUUID: this._bluefruitDevice.address,
          serviceUUID: BlueFruit.UART_Service,
          characteristicUUID: BlueFruit.TXD,
          value: brightnessArray
        })
        .then(() => {
          console.log('success writing brightness');
        })
        .catch(error => {
          console.log('error writing brightness ' + error);
        });
    } catch (error) {
      console.log('error sending brightness', error);
    }
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

class Board {
  name: string;
  width: any; // byte
  height: any; // byte
  stride: any; // byte;

  constructor(name: string, width, height, stride) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.stride = stride;
  }
}
