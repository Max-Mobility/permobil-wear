import {
  BluetoothService,
  DataKeys,
  LoggingCategory,
  Prop,
  SentryService,
  SmartDrive,
  throttle,
  Log,
  SensorDataService
} from '@permobil/core';
import * as accelerometer from 'nativescript-accelerometer-advanced';
import * as permissions from 'nativescript-permissions';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import {
  showSuccess,
  showFailure
} from 'nativescript-wear-os/packages/dialogs';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Observable } from 'tns-core-modules/data/observable';
import {
  ObservableArray,
  ChangedData
} from 'tns-core-modules/data/observable-array';
import { device } from 'tns-core-modules/platform';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { injector, currentSystemTime } from '../../app';
import {
  hideOffScreenLayout,
  promptUserForSpeech,
  showOffScreenLayout
} from '../../utils';
import { setInterval, clearInterval } from 'tns-core-modules/timer';

let sensorInterval = null;
let dataCollectionTimeout = 60;
const sensorData: accelerometer.AccelerometerData[] = [];

export class MainViewModel extends Observable {
  /**
   * The heart rate data to render.
   */
  @Prop()
  heartRate: string;

  /**
   * The tap sensitivity threshold
   */
  @Prop()
  tapSensitivity: number = 0.5;

  /**
   * The tap sensitivity display
   */
  @Prop()
  tapSensitivityText: string = `Tap Sensitivity: ${this.tapSensitivity.toFixed(
    2
  )} g`;

  /**
   * The heart rate accuracy for monitoring.
   */
  @Prop()
  heartRateAccuracy = 0;

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
  public motorOn = false;

  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop()
  public isSettingsLayoutEnabled = false;

  @Prop()
  public items = new ObservableArray(
    {
      type: 'banner',
      image: '~/assets/images/permobil-logo-transparent.png',
      class: 'logo'
    },
    {
      type: 'button',
      image: 'res://sdstock',
      class: 'icon smartdrive',
      text: 'Power Assist OFF',
      func: this.togglePowerAssist.bind(this)
    },
    {
      type: 'button',
      image: 'res://bluetooth',
      class: 'icon',
      text: 'Pair a SmartDrive',
      func: this.saveNewSmartDrive.bind(this)
    },
    {
      type: 'button',
      image: 'res://ic_watch_white',
      class: 'icon',
      text: 'Data Collection',
      func: this.onStartDataCollection.bind(this)
    },
    {
      type: 'button',
      image: 'res://favorite',
      class: 'icon',
      text: 'Read Heart Rate',
      func: this.startHeartRate.bind(this)
    },
    {
      type: 'button',
      image: 'res://settings',
      class: 'icon',
      text: 'Settings',
      func: this.onSettingsTap.bind(this)
    },
    {
      type: 'button',
      image: 'res://updates',
      class: 'icon',
      text: 'Updates',
      func: this.onUpdatesTap.bind(this)
    }
  );

  private _powerAssistButtonIndex = 1;
  private _dataCollectionButtonIndex = 3;
  private _heartRateButtonIndex = 4;

  /**
   * Boolean to track if accelerometer is already registered listener events.
   */
  private _isListeningAccelerometer = false;
  private _heartrateListener;
  private _smartDrive: SmartDrive;
  private _settingsLayout: SwipeDismissLayout;
  private _savedSmartDriveAddress: string = null;
  private _powerAssistActive: boolean = false;

  constructor(
    private _bluetoothService: BluetoothService = injector.get(
      BluetoothService
    ),
    private _sentryService: SentryService = injector.get(SentryService),
    private _sensorDataService: SensorDataService = injector.get(
      SensorDataService
    )
  ) {
    super();

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = appSettings.getString(DataKeys.SD_SAVED_ADDRESS);
    if (savedSDAddr && savedSDAddr.length) {
      this._savedSmartDriveAddress = savedSDAddr;
    }

    // load tapSensitivity from settings / memory
    const savedTapSensitivity = appSettings.getNumber(
      DataKeys.SD_TAP_SENSITIVITY
    );
    if (savedTapSensitivity) {
      this.tapSensitivity = savedTapSensitivity;
      this.tapSensitivityText = `Tap Sensitivity: ${this.tapSensitivity.toFixed(
        2
      )} g`;
    }

    Log.D(
      'Device Info: ---',
      'Manufacturer: ' + device.manufacturer,
      'Model: ' + device.model,
      'OS: ' + device.os,
      'OS Version: ' + device.osVersion,
      'SDK Version: ' + device.sdkVersion,
      'Region: ' + device.region,
      'Device Language: ' + device.language,
      'UUID: ' + device.uuid
    );
  }

  onIncreaseTapSensitivityTap() {
    this.tapSensitivity =
      this.tapSensitivity < 2.0 ? this.tapSensitivity + 0.05 : 2.0;
    this.tapSensitivityText = `Tap Sensitivity: ${this.tapSensitivity.toFixed(
      2
    )} g`;
    this.saveTapSensitivity();
  }

  onDecreaseTapSensitivityTap() {
    this.tapSensitivity =
      this.tapSensitivity > 0.1 ? this.tapSensitivity - 0.05 : 0.1;
    this.tapSensitivityText = `Tap Sensitivity: ${this.tapSensitivity.toFixed(
      2
    )} g`;
    this.saveTapSensitivity();
  }

  saveTapSensitivity() {
    appSettings.setNumber(DataKeys.SD_TAP_SENSITIVITY, this.tapSensitivity);
  }

  updatePowerAssistButtonText(newText: string) {
    const item = this.items.getItem(this._powerAssistButtonIndex);
    item.text = newText;
    this.items.setItem(this._powerAssistButtonIndex, item);
  }

  updateHeartRateButtonText(newText: string) {
    const item = this.items.getItem(this._heartRateButtonIndex);
    item.text = newText;
    this.items.setItem(this._heartRateButtonIndex, item);
  }

  togglePowerAssist() {
    if (this._powerAssistActive) {
      this._powerAssistActive = false;
      this.updatePowerAssistButtonText('Power Assist OFF');
      this.disableAccelerometer();
      this.onDisconnectTap();
    } else {
      this.connectToSavedSmartDrive().then(didConnect => {
        if (didConnect) {
          this._powerAssistActive = true;
          this.enableAccelerometer();
          this.updatePowerAssistButtonText('Power Assist ON');
        }
      });
    }
  }

  disableAccelerometer() {
    // Log.D('disableAccelerometer');
    if (this._smartDrive && this._smartDrive.ableToSend) {
      Log.D('Turning off Motor!');
      this._smartDrive
        .stopMotor()
        .catch(err => Log.E('Could not stop motor', err));
    }
    try {
      accelerometer.stopAccelerometerUpdates();
    } catch (err) {
      Log.E('could not disable accelerometer', err);
    }
    this._isListeningAccelerometer = false;
    return;
  }

  async onAccelerometerData(data: accelerometer.AccelerometerData) {
    if (dataCollectionTimeout > 1) {
      sensorData.push(data);
    }
    if (dataCollectionTimeout < 1) {
      this.disableAccelerometer();
      Log.D(`Sensor Data Length: ${sensorData.length}`);
      // need to write the data locally, after the 60 second interval we will iterate the array of records and push to Kinvey
      this._sensorDataService.saveRecord(sensorData);
      // for (let i = 0; i < sensorData.length; i++) {
      //   const el = sensorData[i];
      //   await this._sensorDataService.saveRecord(el).catch(err => {
      //     Log.E(err);
      //   });
      // }
    }

    // Log.D('onAccelerometerData');
    // only showing linear acceleration data for now
    // if (data.sensorType === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
    //   const z = data.z;
    //   let diff = z;
    //   if (this.motorOn) {
    //     diff = Math.abs(z);
    //   }

    //   // Log.D('checking', this.tapSensitivity, 'against', diff);

    //   if (diff > this.tapSensitivity && !this.motionDetected) {
    //     // Log.D('Motion detected!', { diff });
    //     // register motion detected and block out futher motion detection
    //     this.motionDetected = true;
    //     setTimeout(() => {
    //       this.motionDetected = false;
    //     }, 300);
    //     // now send
    //     if (this._smartDrive && this._smartDrive.ableToSend) {
    //       Log.D('Sending tap!');
    //       this._smartDrive
    //         .sendTap()
    //         .catch(err => Log.E('could not send tap', err));
    //     }
    //   }
    // }
  }

  enableAccelerometer() {
    Log.D('Enable accelerometer...');
    try {
      accelerometer.startAccelerometerUpdates(
        this.onAccelerometerData.bind(this),
        { sensorDelay: 'game' }
      );
      this._isListeningAccelerometer = true;
    } catch (err) {
      Log.E('Could not enable accelerometer', err);
    }
  }

  async onMotorInfo(args: any) {
    // Log.D('onMotorInfo event');
    this.motorOn = this._smartDrive.driving;
  }

  async onDistance(args: any) {
    // Log.D('onDistance event');

    // save the updated distance
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_CASE,
      this._smartDrive.coastDistance
    );
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_DRIVE,
      this._smartDrive.driveDistance
    );

    /*
    this._sentryService.logBreadCrumb(
      `Updated SD: ${this._smartDrive.address} -- SD_DISTANCE_CASE: ${
        this._smartDrive.coastDistance
      }, SD_DISTANCE_DRIVE: ${this._smartDrive.driveDistance}`
    );
	  */
  }

  async onSmartDriveVersion(args: any) {
    // Log.D('onSmartDriveVersion event');

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

    setInterval(() => {
      Log.D(
        `Updated SD: ${this._smartDrive.address} -- MCU: ${
          this._smartDrive.mcu_version
        }, BLE: ${this._smartDrive.ble_version}, Battery: ${
          this._smartDrive.battery
        }`
      );
    }, 10000);
  }

  saveNewSmartDrive() {
    Log.D('saveNewSmartDrive()');

    new Toasty(
      'Scanning for SmartDrives...',
      ToastDuration.LONG,
      ToastPosition.CENTER
    ).show();

    // scan for smartdrives
    this._bluetoothService
      .scanForSmartDrives(3)
      .then(() => {
        Log.D('Discovered SmartDrives', BluetoothService.SmartDrives);

        // make sure we have smartdrives
        if (BluetoothService.SmartDrives.length <= 0) {
          showFailure('No SmartDrives found nearby.');
          return;
        }

        // these are the smartdrives that are pushed into an array on the bluetooth service
        const sds = BluetoothService.SmartDrives;

        // map the smart drives to get all of the addresses
        const addresses = sds.map(sd => `${sd.address}`);

        // present action dialog to select which smartdrive to connect to
        action({
          title: '',
          message: 'Select SmartDrive:',
          actions: addresses,
          cancelButtonText: 'Dismiss'
        }).then(result => {
          Log.D('result', result);

          // if user selected one of the smartdrives in the action dialog, attempt to connect to it
          if (addresses.indexOf(result) > -1) {
            // save the smartdrive here
            this._savedSmartDriveAddress = result;
            appSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);

            showSuccess(`Paired to SmartDrive ${result}`);
          }
        });
      })
      .catch(error => {
        Log.E('could not scan', error);
      });
  }

  connectToSmartDrive(smartDrive) {
    if (!smartDrive) return;
    this._smartDrive = smartDrive;
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
    this._smartDrive.on(
      SmartDrive.smartdrive_motor_info_event,
      this.onMotorInfo,
      this
    );

    // now connect to smart drive
    this._smartDrive.connect();
    this.connected = true;
    showSuccess(`Connected to ${this._smartDrive.address}`, 2);
  }

  connectToSavedSmartDrive() {
    Log.D('connectToSavedSmartDrive()');
    if (
      this._savedSmartDriveAddress === null ||
      this._savedSmartDriveAddress.length === 0
    ) {
      showFailure('You must pair to a SmartDrive first.', 3);
      return Promise.resolve(false);
    }

    new Toasty(
      'Connecting to ' + this._savedSmartDriveAddress,
      ToastDuration.LONG,
      ToastPosition.CENTER
    ).show();

    // try to connect to the SmartDrive
    let sd = BluetoothService.SmartDrives.filter(
      sd => sd.address === this._savedSmartDriveAddress
    )[0];
    if (sd) {
      this.connectToSmartDrive(sd);
      return Promise.resolve(true);
    } else {
      return this._bluetoothService
        .scanForSmartDrives(3)
        .then(() => {
          sd = BluetoothService.SmartDrives.filter(
            sd => sd.address === this._savedSmartDriveAddress
          )[0];
          if (!sd) {
            showFailure(`Could not find ${this._savedSmartDriveAddress}`);

            return false;
          } else {
            this.connectToSmartDrive(sd);
            return true;
          }
        })
        .catch(() => {
          return false;
        });
    }
  }

  async onDisconnectTap() {
    if (this._smartDrive && this._smartDrive.connected) {
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
      this._smartDrive.off(
        SmartDrive.smartdrive_motor_info_event,
        this.onMotorInfo,
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
          onAccuracyChanged: (sensor, accuracy) => {
            this.heartRateAccuracy = accuracy;
            this._sentryService.logBreadCrumb(
              `testing breadcrumb, heart rate accuracy: ${
                this.heartRateAccuracy
              }`,
              LoggingCategory.Info
            );
          },
          onSensorChanged: event => {
            Log.D(event.values[0]);
            this.heartRate = event.values[0].toString().split('.')[0];
            let accStr = 'Unknown';
            switch (this.heartRateAccuracy) {
              case 0:
                accStr = 'Unreliable';
                break;
              case 1:
                accStr = 'Low';
                break;
              case 2:
                accStr = 'Medium';
                break;
              case 3:
                accStr = 'High';
                break;
              case 0xffffffff:
              case -1:
                accStr = 'No Contact';
                break;
            }
            this.updateHeartRateButtonText(
              `HR: ${this.heartRate}, ACC: ${accStr}`
            );

            // log the recorded heart rate as a breadcrumb
            this._sentryService.logBreadCrumb(
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
        this.updateHeartRateButtonText('Read Heart Rate');
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
      Log.D(mHeartRateSensor);

      const didRegListener = mSensorManager.registerListener(
        this._heartrateListener,
        mHeartRateSensor,
        android.hardware.SensorManager.SENSOR_DELAY_NORMAL
      );
      Log.D({ didRegListener });

      if (didRegListener) {
        this.isGettingHeartRate = true;
        this.updateHeartRateButtonText('Reading Heart Rate');
        // don't read heart rate for more than one minute at a time
        setTimeout(() => {
          if (this.isGettingHeartRate) {
            Log.D('Timer cancelling heart rate');
            this.startHeartRate();
          }
        }, 60000);

        Log.D('Registered heart rate sensor listener');
      } else {
        Log.D('Heart Rate listener did not register.');
      }
    } catch (error) {
      Log.E({ error });
    }
  }

  onSettingsLayoutLoaded(args) {
    this._settingsLayout = args.object as SwipeDismissLayout;

    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      Log.D('dimissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(args.object as SwipeDismissLayout, { x: 500, y: 0 });
      this.isSettingsLayoutEnabled = false;
    });
  }

  onSettingsTap() {
    showOffScreenLayout(this._settingsLayout);
    this.isSettingsLayoutEnabled = true;
  }

  onVoiceInputTap() {
    promptUserForSpeech()
      .then(result => {
        Log.D('result from speech', result);
      })
      .catch(error => {
        Log.E('speech error', error);
      });
  }

  onUpdatesTap() {
    showSuccess('No updates available.', 4);
  }

  private _trimAccelerometerData(value: number) {
    const x = value.toString();
    return x.substring(0, 8);
  }

  onStartDataCollection() {
    try {
      this.enableAccelerometer();

      sensorInterval = setInterval(() => {
        Log.D('dataCollectionTimeout', dataCollectionTimeout);

        if (dataCollectionTimeout < 1) {
          Log.D('Clearing the sensor data collection interval...');
          dataCollectionTimeout = 0;
          this._updateDataCollectionButtonText(`Data Collection`);
          clearInterval(sensorInterval);
          return;
        }

        this._updateDataCollectionButtonText(
          `Seconds Remaining: ${dataCollectionTimeout}`
        );
        dataCollectionTimeout--;
      }, 1000);
    } catch (error) {
      Log.E(error);
    }
  }

  private _updateDataCollectionButtonText(newText: string) {
    const item = this.items.getItem(this._dataCollectionButtonIndex);
    item.text = newText;
    this.items.setItem(this._dataCollectionButtonIndex, item);
  }
}
