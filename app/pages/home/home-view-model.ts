import { Observable } from 'tns-core-modules/data/observable';
import { alert } from 'tns-core-modules/ui/dialogs';
import { device, screen } from 'tns-core-modules/platform';
import { Bluetooth } from 'nativescript-bluetooth';
import { Prop } from '../../obs-prop';
import * as application from 'tns-core-modules/application';
import * as accelerometer from 'nativescript-accelerometer-advanced';
import * as Toast from 'nativescript-toast';
import { topmost, Page } from 'tns-core-modules/ui/frame';
import * as permissions from 'nativescript-permissions';
import { LottieView } from 'nativescript-lottie';

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
  private isGettingHeartRate = false;

  /**
   * Boolean to track if accelerometer is already registered listener events.
   */
  private _isListeningAccelerometer = false;

  private _heartrateListener;

  private _page: Page;

  private _bluetooth = new Bluetooth();
  private _motionDetectedLottie: LottieView;

  constructor(page: Page) {
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

    this._bluetooth.isBluetoothEnabled().then(
      result => {
        console.log('Bluetooth enabled: ' + result);
      },
      err => {
        console.log({ err });
      }
    );
  }

  motionDetectedLoaded(args) {
    this._motionDetectedLottie = args.object;
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
          // this.accelerometerData = `X: ${x} - Y: ${y} * Z: ${z}`;

          const diff = Math.sqrt(
            accelerometerdata.x * accelerometerdata.x +
              accelerometerdata.y * accelerometerdata.y +
              accelerometerdata.z * accelerometerdata.z
          );

          if (diff > THRESHOLD) {
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
      { sensorDelay: 'normal' }
    );

    // set true so next tap doesn't try to register the listeners again
    this._isListeningAccelerometer = true;
    this.accelerometerBtnText = 'Stop Accelerometer';
  }

  async onAlertTap() {
    alert({
      message: 'Alert can be swiped or closed with button.',
      okButtonText: 'Okay'
    }).then(() => {
      Toast.makeText('Alert closed').show();
    });
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
          }
        });
      }

      // if already getting the HR, then turn off on this tap
      if (this.isGettingHeartRate === true) {
        this.isGettingHeartRate = false;
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
}
