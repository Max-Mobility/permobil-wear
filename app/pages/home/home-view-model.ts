/// <reference path="../../../node_modules/tns-platform-declarations/android.d.ts" />

import { Packet } from '../../core';
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
  private: StackLayout;
  private _bluefruitDevice: BlueFruit = null;

  private _neopixelBoard: NeopixelBoard = null;

  constructor(page: Page) {
    super();
    this._page = page;

    this._bluetoothService = new BluetoothService();

    this._neopixelBoard = new NeopixelBoard(
      '1x8',
      8,
      1,
      4,
      8,
      NeopixelBoard.kDefaultType
    );
    console.log('neopixelBoard', this._neopixelBoard);

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
      // console.log('propertyName', args.propertyName, 'value : ' + args.value);
      // handle the brightness slider updating
      if (args.propertyName === 'brightnessSlider') {
        this.brightnessSlider = args.value;
      } else {
        // right now this is handling the color sliders changing
        this.currentHexColor = this._setColor(
          this.rColor,
          this.gColor,
          this.bColor
        );
      }
    });
  }

  async scanForBluefruit() {
    try {
      console.log('scan for bluefruits');
      // make sure location is enabled or can't scan for peripherals
      const geoEnabled = await !geoLocation.isEnabled();
      console.log('geoEnabled', geoEnabled);

      this.isSearchingBluetooth = true;

      await this._bluetoothService.scanForBluefruits(2);

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
                console.log('service found: ' + service);
              });

              this._configureNotifying(bf.address);
            },
            onDisconnected: () => {
              console.log('oh crap we disconnected from the bluefruit...');
            }
          });
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

  async addNeopixelBoard() {
    try {
      const result = await this._setupNeopixel(this._neopixelBoard);
      console.log('Result of setting up neopixel ' + result);
      if (result) {
        // board was successful in setup
        this._clearBoard(255, 255, 255, 255);
      }
    } catch (error) {
      console.log('ERROR SETUP NEOPIXEL', error);
    }
  }

  async clearBluefruitBoard() {
    const color = this.getCurrentColor();
    this._clearBoard(color.red, color.green, color.blue, color.white);
  }

  getCurrentColor() {
    const x = new Color(this.currentHexColor);
    const ledColor = x.android;
    console.log('hex color = ' + x);
    console.log('android color = ' + ledColor);

    const red = android.graphics.Color.red(ledColor);
    // console.log('red', red);
    const green = android.graphics.Color.green(ledColor);
    // console.log('green', green);
    const blue = android.graphics.Color.blue(ledColor);
    const whtie = 0;

    return {
      red,
      green,
      blue,
      white
    };
  }

  async sendColorToBluefruit() {
    try {
      // we should be connected to the Bluefruit when we try this
      const color = this.getCurrentColor();
      // send to smartdrive
      if (this._smartDrive && this._smartDrive.ableToSend) {
        console.log('Sending color to smartdrive');
        this._smartDrive
          .setLEDColor(color.red, color.green, color.blue)
          .catch(err => console.log('could not send led color', err));
      }

      // send to neopixel board
      for (let i = 0; i < this._neopixelBoard.width; i++) {
        console.log('**** creating byte array ' + i + ' ******');
        const colorArray = Array.create('byte', 7);
        colorArray[0] = '0x50'; // '0x50' === 'P' this is Command: Set Pixel
        colorArray[1] = i % this._neopixelBoard.width;
        colorArray[2] = i / this._neopixelBoard.width;
        colorArray[3] = color.red;
        colorArray[4] = color.green;
        colorArray[5] = color.blue;
        colorArray[6] = 255;

        const result = await this._writeToBluefruit(colorArray).catch(error => {
          console.log('Error writing color to bluefruit ' + error);
        });

        console.log('result of writing color array', result);
      }
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
    // console.log('hex === ', hex);
    return hex;
  }

  private _pad(n) {
    return n.length < 2 ? '0' + n : n;
  }

  private _setupNeopixel(device: NeopixelBoard) {
    return new Promise((resolve, reject) => {
      try {
        console.log('*** Setup Board ***');

        const pixelType = device.type;
        console.log('pixel type', pixelType);

        const byteArray = Array.create('byte', 7);
        byteArray[0] = 0x53; // 0x53 === 'S' - this is the "Command: Setup"
        byteArray[1] = device.width; // device width
        byteArray[2] = device.height; // device height
        byteArray[3] = device.components; // device components
        byteArray[4] = device.stride; // stride
        byteArray[5] = pixelType; // pixelType (byte)
        byteArray[6] = (pixelType >> 8) & 0xff; // (pixelType >> 8) & 0xff (byte)

        this._writeToBluefruit(byteArray)
          .then(() => {
            resolve(true);
          })
          .catch(error => {
            console.log('ERROR writing to bluefruit for setup neopixel', error);
            reject(false);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  private _clearBoard(red: number, green: number, blue: number, white: number) {
    console.log('clearing the board');
    // send to smartdrive
    if (this._smartDrive && this._smartDrive.ableToSend) {
      console.log('Sending color to smartdrive');
      this._smartDrive
        .setLEDColor(red, green, blue)
        .catch(err => console.log('could not send led color', err));
    }
    // send to neopixel
    if (this._neopixelBoard !== null) {
      const byteArray = Array.create('byte', 5);
      byteArray[0] = 0x43; // CLEAR command
      byteArray[1] = green;
      byteArray[2] = red;
      byteArray[3] = blue;
      byteArray[4] = white;

      this._writeToBluefruit(byteArray).catch(error => {
        console.log('*** ERROR clearing board ***', error);
      });
    }
  }

  private _writeToBluefruit(data: Array<any>) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      console.log(`item ${i} in byte array = ${item}`);
    }
    return new Promise((resolve, reject) => {
      try {
        this._bluetoothService._bluetooth
          .write({
            peripheralUUID: this._bluefruitDevice.address,
            serviceUUID: BlueFruit.UART_Service,
            characteristicUUID: BlueFruit.TXD,
            value: data
          })
          .then(() => {
            resolve(true);
          })
          .catch(error => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  private _configureNotifying(address) {
    this._bluetoothService._bluetooth.startNotifying({
      peripheralUUID: address,
      serviceUUID: BlueFruit.UART_Service,
      characteristicUUID: BlueFruit.TXD,
      onNotify: args => {
        console.log('onNotify TXD args', args);
      }
    });
  }
}

class NeopixelBoard {
  static kDefaultType = 210;
  name: string;
  width: any; // byte
  height: any; // byte
  components: any; // byte
  stride: any; // byte
  type: any; // short
  constructor(name: string, width, height, components, stride, type) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.components = components;
    this.stride = stride;
    this.type = type;
  }
}
