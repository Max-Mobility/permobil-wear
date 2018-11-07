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
import { BlueFruit, Neopixel, SmartDrive } from '../../core';
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

  private _motionDetectedLottie: LottieView;
  private _heartRateLottie: LottieView;

  private _bluetoothService: BluetoothService;

  private _smartDrive: SmartDrive;
  private _blueFruit: BlueFruit;

  private: StackLayout;
  private _page: Page;

  constructor(page: Page) {
    super();
    this._page = page;

    this._bluetoothService = new BluetoothService();

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

  async onScanTap() {
    console.log('onScanTap()');
    this.isSearchingBluetooth = false;
    // make sure location is enabled or can't scan for peripherals
    try {
      const geoEnabled = await !geoLocation.isEnabled();
      console.log('geoEnabled', geoEnabled);
    } catch (err) {
      console.log('geo error', err);
      return;
    }

    this.isSearchingBluetooth = true;
    return this.scanForSmartDrive()
      .then(() => {
        return this.scanForBlueFruit();
      })
      .then(() => {
        this.isSearchingBluetooth = false;
      })
      .catch(err => {
        this.isSearchingBluetooth = false;
      });
  }

  async scanForSmartDrive() {
    console.log('scan for smartdrive');
    return this._bluetoothService
      .scanForSmartDrive(2)
      .then(() => {
        const sds = BluetoothService.SmartDrives;
        const addresses = sds.map(sd => sd.address);
        let address = null;
        let smartDrive = null;
        if (addresses.length !== 1) {
          return action({
            message: `Found ${sds && sds.length} SmartDrives!.`,
            actions: addresses,
            cancelButtonText: 'Dismiss'
          }).then(result => {
            if (addresses.indexOf(result) > -1) {
              address = result;
              smartDrive = sds.filter(sd => sd.address === address)[0];
            }
            return smartDrive;
          });
        } else {
          return sds.filter(sd => sd.address === addresses[0])[0];
        }
      })
      .then(sd => {
        if (!sd) {
          return;
        }
        return new Promise((resolve, reject) => {
          this._smartDrive = sd;
          this._smartDrive.on(
            SmartDrive.mcu_version_event,
            this.onSmartDriveVersion,
            this
          );
          this._smartDrive.on(SmartDrive.distance_event, this.onDistance, this);
          const onConn = () => {
            this.connected = true;
            this._smartDrive.off(SmartDrive.connect_event);
            resolve();
          };
          this._smartDrive.on(SmartDrive.connect_event, onConn, this);
          this._smartDrive.connect();
          new Toasty('Connecting to ' + sd.address).show();
        });
      })
      .catch(err => {
        console.log('could not scan', err);
      });
  }

  async scanForBlueFruit() {
    console.log('scan for bluefruits');
    return this._bluetoothService
      .scanForBlueFruits(2)
      .then(() => {
        const bfs = BluetoothService.BlueFruits;
        const addresses = bfs.map(bf => bf.address);
        let address = null;
        let blueFruit = null;
        if (addresses.length !== 1) {
          return action({
            message: `Found ${bfs && bfs.length} BlueFruits!.`,
            actions: addresses,
            cancelButtonText: 'Dismiss'
          }).then(result => {
            if (addresses.indexOf(result) > -1) {
              address = result;
              blueFruit = bfs.filter(bf => bf.address === address)[0];
            }
            return blueFruit;
          });
        } else {
          return bfs.filter(bf => bf.address === addresses[0])[0];
        }
      })
      .then(bf => {
        if (!bf) {
          return;
        }
        this._blueFruit = bf;
        this._blueFruit.connect();
        this.connected = true;
        new Toasty('Connecting to ' + bf.address).show();
        return Promise.resolve();
      })
      .catch(err => {
        console.log('could not scan', err);
      });
  }

  getCurrentColor() {
    const x = new Color(this.currentHexColor);
    const ledColor = x.android;

    const red = android.graphics.Color.red(ledColor);
    const green = android.graphics.Color.green(ledColor);
    const blue = android.graphics.Color.blue(ledColor);
    const white = 0;

    return {
      red,
      green,
      blue,
      white
    };
  }

  async sendColor() {
    // we should be connected to the Bluefruit when we try this
    const color = this.getCurrentColor();
    console.log('sending color', color);

    const sendSD = () => {
      if (this._smartDrive && this._smartDrive.connected) {
        console.log('Sending color to smartdrive');
        return this._smartDrive
          .setLEDColor(color.red, color.green, color.blue)
          .catch(err => {
            console.log('err sending LED to SD', err);
          });
      } else {
        return Promise.resolve();
      }
    };

    const sendBF = () => {
      if (this._blueFruit && this._blueFruit.connected) {
        console.log('Sending color to bluefruit');
        return this._blueFruit
          .clearColor(color.red, color.green, color.blue)
          .catch(err => {
            console.log('err sending LED to BF', err);
          });
      } else {
        return Promise.resolve();
      }
    };
    return sendSD().then(sendBF);
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

  // SmartDrive Events:
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

  // Button Handlers:
  async onDisconnectTap() {
    if (this._smartDrive && this._smartDrive.connected) {
      this._smartDrive.off(
        SmartDrive.mcu_version_event,
        this.onSmartDriveVersion,
        this
      );
      this._smartDrive.off(SmartDrive.distance_event, this.onDistance, this);
      this._smartDrive.disconnect().then(() => {
        this.connected = false;
        new Toasty('Disconnected from ' + this._smartDrive.address).show();
      });
    }
    if (this._blueFruit && this._blueFruit.connected) {
      this._blueFruit.disconnect().then(() => {
        this.connected = false;
        new Toasty('Disconnected from ' + this._blueFruit.address).show();
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
}
