import { Observable } from 'tns-core-modules/data/observable';
import { alert } from 'tns-core-modules/ui/dialogs';
import { device, screen } from 'tns-core-modules/platform';
import { Bluetooth } from 'nativescript-bluetooth';
import { Prop } from '../../obs-prop';
import * as application from 'tns-core-modules/application';
import * as accelerometer from 'nativescript-accelerometer-advanced';
import * as Toast from 'nativescript-toast';
import { topmost, Page } from 'tns-core-modules/ui/frame';

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
   * Boolean to track if accelerometer is already registered listener events.
   */
  private _isListeningAccelerometer = false;

  private _page: Page;

  private _bluetooth = new Bluetooth();

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

  public toggleAccelerometer() {
    console.log({ _isListeningAccelerometer: this._isListeningAccelerometer });

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
          console.log({ accelerometerdata });
          const x = this._trimAccelerometerData(accelerometerdata.x);
          const y = this._trimAccelerometerData(accelerometerdata.y);
          const z = this._trimAccelerometerData(accelerometerdata.z);
          this.accelerometerData = `X: ${x} - Y: ${y} * Z: ${z}`;
        }
      },
      { sensorDelay: 'normal' }
    );

    // set true so next tap doesn't try to register the listeners again
    this._isListeningAccelerometer = true;
    this.accelerometerBtnText = 'Stop Accelerometer';
  }

  public async onAlertTap() {
    alert({
      message: 'Alert can be swiped or closed with button.',
      okButtonText: 'Okay'
    }).then(() => {
      Toast.makeText('Alert closed').show();
    });
  }

  public openHeartRateModal(args) {
    try {
      const modalPage = '../heart-rate/heart-rate';
      args.object.page.showModal(modalPage, null, () => {}, true, true);
    } catch (error) {
      console.log(error);
    }
  }

  private _trimAccelerometerData(value: number) {
    const x = value.toString();
    return x.substring(0, 8);
  }
}
