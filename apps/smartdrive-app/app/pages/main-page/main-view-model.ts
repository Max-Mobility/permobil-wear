import {
  BluetoothService,
  DataKeys,
  LoggingCategory,
  Prop,
  SentryService,
  SmartDrive,
  Log,
  SensorService,
  SensorChangedEventData,
  AccuracyChangedEventData
} from '@permobil/core';
import { padStart } from 'lodash';
import { addSeconds, differenceInSeconds } from 'date-fns';
import * as permissions from 'nativescript-permissions';
import * as LS from 'nativescript-localstorage';
import { Vibrate } from 'nativescript-vibrate';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import {
  showSuccess,
  showFailure
} from 'nativescript-wear-os/packages/dialogs';
import * as appSettings from 'tns-core-modules/application-settings';
import { Observable } from 'tns-core-modules/data/observable';
import {
  ObservableArray,
  ChangedData
} from 'tns-core-modules/data/observable-array';
import { device } from 'tns-core-modules/platform';
import { action } from 'tns-core-modules/ui/dialogs';
import { injector, currentSystemTime } from '../../app';
import {
  hideOffScreenLayout,
  promptUserForSpeech,
  showOffScreenLayout,
  getLastLocation,
  bradTest
} from '../../utils';
import { setInterval, clearInterval } from 'tns-core-modules/timer';
import { SensorDelay } from 'nativescript-android-sensors';
import * as app from 'tns-core-modules/application';

let sensorInterval = null;
let sensorData = [];

declare const com: any;

export class MainViewModel extends Observable {
  /**
   * The heart rate data to render.
   */
  @Prop()
  heartRate: string;

  /**
   * The heart rate accuracy for monitoring.
   */
  @Prop()
  heartRateAccuracy = 0;

  /**
   * Boolean to track if heart rate is being monitored.
   */
  @Prop()
  public isGettingHeartRate = false;

  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop()
  public isSettingsLayoutEnabled = false;

  /**
   *
   * SmartDrive Related Data
   *
   */
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
   * Boolean to track whether a tap has been performed.
   */
  @Prop()
  hasTapped = false;

  /**
   * Boolean to handle logic if we have connected to a SD unit.
   */
  @Prop()
  public connected = false;

  /**
   * Boolean to track if the SmartDrive motor is on.
   */
  @Prop()
  public motorOn = false;

  /**
   * Array of menu items
   */
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
      text: 'Start Data Collection',
      func: this.onToggleDataCollection.bind(this)
    },
    {
      type: 'button',
      image: 'res://favorite',
      class: 'icon',
      text: 'Read Heart Rate',
      func: this.toggleHeartRate.bind(this)
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

  /**
   * Index values into the menu
   */
  private _powerAssistButtonIndex = 1;
  private _dataCollectionButtonIndex = 3;
  private _heartRateButtonIndex = 4;

  /**
   * State Management for Sensor Monitoring / Data Collection
   */
  private _isListeningDeviceSensors = false;
  private _isCollectingData = false;

  /**
   * SmartDrive Data / state management
   */
  private _smartDrive: SmartDrive;
  private _powerAssistActive: boolean = false;
  private _savedSmartDriveAddress: string = null;

  /**
   * User interaction objects
   */
  private _settingsLayout: SwipeDismissLayout;
  private _heartRateSensor: android.hardware.Sensor; // HR sensor so we can start/stop it individually from the other sensors
  private _vibrator: Vibrate = new Vibrate();

  constructor(
    private _bluetoothService: BluetoothService = injector.get(
      BluetoothService
    ),
    private _sentryService: SentryService = injector.get(SentryService),
    private _sensorService: SensorService = injector.get(SensorService)
  ) {
    super();

    this._sensorService.on(
      SensorService.AccuracyChanged,
      (args: AccuracyChangedEventData) => {
        Log.D(
          'SensorService.AccuracyChanged',
          args.data.sensor,
          args.data.accuracy
        );
        const sensor = args.data.sensor;
        const accuracy = args.data.accuracy;

        if (sensor.getType() === android.hardware.Sensor.TYPE_HEART_RATE) {
          this.heartRateAccuracy = accuracy;
          this.updateHeartRateButtonText();
          // save the heart rate
          appSettings.setNumber(
            DataKeys.HEART_RATE,
            parseInt(this.heartRate, 10)
          );
        }
      }
    );

    this._sensorService.on(
      SensorService.SensorChanged,
      (args: SensorChangedEventData) => {
        // Log.D('SensorService.SensorChanged', args.data);

        // if we're using litedata for android sensor plugin option
        // the data structure is simplified to reduce redundant data
        const parsedData = args.data;

        // Log.D(event.values[0]);
        // if reporting heart rate update the text for UI
        if (parsedData.s === android.hardware.Sensor.TYPE_HEART_RATE) {
          this.heartRate = parsedData.d.heart_rate.toString().split('.')[0];
          this.updateHeartRateButtonText();
        }

        // collect the data
        if (this._isCollectingData) {
          if (parsedData.s === android.hardware.Sensor.TYPE_HEART_RATE) {
            // add accuracy for heart rate data from sensors
            parsedData.d.accuracy = this.heartRateAccuracy;
            sensorData.push(parsedData);
          } else {
            sensorData.push(parsedData);
          }
        }

        // Log.D('onAccelerometerData');
        // only showing linear acceleration data for now
        if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
          const z = (parsedData.d as any).z;
          let diff = z;
          if (this.motorOn) {
            diff = Math.abs(z);
          }

          // Log.D('checking', this.tapSensitivity, 'against', diff);

          if (diff > this.tapSensitivity && !this.hasTapped) {
            // Log.D('Motion detected!', { diff });
            // register motion detected and block out futher motion detection
            this.hasTapped = true;
            setTimeout(() => {
              this.hasTapped = false;
            }, 300);
            // now send
            if (this._smartDrive && this._smartDrive.ableToSend) {
              if (this.motorOn) {
                Log.D('Vibrating for tap while connected to SD and motor on!');
                this._vibrator.cancel();
                this._vibrator.vibrate(250); // vibrate for 250 ms
              }
              Log.D('Sending tap!');
              this._smartDrive
                .sendTap()
                .catch(err => Log.E('could not send tap', err));
            }
          }
        }
      }
    );

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

  disableDeviceSensors() {
    Log.D('Disabling device sensors.');
    try {
      this._sensorService.stopDeviceSensors();
    } catch (err) {
      Log.E('Error disabling the device sensors:', err);
    }
    this._isListeningDeviceSensors = false;
    return;
  }

  enableDeviceSensors() {
    Log.D('Enable device sensors...');
    try {
      if (!this._isListeningDeviceSensors) {
        this._sensorService.startDeviceSensors(SensorDelay.GAME, 500000);
        this._isListeningDeviceSensors = true;
      }
    } catch (err) {
      Log.E('Error starting the device sensors', err);
    }
  }

  /**
   * Heart Rate Handlers
   */
  async toggleHeartRate() {
    if (this.isGettingHeartRate) {
      this.stopHeartRate();
    } else {
      this.startHeartRate();
    }
  }

  async stopHeartRate() {
    if (!this.isGettingHeartRate) {
      return;
    }
    this._sensorService.androidSensorClass.stopSensor(this._heartRateSensor);
    this.isGettingHeartRate = false;
    this.updateHeartRateButtonText('Read Heart Rate');
  }

  async startHeartRate() {
    if (this.isGettingHeartRate) {
      return;
    }

    try {
      // make sure we have permisson for body sensors
      const hasPermission = permissions.hasPermission(
        android.Manifest.permission.BODY_SENSORS
      );
      if (!hasPermission) {
        await permissions
          .requestPermission(android.Manifest.permission.BODY_SENSORS)
          .catch(error => {
            Log.E(error);
            return;
          });
      }

      // start the heart rate sensor
      this._heartRateSensor = this._sensorService.androidSensorClass.startSensor(
        android.hardware.Sensor.TYPE_HEART_RATE,
        SensorDelay.UI
      );

      this.isGettingHeartRate = true;
      this.updateHeartRateButtonText('Reading Heart Rate');
    } catch (error) {
      Log.E({ error });
    }
  }

  updateHeartRateButtonText(newText?: string) {
    const item = this.items.getItem(this._heartRateButtonIndex);
    if (newText) {
      item.text = newText;
    } else {
      let accStr = 'Unknown';
      switch (this.heartRateAccuracy) {
        case android.hardware.SensorManager.SENSOR_STATUS_UNRELIABLE:
          accStr = 'Unreliable';
          break;
        case android.hardware.SensorManager.SENSOR_STATUS_ACCURACY_LOW:
          accStr = 'Low';
          break;
        case android.hardware.SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM:
          accStr = 'Medium';
          break;
        case android.hardware.SensorManager.SENSOR_STATUS_ACCURACY_HIGH:
          accStr = 'High';
          break;
        case 0xffffffff:
        case android.hardware.SensorManager.SENSOR_STATUS_NO_CONTACT:
          accStr = 'No Contact';
          break;
      }
      item.text = `HR: ${this.heartRate}, ACC: ${accStr}`;
    }
    this.items.setItem(this._heartRateButtonIndex, item);
  }

  onUpdatesTap() {
    showSuccess('No updates available.', 4);
  }

  /**
   * Setings page handlers
   */
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
    // showOffScreenLayout(this._settingsLayout);
    // this.isSettingsLayoutEnabled = true;damn

    bradTest()
      .then(result => {
        console.log('bradTest', result);
      })
      .catch(error => {
        console.log('bradTest', error);
      });

    getLastLocation()
      .then(result => {
        console.log('getLastLocation', result);
      })
      .catch(error => {
        console.log('getLastLocation', error);
      });
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

  /**
   * Data Collection Handlers
   */
  onToggleDataCollection() {
    if (this._isCollectingData) {
      this.stopDataCollection();
    } else {
      this.startDataCollection();
    }
  }

  periodicDataStore() {
    if (sensorData.length) {
      // store the data on the device
      const key = LS.length;
      LS.setItemObject(key, sensorData);
    }
    // clear out the data
    sensorData = [];
  }

  periodicDataSend() {
    if (!LS.length) {
      showSuccess('All Data saved.');
      Log.D('Vibrating for successful data sending!');
      this._vibrator.cancel();
      this._vibrator.vibrate(500); // vibrate for 500 ms
      return;
    }
    // get the first (oldest) record
    const key = LS.key(0);
    const record = LS.getItem(key);
    // send the data to the server
    this._sensorService
      .saveRecord(record)
      .then(() => {
        // delete previous record
        LS.removeItem(key);
        // send records with 1 second between sends
        setTimeout(this.periodicDataSend.bind(this), 1000);
      })
      .catch(error => {
        showFailure('Error saving sensor data.');
        Log.D('Vibrating for unsuccessful data collection!');
        this._vibrator.cancel();
        this._vibrator.vibrate(1000); // vibrate for 1000 ms
        // wait longer between sends since the data collection failed
        setTimeout(this.periodicDataSend.bind(this), 60000);
      });
  }

  stopDataCollection() {
    // make sure we're collecting data
    if (!this._isCollectingData) {
      return;
    }
    // stop collecting data
    this._isCollectingData = false;
    // update display
    this._updateDataCollectionButtonText(`Start Data Collection`);
    // disable sensors if not needed for SD control
    if (!this._powerAssistActive) {
      this.disableDeviceSensors();
    }
    // disable heart rate
    this.stopHeartRate();
    // clear out the interval
    clearInterval(sensorInterval);
    // make sure all data is stored
    this.periodicDataStore();
    // now start the sending process
    setTimeout(this.periodicDataSend.bind(this), 500);
  }

  async startDataCollection() {
    try {
      // enable heart rate sensor separate from other sensors
      await this.startHeartRate();
      // enable sensors
      this.enableDeviceSensors();
      // start collecting data
      this._isCollectingData = true;
      this._updateDataCollectionButtonText('Stop Data Collection');
      // set interval
      sensorInterval = setInterval(this.periodicDataStore.bind(this), 60000);
    } catch (error) {
      Log.E(error);
    }
  }

  private _updateDataCollectionButtonText(newText: string) {
    const item = this.items.getItem(this._dataCollectionButtonIndex);
    item.text = newText;
    this.items.setItem(this._dataCollectionButtonIndex, item);
  }

  /**
   * Smart Drive Interaction and Data Management
   */
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

  togglePowerAssist() {
    if (this._powerAssistActive) {
      this._powerAssistActive = false;
      this.updatePowerAssistButtonText('Power Assist OFF');
      // turn off the motor if SD is connected
      if (this._smartDrive && this._smartDrive.ableToSend) {
        Log.D('Turning off Motor!');
        this._smartDrive
          .stopMotor()
          .catch(err => Log.E('Could not stop motor', err));
      }
      // now disable sensors
      if (!this._isCollectingData) {
        this.disableDeviceSensors();
      }
      this.onDisconnectTap();
    } else {
      this.connectToSavedSmartDrive().then(didConnect => {
        if (didConnect) {
          this._powerAssistActive = true;
          this.enableDeviceSensors();
          this.updatePowerAssistButtonText('Power Assist ON');
        }
      });
    }
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

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  async onMotorInfo(args: any) {
    // Log.D('onMotorInfo event');

    if (this.motorOn !== this._smartDrive.driving) {
      if (this._smartDrive.driving) {
        Log.D('Vibrating for motor turning on!');
        this._vibrator.cancel();
        this._vibrator.vibrate(250); // vibrate for 250 ms
      } else {
        Log.D('Vibrating for motor turning off!');
        this._vibrator.cancel();
        this._vibrator.vibrate([100, 50, 100]); // vibrate twice
      }
    }
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
  }
}
