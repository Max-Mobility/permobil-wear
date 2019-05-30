import {
  BluetoothService,
  DataKeys,
  Log,
  Prop,
  SensorChangedEventData,
  SensorService,
  SentryService,
  SERVICES,
  SmartDrive
} from '@permobil/core';
import { ReflectiveInjector } from 'injection-js';
import { SensorDelay } from 'nativescript-android-sensors';
import { AnimatedCircle } from 'nativescript-animated-circle';
import { Pager } from 'nativescript-pager';
import { Sentry } from 'nativescript-sentry';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { Vibrate } from 'nativescript-vibrate';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import {
  showFailure,
  showSuccess
} from 'nativescript-wear-os/packages/dialogs';
import * as applicationModule from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { Observable } from 'tns-core-modules/data/observable';
import { device } from 'tns-core-modules/platform';
import { action } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { Repeater } from 'tns-core-modules/ui/repeater';
// import { injector } from '../../app';
import {
  currentSystemTime,
  currentSystemTimeMeridiem,
  hideOffScreenLayout,
  showOffScreenLayout
} from '../../utils';

namespace PowerAssist {
  export const InactiveRingColor = '#000000';
  export const InactiveButtonColor = new Color('#2fa52f');
  export const InactiveButtonText = 'Activate Power Assist';

  export const ActiveRingColor = '#009ac7';
  export const ActiveButtonColor = new Color('#a52f2f');
  export const ActiveButtonText = 'Deactivate Power Assist';

  export const TrainingRingColor = '#2fa52f';
  export const TrainingButtonColor = new Color('#2fa52f');
  export const TrainingButtonText = 'Exit Training Mode';

  export const TappedRingColor = '#a52f2f';

  export enum State {
    Inactive,
    Active,
    Training
  }
}

export class MainViewModel extends Observable {
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;
  @Prop() watchCurrentBatteryPercentage: number = 0;
  @Prop() powerAssistBtnText: string = PowerAssist.InactiveButtonText;
  @Prop() powerAssistBtnColor: Color = PowerAssist.InactiveButtonColor;
  @Prop() powerAssistRingColor: string = PowerAssist.InactiveRingColor;
  @Prop() topValue: string = '8.2';
  @Prop() topValueDescription: string = 'Estimated Range (MI)';
  @Prop() currentTime;
  @Prop() currentTimeMeridiem;
  @Prop() powerAssistActive: boolean = false;
  @Prop() isTraining: boolean = false;
  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop() isSettingsLayoutEnabled = false;
  @Prop() isChangeSettingsLayoutEnabled = false;
  @Prop() changeSettingKeyString = '';
  @Prop() changeSettingKeyValue;

  /**
   *
   * SmartDrive Related Data
   *
   */
  maxTapSensitivity: number = 3.0;
  minTapSensitivity: number = 0.5;

  /**
   * Boolean to track whether a tap has been performed.
   */
  @Prop() hasTapped = false;

  /**
   * Boolean to handle logic if we have connected to a SD unit.
   */
  @Prop() public connected = false;

  /**
   * Boolean to track if the SmartDrive motor is on.
   */
  @Prop() public motorOn = false;

  /**
   * Data to bind to the Battery Usage Chart repeater.
   */
  @Prop() public batteryUsageData;
  /**
   * Data to bind to the Distance Chart repeater.
   */
  @Prop() public distanceChartData;
  /**
   * Used to indicate the highest value in the distance chart.
   */
  @Prop() distanceChartMaxValue: string;

  /**
   * State Management for Sensor Monitoring / Data Collection
   */
  private _isListeningDeviceSensors = false;
  private watchBeingWorn = false;

  /**
   * SmartDrive Data / state management
   */
  private settings = new SmartDrive.Settings();
  private tempSettings = new SmartDrive.Settings();
  private _smartDrive: SmartDrive;
  private _savedSmartDriveAddress: string = null;
  private _ringTimerId = null;
  private RING_TIMER_INTERVAL_MS = 500;

  /**
   * User interaction objects
   */
  private pager: Pager;
  private powerAssistRing: AnimatedCircle;
  private _settingsLayout: SwipeDismissLayout;
  public _changeSettingsLayout: SwipeDismissLayout;
  private _vibrator: Vibrate = new Vibrate();
  private _sentryService: SentryService;
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;

  constructor() {
    super();

    console.time('Sentry_Init');
    // init sentry - DNS key for permobil-wear Sentry project
    Sentry.init(
      'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
    );
    console.timeEnd('Sentry_Init');

    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this._sentryService = injector.get(SentryService);
    this._bluetoothService = injector.get(BluetoothService);
    this._sensorService = injector.get(SensorService);

    // register for watch battery updates
    // use tns-platform-dclarations to access native APIs (e.g. android.content.Intent)
    const receiverCallback = (androidContext, intent) => {
      const level = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_LEVEL,
        -1
      );
      const scale = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_SCALE,
        -1
      );
      const percent = (level / scale) * 100.0;
      this.watchCurrentBatteryPercentage = percent;
    };

    applicationModule.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_BATTERY_CHANGED,
      receiverCallback
    );

    // improve the time tracking with a service or some watcher to actually watch the SYSTEM CLOCK
    this.currentTime = currentSystemTime();
    setInterval(() => {
      this.currentTime = currentSystemTime();
    }, 20000);

    this.currentTimeMeridiem = currentSystemTimeMeridiem();

    // setup some static data for charts for now
    // need to be storing these locally (local-storage or application-settings)
    // then grabbing the most recent 7 from the data set, possibly include a service call that runs at some point to clear out really old data
    this.batteryUsageData = [
      { day: 'Th', value: '40' },
      { day: 'F', value: '88' },
      { day: 'S', value: '37' },
      { day: 'Su', value: '100' },
      { day: 'M', value: '78' },
      { day: 'T', value: '43' },
      { day: 'W', value: '65' }
    ];

    // this._sensorService.on(
    //   SensorService.AccuracyChanged,
    //   (args: AccuracyChangedEventData) => {
    //     const sensor = args.data.sensor;
    //     const accuracy = args.data.accuracy;
    //     if (sensor.getType() === android.hardware.Sensor.TYPE_HEART_RATE) {
    //       this.heartRateAccuracy = accuracy;
    //       // save the heart rate
    //       appSettings.setNumber(
    //         DataKeys.HEART_RATE,
    //         parseInt(this.heartRate, 10)
    //       );
    //     }
    //   }
    // );

    this._sensorService.on(
      SensorService.SensorChanged,
      (args: SensorChangedEventData) => {
        // if we're using litedata for android sensor plugin option
        // the data structure is simplified to reduce redundant data
        const parsedData = args.data;

        if (
          parsedData.s ===
          android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT
        ) {
          this.watchBeingWorn = (parsedData.d as any).state !== 0.0;
          Log.D('WatchBeingWorn: ' + this.watchBeingWorn);
          if (!this.watchBeingWorn && this.powerAssistActive) {
            // disable power assist if the watch is taken off!
            this.disablePowerAssist();
          }
        }

        if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
          this.handleAccel(parsedData.d);
        }
      }
    );
    // now enable the sensors
    this.enableDeviceSensors();

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = appSettings.getString(DataKeys.SD_SAVED_ADDRESS);
    if (savedSDAddr && savedSDAddr.length) {
      this._savedSmartDriveAddress = savedSDAddr;
    }

    // load settings from memory
    this.loadSettings();

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

  onPagerLoaded(args: any) {
    const page = args.object as Page;
    this.pager = page.getViewById('pager') as Pager;
  }

  onPowerAssistBarLoaded(args: any) {
    const page = args.object as Page;
    this.powerAssistRing = page.getViewById(
      'powerAssistCircle'
    ) as AnimatedCircle;
  }

  handleAccel(acceleration: any) {
    let diff = acceleration.z;
    if (this.motorOn) {
      diff = Math.abs(diff);
    }
    const threshold =
      this.maxTapSensitivity -
      (this.maxTapSensitivity - this.minTapSensitivity) *
        (this.settings.tapSensitivity / 100.0);
    if (diff > threshold) {
      // user has met threshold for tapping
      this.handleTap();
    }
  }

  handleTap() {
    // ignore tapping if we're not in the right mode
    if (!this.powerAssistActive && !this.isTraining) {
      return;
    }
    // ignore tapping if we're not on the users wrist
    if (!this.watchBeingWorn) {
      return;
    }
    // block high frequency tapping
    if (this.hasTapped) {
      return;
    }
    this.hasTapped = true;
    this.updatePowerAssistRing(PowerAssist.TappedRingColor);
    setTimeout(() => {
      this.hasTapped = false;
      this.updatePowerAssistRing();
    }, 300);
    // now send
    if (
      this.powerAssistActive &&
      this._smartDrive &&
      this._smartDrive.ableToSend
    ) {
      if (this.motorOn) {
        Log.D('Vibrating for tap while connected to SD and motor on!');
        this._vibrator.cancel();
        this._vibrator.vibrate(250); // vibrate for 250 ms
      }
      Log.D('Sending tap!');
      this._smartDrive.sendTap().catch(err => Log.E('could not send tap', err));
    }
  }

  stopSmartDrive() {
    // turn off the motor if SD is connected
    if (this._smartDrive && this._smartDrive.ableToSend) {
      Log.D('Turning off Motor!');
      this._smartDrive
        .stopMotor()
        .catch(err => Log.E('Could not stop motor', err));
    }
  }

  activatePowerAssistTap() {
    console.log('activate power assist has been tapped!');
    this.togglePowerAssist();
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
        this._sensorService.startDeviceSensors(SensorDelay.UI, 50000);
        this._isListeningDeviceSensors = true;
      }
    } catch (err) {
      Log.E('Error starting the device sensors', err);
    }
  }

  onLedSettingsTap() {
    Log.D('LED Settings tapped.');
  }

  onUpdatesTap() {
    showSuccess('No updates available.', 4);
  }

  onTrainingTap() {
    Log.D('Trained tapped.');
    this.isTraining = true;
    this.updatePowerAssistRing(PowerAssist.TrainingRingColor);
    if (this.pager) this.pager.selectedIndex = 0;
  }

  onExitTrainingModeTap() {
    this.isTraining = false;
    this.updatePowerAssistRing();
  }

  /**
   * Setings page handlers
   */
  onSettingsLayoutLoaded(args) {
    this._settingsLayout = args.object as SwipeDismissLayout;
    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      Log.D('dimissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._settingsLayout, { x: 500, y: 0 });
      this.isSettingsLayoutEnabled = false;
    });
  }

  onDistanceChartRepeaterLoaded(args) {
    const rpter = args.object as Repeater;
    // need to get distance data at here
    // then handle the data binding and calculating the Max Value for the chart
    // and some sizing checks
    const distanceData = [
      { day: 'Th', value: '1' },
      { day: 'F', value: '2' },
      { day: 'S', value: '5' },
      { day: 'Su', value: '5' },
      { day: 'M', value: '9' },
      { day: 'T', value: '2' },
      { day: 'W', value: '4' }
    ];
    const j = distanceData.reduce((max, obj) => {
      return obj.value > max.value ? obj : max;
    });

    Log.D('Highest Distance Value:', j.value);
    this.distanceChartMaxValue = j.value;

    this.distanceChartData = distanceData;
  }

  onSettingsTap() {
    showOffScreenLayout(this._settingsLayout);
    this.isSettingsLayoutEnabled = true;
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settings);
    Log.D('id: ' + args.object.id);
    const tappedId = args.object.id as string;
    switch (tappedId.toLowerCase()) {
      case 'maxspeed':
        this.changeSettingKeyString = 'Max Speed';
        break;
      case 'acceleration':
        this.changeSettingKeyString = 'Acceleration';
        break;
      case 'tapsensitivity':
        this.changeSettingKeyString = 'Tap Sensitivity';
        break;
      case 'controlmode':
        this.changeSettingKeyString = 'Control Mode';
        break;
      case 'units':
        this.changeSettingKeyString = 'Units';
        break;
      default:
        break;
    }
    this.updateSettingDisplay();
    if (args.object.id) {
    }

    showOffScreenLayout(this._changeSettingsLayout);
    this.isChangeSettingsLayoutEnabled = true;
  }

  updateSettingDisplay() {
    switch (this.changeSettingKeyString) {
      case 'Max Speed':
        this.changeSettingKeyValue = `${this.tempSettings.maxSpeed}%`;
        break;
      case 'Acceleration':
        this.changeSettingKeyValue = `${this.tempSettings.acceleration}%`;
        break;
      case 'Tap Sensitivity':
        this.changeSettingKeyValue = `${this.tempSettings.tapSensitivity}%`;
        break;
      case 'Control Mode':
        this.changeSettingKeyValue = `${this.tempSettings.controlMode}`;
        return;
      case 'Units':
        this.changeSettingKeyValue = `${this.tempSettings.units}`;
        return;
      default:
        break;
    }
  }

  onCancelChangesTap() {
    Log.D('Cancelled the changes, do NOT save any changes to config setting.');
    hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    this.isChangeSettingsLayoutEnabled = false;
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, {
      x: 500,
      y: 0
    });
    this.isChangeSettingsLayoutEnabled = false;
    Log.D('Confirmed the value, need to save config setting.');
    // SAVE THE VALUE to local data for the setting user has selected
    this.settings.copy(this.tempSettings);
    this.saveSettings();
  }

  onIncreaseSettingsTap() {
    Log.D('increase current settings change key value and save to local data');
    this.tempSettings.increase(this.changeSettingKeyString);
    this.updateSettingDisplay();
  }

  onDecreaseSettingsTap(args) {
    Log.D('decrease current settings change key value and save to local data');
    this.tempSettings.decrease(this.changeSettingKeyString);
    this.updateSettingDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this._changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button without starting the swipe behavior
    (this._changeSettingsLayout as any).swipeable = false;
    // this._changeSettingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
    //   Log.D('dimissedEvent', args.object);
    //   // hide the offscreen layout when dismissed
    //   hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    //   this.isChangeSettingsLayoutEnabled = false;
    // });
  }

  /**
   * Smart Drive Interaction and Data Management
   */

  loadSettings() {
    this.settings.maxSpeed = appSettings.getNumber(DataKeys.SD_MAX_SPEED) || 70;
    this.settings.acceleration =
      appSettings.getNumber(DataKeys.SD_ACCELERATION) || 30;
    this.settings.tapSensitivity =
      appSettings.getNumber(DataKeys.SD_TAP_SENSITIVITY) || 100;
    this.settings.controlMode =
      appSettings.getString(DataKeys.SD_CONTROL_MODE) || 'MX2+';
    this.settings.units = appSettings.getString(DataKeys.SD_UNITS) || 'English';
  }

  saveSettings() {
    appSettings.setNumber(DataKeys.SD_MAX_SPEED, this.settings.maxSpeed);
    appSettings.setNumber(DataKeys.SD_ACCELERATION, this.settings.acceleration);
    appSettings.setNumber(
      DataKeys.SD_TAP_SENSITIVITY,
      this.settings.tapSensitivity
    );
    appSettings.setString(DataKeys.SD_CONTROL_MODE, this.settings.controlMode);
    appSettings.setString(DataKeys.SD_UNITS, this.settings.units);
  }

  updatePowerAssistRing(color?: any) {
    if (color) {
      this.powerAssistRingColor = color;
    } else {
      if (this.powerAssistActive) {
        this.powerAssistRingColor = PowerAssist.ActiveRingColor;
      } else {
        if (this.isTraining)
          this.powerAssistRingColor = PowerAssist.TrainingRingColor;
        else this.powerAssistRingColor = PowerAssist.ActiveRingColor;
      }
    }
    if (this.powerAssistRing)
      (this.powerAssistRing as any).rimColor = this.powerAssistRingColor;
  }

  updatePowerAssistButton(state: PowerAssist.State) {
    switch (state) {
      case PowerAssist.State.Active:
        this.powerAssistBtnText = PowerAssist.ActiveButtonText;
        this.powerAssistBtnColor = PowerAssist.ActiveButtonColor;
        break;
      case PowerAssist.State.Inactive:
        this.powerAssistBtnText = PowerAssist.InactiveButtonText;
        this.powerAssistBtnColor = PowerAssist.InactiveButtonColor;
        break;
    }
  }

  blinkPowerAssistRing() {
    if (this.powerAssistActive) {
      if (this.motorOn) {
        this.updatePowerAssistRing(PowerAssist.ActiveRingColor);
      } else {
        if (this.powerAssistRingColor === PowerAssist.InactiveRingColor) {
          this.updatePowerAssistRing(PowerAssist.ActiveRingColor);
        } else {
          this.updatePowerAssistRing(PowerAssist.InactiveRingColor);
        }
      }
    }
  }

  enablePowerAssist() {
    // only enable power assist if we're on the user's wrist
    if (!this.watchBeingWorn) {
      showFailure('You must wear the watch to activate power assist.');
      return;
    }
    this.connectToSavedSmartDrive()
      .then(didConnect => {
        if (didConnect) {
          this.powerAssistActive = true;
          this._ringTimerId = setInterval(
            this.blinkPowerAssistRing.bind(this),
            this.RING_TIMER_INTERVAL_MS
          );
          this.updatePowerAssistRing(PowerAssist.ActiveRingColor);
          this.updatePowerAssistButton(PowerAssist.State.Active);
        }
      })
      .catch(err => {});
  }

  disablePowerAssist() {
    this.powerAssistActive = false;
    this.motorOn = false;
    if (this._ringTimerId) {
      clearInterval(this._ringTimerId);
    }
    this.updatePowerAssistRing(PowerAssist.InactiveRingColor);
    this.updatePowerAssistButton(PowerAssist.State.Inactive);
    // turn off the smartdrive
    this.stopSmartDrive();
    this.onDisconnectTap();
  }

  togglePowerAssist() {
    if (this.powerAssistActive) {
      this.disablePowerAssist();
    } else {
      this.enablePowerAssist();
    }
  }

  saveNewSmartDrive(): Promise<any> {
    Log.D('saveNewSmartDrive()');

    new Toasty(
      'Scanning for SmartDrives...',
      ToastDuration.LONG,
      ToastPosition.CENTER
    ).show();

    // scan for smartdrives
    return this._bluetoothService
      .scanForSmartDrives(3)
      .then(() => {
        Log.D('Discovered SmartDrives', BluetoothService.SmartDrives);

        // make sure we have smartdrives
        if (BluetoothService.SmartDrives.length <= 0) {
          showFailure('No SmartDrives found nearby.');
          return false;
        }

        // these are the smartdrives that are pushed into an array on the bluetooth service
        const sds = BluetoothService.SmartDrives;

        // map the smart drives to get all of the addresses
        const addresses = sds.map(sd => `${sd.address}`);

        // present action dialog to select which smartdrive to connect to
        return action({
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
            return true;
          } else {
            return false;
          }
        });
      })
      .catch(error => {
        Log.E('could not scan', error);
        return false;
      });
  }

  connectToSmartDrive(smartDrive) {
    if (!smartDrive) return;
    this._smartDrive = smartDrive;
    // set the event listeners for mcu_version_event and smartdrive_distance_event
    this._smartDrive.on(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
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
    // send the current settings to the SD
    this._smartDrive.sendSettingsObject(this.settings);
    this.connected = true;
    showSuccess(`Connected to ${this._smartDrive.address}`, 2);
  }

  connectToSavedSmartDrive(): Promise<any> {
    Log.D('connectToSavedSmartDrive()');
    if (
      this._savedSmartDriveAddress === null ||
      this._savedSmartDriveAddress.length === 0
    ) {
      return this.saveNewSmartDrive().then(didSave => {
        if (didSave) {
          this.connectToSavedSmartDrive();
        }
      });
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
        this.motorOn = false;
        new Toasty(`Disconnected from ${this._smartDrive.address}`)
          .setToastPosition(ToastPosition.CENTER)
          .show();
      });
    }
  }

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  async onSmartDriveDisconnect(args: any) {
    this.motorOn = false;
    this.powerAssistActive = false;
    this._smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
  }

  async onMotorInfo(args: any) {
    // Log.D('onMotorInfo event');

    // update motor state
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
    // update battery percentage
    this.smartDriveCurrentBatteryPercentage = this._smartDrive.battery;
    appSettings.setNumber(DataKeys.SD_BATTERY, this._smartDrive.battery);
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
