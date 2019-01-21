import * as accelerometer from 'nativescript-accelerometer-advanced';
import { Bluetooth } from 'nativescript-bluetooth';
import { LottieView } from 'nativescript-lottie';
import * as permissions from 'nativescript-permissions';
import { Toasty, ToastPosition, ToastDuration } from 'nativescript-toasty';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Observable } from 'tns-core-modules/data/observable';
import { device } from 'tns-core-modules/platform';
import * as frameModule from 'tns-core-modules/ui/frame';
import { alert, action } from 'tns-core-modules/ui/dialogs';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { Page, topmost } from 'tns-core-modules/ui/frame';
import { Image } from 'tns-core-modules/ui/image';
import {
  SmartDrive,
  logMessage,
  logBreadCrumb,
  LoggingCategory
} from '../../core';
import { Prop } from '../../core/obs-prop';
import { BluetoothService } from '../../services';
import { injector } from '../../app';
import { DataKeys } from '~/core/enums';

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
   * String value for the label text for starting/stopping heart rate sensor.
   */
  @Prop() public heartRateLabelText = 'Check Heart Rate';

  /**
   * Boolean to handle logic if we have connected to a SD unit.
   */
  @Prop()
  public connected = false;

  /**
   * Boolean to track if accelerometer is already registered listener events.
   */
  private _isListeningAccelerometer = false;
  private _heartrateListener;
  private _page: Page;
  private _smartDrive: SmartDrive;
  private _motionDetectedLottie: LottieView;
  private _heartRateLottie: LottieView;
  // private _bluetoothService: BluetoothService;

  constructor(
    page: Page,
    private _bluetoothService: BluetoothService = injector.get(BluetoothService)
  ) {
    super();
    this._page = page;

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
    console.log('onDistance event');

    // save the updated distance
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_CASE,
      this._smartDrive.coastDistance
    );
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_DRIVE,
      this._smartDrive.driveDistance
    );

    logBreadCrumb(
      `Updated SD: ${this._smartDrive.address} -- SD_DISTANCE_CASE: ${
        this._smartDrive.coastDistance
      }, SD_DISTANCE_DRIVE: ${this._smartDrive.driveDistance}`
    );
  }

  async onSmartDriveVersion(args: any) {
    console.log('onSmartDriveVersion event');

    // save the updated SmartDrive data values
    appSettings.setNumber(
      DataKeys.SD_VERSION_MCU,
      this._smartDrive.mcu_version
    );
    appSettings.setNumber(
      DataKeys.SD_VERSION_BLE,
      this._smartDrive.ble_version
    );
    appSettings.setNumber(DataKeys.SD_BATTERY, this._smartDrive.battery);

    // log breadcrumb
    logBreadCrumb(
      `Updated SD: ${this._smartDrive.address} -- MCU: ${
        this._smartDrive.mcu_version
      }, BLE: ${this._smartDrive.ble_version}, Battery: ${
        this._smartDrive.battery
      }`
    );
  }

  onScanForSmartDrivesTap() {
    console.log('onScanForSmartDrivesTap()');

    new Toasty(
      'Scanning for SmartDrives...',
      ToastDuration.LONG,
      ToastPosition.CENTER
    ).show();

    // scan for smartdrives
    this._bluetoothService
      .scanForSmartDrives(3)
      .then(() => {
        console.log('Discovered SmartDrives: ' + BluetoothService.SmartDrives);

        // make sure we have smartdrives
        if (BluetoothService.SmartDrives.length <= 0) {
          new Toasty(
            'No SmartDrives found nearby.',
            ToastDuration.SHORT,
            ToastPosition.CENTER
          ).show();
          return;
        }

        // these are the smartdrives that are pushed into an array on the bluetooth service
        const sds = BluetoothService.SmartDrives;

        // map the smart drives to get all of the addresses
        const addresses = sds.map(sd => `${sd.address}`);

        // present action dialog to select which smartdrive to connect to
        action({
          title: '',
          message: `Found ${sds && sds.length} SmartDrives!.`,
          actions: addresses,
          cancelButtonText: 'Dismiss'
        }).then(result => {
          console.log('result', result);

          // if user selected one of the smartdrives in the action dialog, attempt to connect to it
          if (addresses.indexOf(result) > -1) {
            this._smartDrive = sds.filter(sd => sd.address === result)[0];

            console.log('smartdrive', this._smartDrive);

            // set the event listeners for mcu_version_event and smartdrive_distance_event
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

            // now connect to smart drive
            this._smartDrive.connect();
            this.connected = true;
            new Toasty(`Connecting to ${result}`)
              .setToastPosition(ToastPosition.CENTER)
              .show();
          }
        });
      })
      .catch(error => {
        console.log('could not scan', error);
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
        new Toasty(`Disconnected from ${this._smartDrive.address}`)
          .setToastPosition(ToastPosition.CENTER)
          .show();
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
            this.heartRateLabelText = `HR: ${this.heartRate}`;

            // log the recorded heart rate as a breadcrumb
            logBreadCrumb(
              `testing breadcrumb, heartRate: ${this.heartRate}`,
              LoggingCategory.Info
            );

            // save the heart rate
            appSettings.setNumber(
              DataKeys.HEART_RATE,
              parseInt(this.heartRate, 10)
            );
          }
        });
      }

      // if already getting the HR, then turn off on this tap
      if (this.isGettingHeartRate === true) {
        this.isGettingHeartRate = false;
        this.heartRateLabelText = 'Check Heart Rate';
        this._stopHeartAnimation();
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
        this.heartRateLabelText = 'Reading Heart Rate';
        this._heartRateLottie.autoPlay = true;
        this._heartRateLottie.playAnimation();
        this._animateHeartIcon();

        console.log('Registered heart rate sensor listener');
      } else {
        console.log('Heart Rate listener did not register.');
      }
    } catch (error) {
      console.log({ error });
    }
  }

  onSettingsTap() {
    try {
      console.log('onSettingsTap');
      // create a new Frame instance
      const frame = new frameModule.Frame();
      frame.navigate('./heart-rate/heart-rate');
    } catch (error) {
      console.log(error);
    }
  }

  private _animateHeartIcon() {
    const heartIcon = topmost().currentPage.getViewById('heartIcon') as Image;

    heartIcon
      .animate({
        scale: {
          x: 1.2,
          y: 1.2
        },
        duration: 200,
        curve: AnimationCurve.easeIn
      })
      .then(() => {
        heartIcon.animate({
          scale: {
            x: 0,
            y: 0
          },
          duration: 200,
          curve: AnimationCurve.easeOut
        });
      });
  }

  private _stopHeartAnimation() {
    console.log('stop heart animation');
  }

  private _trimAccelerometerData(value: number) {
    const x = value.toString();
    return x.substring(0, 8);
  }
}
