import {
  BluetoothService,
  DataKeys,
  KinveyService,
  Log,
  NetworkService,
  Prop,
  SensorChangedEventData,
  SensorService,
  SentryService,
  SERVICES,
  SmartDrive,
  SqliteService
} from '@permobil/core';
import { closestIndexTo, format, isSameDay, isToday, subDays } from 'date-fns';
import { ReflectiveInjector } from 'injection-js';
import clamp from 'lodash/clamp';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import once from 'lodash/once';
import throttle from 'lodash/throttle';
import { AnimatedCircle } from 'nativescript-animated-circle';
import { allowSleepAgain, keepAwake } from 'nativescript-insomnia';
import { Pager } from 'nativescript-pager';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { Vibrate } from 'nativescript-vibrate';
import * as LS from 'nativescript-localstorage';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import {
  showFailure,
  showSuccess
} from 'nativescript-wear-os/packages/dialogs';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { request, getFile } from 'tns-core-modules/http';
import { Color } from 'tns-core-modules/color';
import { Observable } from 'tns-core-modules/data/observable';
import {
  ObservableArray,
  ChangedData
} from 'tns-core-modules/data/observable-array';
import { device } from 'tns-core-modules/platform';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { Page, View } from 'tns-core-modules/ui/page';
import { Repeater } from 'tns-core-modules/ui/repeater';
import { PowerAssist, SmartDriveData } from '../../namespaces';
import { ScrollView, ScrollEventData } from 'tns-core-modules/ui/scroll-view';
import { ItemEventData } from 'tns-core-modules/ui/list-view';
import {
  currentSystemTime,
  currentSystemTimeMeridiem,
  hideOffScreenLayout,
  showOffScreenLayout
} from '../../utils';

const ambientTheme = require('../../scss/theme-ambient.scss').toString();
const defaultTheme = require('../../scss/theme-default.scss').toString();
const retroTheme = require('../../scss/theme-retro.scss').toString();

export class MainViewModel extends Observable {
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;
  @Prop() watchCurrentBatteryPercentage: number = 0;
  @Prop() watchIsCharging: boolean = false;
  @Prop() powerAssistRingColor: Color = PowerAssist.InactiveRingColor;
  @Prop() estimatedDistance: number = 0.0;
  @Prop() estimatedDistanceDisplay: string = '0.0';
  @Prop() estimatedDistanceDescription: string = 'Estimated Range (mi)';
  @Prop() currentSpeed: number = 0.0;
  @Prop() currentSpeedDisplay: string = '0.0';
  @Prop() currentSpeedDescription: string = 'Speed (mph)';
  @Prop() currentTime;
  @Prop() currentTimeMeridiem;
  @Prop() powerAssistActive: boolean = false;
  @Prop() isTraining: boolean = false;
  @Prop() pairSmartDriveText: string = 'Pair SmartDrive';
  @Prop() hasUpdateData: boolean = false;
  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop() isSettingsLayoutEnabled = false;
  @Prop() isChangeSettingsLayoutEnabled = false;
  @Prop() changeSettingKeyString = '';
  @Prop() changeSettingKeyValue;

  /**
   * Boolean to track the error history swipe layout visibility.
   */
  @Prop() isErrorHistoryLayoutEnabled = false;
  @Prop() isAboutLayoutEnabled = false;

  /**
   * Boolean to track the updates swipe layout visibility.
   */
  @Prop() isUpdatesLayoutEnabled = false;
  @Prop() updateProgressText: string = 'Checking for Updates';
  @Prop() checkingForUpdates: boolean = false;

  /**
   *
   * SmartDrive Related Data
   *
   */
  lastTapTime: number;
  lastAccelZ: number = null;
  tapLockoutTimeMs: number = 200;
  tapTimeoutId: any = null;
  maxTapSensitivity: number = 3.5;
  minTapSensitivity: number = 1.5;
  SENSOR_DELAY_US: number = 40 * 1000;
  MAX_REPORTING_INTERVAL_US: number = 20 * 1000;
  minRangeFactor: number = 2.0 / 100.0; // never estimate less than 2 mi per full charge
  maxRangeFactor: number = 12.0 / 100.0; // never estimate more than 12 mi per full charge

  /**
   * State tracking for power assist
   */
  @Prop() powerAssistState: PowerAssist.State = PowerAssist.State.Inactive;

  /**
   * Boolean to track if the SmartDrive motor is on.
   */
  @Prop() public motorOn = false;

  /**
   * Boolean to track if the user has tapped (for indication).
   */
  @Prop() public hasTapped = false;

  /**
   * Data to bind to the Battery Usage Chart repeater.
   */
  @Prop() public batteryChartData;
  /**
   * Used to indicate the highest value in the battery chart.
   */
  @Prop() batteryChartMaxValue: string;
  /**
   * Data to bind to the Distance Chart repeater.
   */
  @Prop() public distanceChartData;
  /**
   * Used to indicate the highest value in the distance chart.
   */
  @Prop() distanceChartMaxValue: string;
  /**
   * Units of distance for the distance chart.
   */
  @Prop() distanceUnits: string = 'mi';

  /**
   * Data to bind to the Error History repeater
   */
  @Prop() public errorHistoryData = new ObservableArray();

  @Prop() public mcuVersion: string = '---';
  @Prop() public bleVersion: string = '---';
  @Prop() public sdSerialNumber: string = '---';
  @Prop() public watchSerialNumber: string = '---';
  @Prop() public appVersion: string = '---';
  @Prop() public databaseId: string = KinveyService.api_app_key;

  /**
   * State Management for Sensor Monitoring / Data Collection
   */
  private _isListeningDeviceSensors = false;
  private watchBeingWorn = false;

  /**
   * SmartDrive Data / state management
   */
  public smartDrive: SmartDrive;
  private settings = new SmartDrive.Settings();
  private tempSettings = new SmartDrive.Settings();
  private throttleSettings = new SmartDrive.ThrottleSettings();
  private tempThrottleSettings = new SmartDrive.ThrottleSettings();
  private hasSentSettings: boolean = false;
  private _savedSmartDriveAddress: string = null;
  private _ringTimerId = null;
  private RING_TIMER_INTERVAL_MS = 500;
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;
  private DATABASE_SAVE_INTERVAL_MS = 10 * 1000;
  private _lastChartDay = null;

  /**
   * User interaction objects
   */
  private wakeLock: any = null;
  private pager: Pager;
  private settingsScrollView: ScrollView;
  private errorsScrollView: ScrollView;
  private aboutScrollView: ScrollView;
  private updateProgressCircle: AnimatedCircle;
  private _settingsLayout: SwipeDismissLayout;
  public _changeSettingsLayout: SwipeDismissLayout;
  private _errorHistoryLayout: SwipeDismissLayout;
  private _aboutLayout: SwipeDismissLayout;
  private _updatesLayout: SwipeDismissLayout;
  private _vibrator: Vibrate = new Vibrate();
  private _sentryService: SentryService;
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;
  private _sqliteService: SqliteService;
  private _networkService: NetworkService;
  private _kinveyService: KinveyService;

  private _throttledSmartDriveSaveFn: any = null;
  private _onceSendSmartDriveSettings: any = null;

  private chargingWorkTimeoutId: any = null;

  isActivityThis(activity: any) {
    // TODO: This is a hack to determine which activity is being updated!
    return `${activity}`.includes('com.permobil.smartdrive.MainActivity');
  }

  requestReadPhoneStatePermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // grab the permission dialog result
      application.android.on(
        application.AndroidApplication.activityRequestPermissionsEvent,
        (args: application.AndroidActivityRequestPermissionsEventData) => {
          for (let i = 0; i < args.permissions.length; i++) {
            if (
              args.grantResults[i] ===
              android.content.pm.PackageManager.PERMISSION_DENIED
            ) {
              reject('Permission denied');
              return;
            }
          }
          resolve();
        }
      );

      const activity =
        application.android.foregroundActivity ||
        application.android.startActivity;

      // invoke the permission dialog
      (android.support.v4.app.ActivityCompat as any).requestPermissions(
        activity,
        [android.Manifest.permission.READ_PHONE_STATE],
        227
      );
    });
  }

  constructor() {
    super();

    // initialize the wake lock here
    const context = android.content.Context;
    const powerManager = application.android.context.getSystemService(
      context.POWER_SERVICE
    );
    this.wakeLock = powerManager.newWakeLock(
      android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK,
      'com.permobil.smartdrive.wearos::WakeLock'
    );

    // handle ambient mode callbacks
    application.on('updateAmbient', args => {
      Log.D('updateAmbient', args.data, currentSystemTime());
      this.currentTime = currentSystemTime();
      this.currentTimeMeridiem = currentSystemTimeMeridiem();
    });

    // Activity lifecycle event handlers
    application.android.on(
      application.AndroidApplication.activityPausedEvent,
      (args: application.AndroidActivityBundleEventData) => {
        if (this.isActivityThis(args.activity)) {
          // paused happens any time a new activity is shown
          // in front, e.g. showSuccess / showFailure - so we
          // probably don't want to fullstop on paused
          // TODO: determine if we want this!
          this.fullStop();
        }
      }
    );
    application.android.on(
      application.AndroidApplication.activityResumedEvent,
      (args: application.AndroidActivityBundleEventData) => {
        if (this.isActivityThis(args.activity)) {
          // resumed happens after an app is re-opened out of
          // suspend, even though the app level resume event
          // doesn't seem to fire. Therefore we want to make
          // sure to re-enable device sensors since the
          // suspend event will have disabled them.
          this.enableDeviceSensors();
        }
      }
    );
    application.android.on(
      application.AndroidApplication.activityStoppedEvent,
      (args: application.AndroidActivityBundleEventData) => {
        if (this.isActivityThis(args.activity)) {
          // similar to the app suspend / exit event.
          this.fullStop();
        }
      }
    );

    // handle application lifecycle events
    this.registerAppEventHandlers();

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
    this._sqliteService = injector.get(SqliteService);
    this._networkService = injector.get(NetworkService);
    this._kinveyService = injector.get(KinveyService);

    // register for network service events
    this.registerNetworkEventHandlers();

    console.time('SQLite_Init');
    // create / load tables for smartdrive data
    this._sqliteService
      .makeTable(
        SmartDriveData.Info.TableName,
        SmartDriveData.Info.IdName,
        SmartDriveData.Info.Fields
      )
      .then(() => {
        return this._sqliteService.makeTable(
          SmartDriveData.Errors.TableName,
          SmartDriveData.Errors.IdName,
          SmartDriveData.Errors.Fields
        );
      })
      .then(() => {
        return this._sqliteService.makeTable(
          SmartDriveData.Firmwares.TableName,
          SmartDriveData.Firmwares.IdName,
          SmartDriveData.Firmwares.Fields
        );
      })
      .then(() => {
        Log.D('Tables complete');
        console.timeEnd('SQLite_Init');
      })
      .catch(err => {
        Log.E(`Couldn't make table:`, err);
      });

    // load serial number from settings / memory
    const savedSerial = appSettings.getString(DataKeys.WATCH_SERIAL_NUMBER);
    if (savedSerial && savedSerial.length) {
      this.watchSerialNumber = savedSerial;
      this._kinveyService.watch_serial_number = this.watchSerialNumber;
    }
    const packageManager = application.android.context.getPackageManager();
    const packageInfo = packageManager.getPackageInfo(
      application.android.context.getPackageName(),
      0
    );
    const versionName = packageInfo.versionName;
    const versionCode = packageInfo.versionCode;
    this.appVersion = versionName;

    // handle ambient mode callbacks
    application.on('enterAmbient', args => {
      Log.D('*** enterAmbient ***');
      themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');

      if (this.pager) {
        const children = this.pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i);
          child._onCssStateChange();
        }
      }
    });

    // handle ambient mode callbacks
    application.on('exitAmbient', args => {
      Log.D('*** exitAmbient ***');
      themes.applyThemeCss(defaultTheme, 'theme-default.scss');

      if (this.pager) {
        const children = this.pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i) as View;
          child._onCssStateChange();
        }
      }

      const savedSerial = appSettings.getString(DataKeys.WATCH_SERIAL_NUMBER);
      if (!savedSerial) {
        // update about page info
        Log.D('Requesting permissions!');
        this.requestReadPhoneStatePermission()
          .then(p => {
            this.watchSerialNumber = android.os.Build.getSerial();
            appSettings.setString(
              DataKeys.WATCH_SERIAL_NUMBER,
              this.watchSerialNumber
            );
            this._kinveyService.watch_serial_number = this.watchSerialNumber;
          })
          .catch(e => {
            Log.E('permission denied!', e);
          });
      }
    });

    // make throttled save function - not called more than once every 10 seconds
    this._throttledSmartDriveSaveFn = throttle(
      this.saveUsageInfoToDatabase,
      this.DATABASE_SAVE_INTERVAL_MS,
      { leading: true, trailing: false }
    );

    // register for watch battery updates
    const batteryReceiverCallback = (
      androidContext: android.content.Context,
      intent: android.content.Intent
    ) => {
      // get the info from the event
      const level = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_LEVEL,
        -1
      );
      const scale = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_SCALE,
        -1
      );
      const plugged = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_PLUGGED,
        -1
      );
      const percent = (level / scale) * 100.0;
      // update the battery display
      this.watchCurrentBatteryPercentage = percent;
      // are we charging
      this.watchIsCharging =
        plugged === android.os.BatteryManager.BATTERY_PLUGGED_AC ||
        plugged === android.os.BatteryManager.BATTERY_PLUGGED_USB ||
        plugged === android.os.BatteryManager.BATTERY_PLUGGED_WIRELESS;
      if (this.watchIsCharging && this.chargingWorkTimeoutId === null) {
        // do work that we need while charging
        this.chargingWorkTimeoutId = setTimeout(
          this.doWhileCharged.bind(this),
          this.CHARGING_WORK_PERIOD_MS
        );
      }
    };

    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_BATTERY_CHANGED,
      batteryReceiverCallback
    );

    // monitor the clock / system time for display and logging:
    this.currentTime = currentSystemTime();
    this.currentTimeMeridiem = currentSystemTimeMeridiem();
    const timeReceiverCallback = (androidContext, intent) => {
      Log.D('timeReceiverCallback', currentSystemTime());
      this.currentTime = currentSystemTime();
      this.currentTimeMeridiem = currentSystemTimeMeridiem();
      // update charts if date has changed
      if (!isSameDay(new Date(), this._lastChartDay)) {
        this.updateChartData();
      }
    };
    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIME_TICK,
      timeReceiverCallback
    );
    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIMEZONE_CHANGED,
      timeReceiverCallback
    );

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
          if (!this.watchBeingWorn && this.powerAssistActive) {
            // disable power assist if the watch is taken off!
            this.disablePowerAssist();
          }
        }

        if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
          this.handleAccel(parsedData.d, parsedData.ts);
        }
      }
    );

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = appSettings.getString(DataKeys.SD_SAVED_ADDRESS);
    if (savedSDAddr && savedSDAddr.length) {
      this.updateSmartDrive(savedSDAddr);
    }

    // load settings from memory
    this.loadSettings();
    this.updateSettingsDisplay();

    Log.D(
      'Device Info: ---',
      'Serial Number: ' + this.watchSerialNumber,
      'Manufacturer: ' + device.manufacturer,
      'Model: ' + device.model,
      'OS: ' + device.os,
      'OS Version: ' + device.osVersion,
      'SDK Version: ' + device.sdkVersion,
      'Region: ' + device.region,
      'Device Language: ' + device.language,
      'UUID: ' + device.uuid
    );

    themes.applyThemeCss(defaultTheme, 'theme-default.scss');
  }

  fullStop() {
    this.disableDeviceSensors();
    this.disablePowerAssist();
  }

  updateSmartDrive(address: string) {
    this._savedSmartDriveAddress = address;
    this.smartDrive = this._bluetoothService.getOrMakeSmartDrive({
      address: address
    });
  }

  /**
   * Application lifecycle event handlers
   */
  registerAppEventHandlers() {
    application.on(application.launchEvent, this.onAppLaunch.bind(this));
    application.on(application.resumeEvent, this.onAppResume.bind(this));
    application.on(application.suspendEvent, this.onAppSuspend.bind(this));
    application.on(application.exitEvent, this.onAppExit.bind(this));
    application.on(application.lowMemoryEvent, this.onAppLowMemory.bind(this));
    application.on(
      application.uncaughtErrorEvent,
      this.onAppUncaughtError.bind(this)
    );
  }

  unregisterAppEventHandlers() {
    application.off(application.launchEvent, this.onAppLaunch.bind(this));
    application.off(application.resumeEvent, this.onAppResume.bind(this));
    application.off(application.suspendEvent, this.onAppSuspend.bind(this));
    application.off(application.exitEvent, this.onAppExit.bind(this));
    application.off(application.lowMemoryEvent, this.onAppLowMemory.bind(this));
    application.off(
      application.uncaughtErrorEvent,
      this.onAppUncaughtError.bind(this)
    );
  }

  onAppLaunch(args?: any) {}

  onAppResume(args?: any) {}

  onAppSuspend(args?: any) {
    this.fullStop();
  }

  onAppExit(args?: any) {
    this.fullStop();
  }

  onAppLowMemory(args?: any) {
    Log.D('App low memory', args.android);
    // TODO: determine if we need to stop for this - we see this
    // even even when the app is using very little memory
    //this.fullStop();
  }

  onAppUncaughtError(args?: any) {
    Log.D('App uncaught error');
    this.fullStop();
  }

  /**
   * Network manager event handlers
   */
  registerNetworkEventHandlers() {
    this._networkService.on(
      NetworkService.network_available_event,
      this.onNetworkAvailable.bind(this)
    );
    this._networkService.on(
      NetworkService.network_lost_event,
      this.onNetworkLost.bind(this)
    );
  }

  unregisterNetworkEventHandlers() {
    this._networkService.off(
      NetworkService.network_available_event,
      this.onNetworkAvailable.bind(this)
    );
    this._networkService.off(
      NetworkService.network_lost_event,
      this.onNetworkLost.bind(this)
    );
  }
  onNetworkAvailable(args: any) {
    // Log.D('Network available - sending errors');
    return this.sendErrorsToServer(10)
      .then(ret => {
        // Log.D('Network available - sending info');
        return this.sendInfosToServer(10);
      })
      .then(ret => {
        // Log.D('Network available - sending settings');
        return this.sendSettingsToServer();
      })
      .then(ret => {
        // Log.D('Have sent data to server - unregistering from network');
        // unregister network since we're done sending that data now
        this._networkService.unregisterNetwork();
      })
      .catch(e => {
        Log.E('Error sending data to server', e);
        // unregister network since we're done sending that data now
        this._networkService.unregisterNetwork();
      });
  }

  onNetworkLost(args: any) {
    Log.D('Network Lost!');
  }

  doWhileCharged() {
    if (this.watchIsCharging) {
      // request network here
      // Log.D('Watch charging - requesting network');
      this._networkService.requestNetwork({
        timeoutMs: this.CHARGING_WORK_PERIOD_MS / 2
      });
      // re-schedule any work that may still need to be done
      this.chargingWorkTimeoutId = setTimeout(
        this.doWhileCharged.bind(this),
        this.CHARGING_WORK_PERIOD_MS
      );
    } else {
      // clear the timeout id since we're not re-spawning it
      this.chargingWorkTimeoutId = null;
    }
  }

  /**
   * View Loaded event handlers
   */
  onPagerLoaded(args: any) {
    const page = args.object as Page;
    this.pager = page.getViewById('pager') as Pager;
  }

  tapAxisIsPrimary(accel: any) {
    const max = Math.max(
      Math.abs(accel.z),
      Math.max(Math.abs(accel.x), Math.abs(accel.y))
    );
    const xPercent = Math.abs(accel.x / max);
    const yPercent = Math.abs(accel.y / max);
    const zPercent = Math.abs(accel.z / max);
    const outOfAxisThreshold = 0.5;
    return (
      max > this.minTapSensitivity &&
      zPercent > 0.9 &&
      xPercent < outOfAxisThreshold &&
      yPercent < outOfAxisThreshold
    );
  }

  handleAccel(acceleration: any, timestamp: number) {
    // ignore tapping if we're not in the right mode
    if (!this.powerAssistActive && !this.isTraining) {
      return;
    }
    // ignore tapping if we're not on the users wrist
    if (!this.watchBeingWorn) {
      return;
    }
    // now get the z-axis acceleration
    let acc = acceleration.z;
    let diff = acc - this.lastAccelZ;
    this.lastAccelZ = acc;
    // block motions where the primary axis of movement isn't the
    // z-axis
    if (!this.tapAxisIsPrimary(acceleration)) {
      return;
    }
    // block high frequency tapping
    if (this.lastTapTime !== null) {
      const timeDiffNs = timestamp - this.lastTapTime;
      const timeDiffThreshold = this.tapLockoutTimeMs * 1000 * 1000; // convert to ns
      if (timeDiffNs < timeDiffThreshold) {
        return;
      }
    }
    // respond to both axes for tapping if the motor is on
    if (this.motorOn) {
      diff = Math.abs(diff);
      acc = Math.abs(acc);
    }
    const threshold =
      this.maxTapSensitivity -
      (this.maxTapSensitivity - this.minTapSensitivity) *
        (this.settings.tapSensitivity / 100.0);
    // must have a high enough abs(accel.z) and it must be a jerk
    // movement - high difference between previous accel and current
    // accel
    if (acc > threshold && diff > threshold) {
      // record that there has been a tap
      this.lastTapTime = timestamp;
      // user has met threshold for tapping
      this.handleTap(timestamp);
    }
  }

  handleTap(timestamp: number) {
    this.hasTapped = true;
    // timeout for updating the power assist ring
    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
    }
    this.tapTimeoutId = setTimeout(() => {
      this.hasTapped = false;
    }, (this.tapLockoutTimeMs * 3) / 2);
    // now send
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      this.smartDrive.ableToSend
    ) {
      if (this.motorOn) {
        this._vibrator.cancel();
        this._vibrator.vibrate((this.tapLockoutTimeMs * 3) / 4);
      }
      this.smartDrive.sendTap().catch(err => Log.E('could not send tap', err));
    } else if (this.isTraining) {
      // vibrate for tapping while training
      this._vibrator.cancel();
      this._vibrator.vibrate((this.tapLockoutTimeMs * 3) / 4);
    }
  }

  stopSmartDrive() {
    // turn off the motor if SD is connected
    if (this.smartDrive && this.smartDrive.ableToSend) {
      return this.smartDrive
        .stopMotor()
        .catch(err => Log.E('Could not stop motor', err));
    } else {
      return Promise.resolve();
    }
  }

  activatePowerAssistTap() {
    this.togglePowerAssist();
  }

  disableDeviceSensors() {
    try {
      this._sensorService.stopDeviceSensors();
    } catch (err) {
      Log.E('Error disabling the device sensors:', err);
    }
    this._isListeningDeviceSensors = false;
    return;
  }

  enableDeviceSensors() {
    try {
      if (!this._isListeningDeviceSensors) {
        this._sensorService.startDeviceSensors(
          this.SENSOR_DELAY_US,
          this.MAX_REPORTING_INTERVAL_US
        );
        this._isListeningDeviceSensors = true;
      }
    } catch (err) {
      Log.E('Error starting the device sensors', err);
    }
  }

  onAboutTap() {
    if (this.aboutScrollView) {
      // reset to to the top when entering the page
      this.aboutScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this._aboutLayout);
    this.isAboutLayoutEnabled = true;
  }

  onTrainingTap() {
    this.wakeLock.acquire();
    keepAwake();
    this.isTraining = true;
    this.powerAssistState = PowerAssist.State.Training;
    this.updatePowerAssistRing();
    if (this.pager) this.pager.selectedIndex = 0;
  }

  onExitTrainingModeTap() {
    if (this.wakeLock.isHeld()) this.wakeLock.release();
    allowSleepAgain();
    this.isTraining = false;
    this.powerAssistState = PowerAssist.State.Inactive;
    this.updatePowerAssistRing();
  }

  /**
   * Updates Page Handlers
   */
  onUpdateProgressCircleLoaded(args: any) {
    const page = args.object as Page;
    this.updateProgressCircle = page.getViewById(
      'updateProgressCircle'
    ) as AnimatedCircle;
  }

  onUpdatesTap() {
    if (this.smartDrive) {
      showOffScreenLayout(this._updatesLayout);
      this.isUpdatesLayoutEnabled = true;
      this.checkForUpdates();
    } else {
      showFailure('No SmartDrive paired to the app!');
    }
  }

  onUpdatesLayoutLoaded(args) {
    this._updatesLayout = args.object as SwipeDismissLayout;
    this._updatesLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // Log.D('dismissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._updatesLayout, { x: 500, y: 0 });
      this.isUpdatesLayoutEnabled = false;
    });
  }

  async checkForUpdates() {
    this.updateProgressText = 'Checking for Updates';
    this.checkingForUpdates = true;
    this.hasUpdateData = false;
    let currentVersions = {};
    // @ts-ignore
    this.updateProgressCircle.spin();
    return this.getFirmwareMetadata()
      .then(md => {
        currentVersions = md;
        Log.D('Current FW Versions:', currentVersions);
        const query = {
          $or: [
            { _filename: 'SmartDriveBLE.ota' },
            { _filename: 'SmartDriveMCU.ota' }
          ],
          firmware_file: true
        };
        return this._kinveyService.getFile(undefined, query);
      })
      .then(response => {
        let promises = [];
        const fileMetaDatas = response.content.toJSON().filter(f => {
          const v = SmartDriveData.Firmwares.versionStringToByte(f['version']);
          const fw = f['_filename'];
          return true; //!currentVersions[fw] || v > currentVersions[fw].version;
        });
        if (fileMetaDatas && fileMetaDatas.length) {
          // Log.D('got fileMetaDatas', fileMetaDatas);
          // now download the files
          promises = fileMetaDatas.map(f => {
            let url = f['_downloadURL'];
            // make sure they're https!
            if (!url.startsWith('https:')) {
              url = url.replace('http:', 'https:');
            }
            Log.D('Downloading FW update', f['_filename']);
            return getFile(url).then(data => {
              const fileData = data.readSync();
              return {
                version: SmartDriveData.Firmwares.versionStringToByte(
                  f['version']
                ),
                name: f['_filename'],
                data: new Uint8Array(fileData),
                changes:
                  f['change_notes'][device.language] || f['change_notes']['en']
              };
            });
          });
        }
        return Promise.all(promises);
      })
      .then(files => {
        let promises = [];
        if (files && files.length) {
          Log.D('Updating metadata and writing file data.');
          promises = files.map(f => {
            // update the data in the db
            if (currentVersions[f.name]) {
              // this is a file we have - update the table
              const id = currentVersions[f.name].id;
              // save the binary data to disk
              let fileName = currentVersions[f.name].filename;
              LS.setItem(fileName, f.data);
              // update current versions
              currentVersions[f.name].version = f.version;
              currentVersions[f.name].changes = f.changes;
              return this._sqliteService.updateInTable(
                SmartDriveData.Firmwares.TableName,
                {
                  [SmartDriveData.Firmwares.VersionName]: f.version
                },
                {
                  [SmartDriveData.Firmwares.IdName]: id
                }
              );
            } else {
              // this is a file we don't have in the table
              const newFirmware = SmartDriveData.Firmwares.newFirmware(
                f.version,
                f.name,
                undefined,
                f.changes
              );
              // save the binary data to disk
              const fileName = newFirmware[SmartDriveData.Firmwares.FileName];
              LS.setItem(fileName, f.data);
              // update current versions
              currentVersions[f.name] = {
                version: f.version,
                filename: fileName,
                changes: f.changes
              };
              return this._sqliteService.insertIntoTable(
                SmartDriveData.Firmwares.TableName,
                newFirmware
              );
            }
          });
        }
        return Promise.all(promises);
      })
      .then(() => {
        // now see what we need to do with the data
        Log.D('Finished downloading updates.');
        this.hasUpdateData = true;
        this.updateProgressText = '';
        this.checkingForUpdates = false;
        // @ts-ignore
        this.updateProgressCircle.stopSpinning();
        // do we need to update? - check against smartdrive version
        const bleVersion = currentVersions['SmartDriveBLE.ota'].version;
        const mcuVersion = currentVersions['SmartDriveMCU.ota'].version;
        if (
          !this.smartDrive.isMcuUpToDate(mcuVersion) ||
          !this.smartDrive.isBleUpToDate(bleVersion)
        ) {
          // get info out to tell the user
          const version = SmartDriveData.Firmwares.versionByteToString(
            Math.max(mcuVersion, bleVersion)
          );
          Log.D('got version', version);
          // show dialog to user informing them of the version number and changes
          const title = `Version ${version}`;
          const changes = Object.keys(currentVersions).map(
            k => currentVersions[k].changes
          );
          const msg = flatten(changes).join('\n');
          Log.D('got changes', changes);
          alert({
            title: title,
            message: msg,
            okButtonText: 'Ok'
          }).then(() => {
            Log.D('Beginning SmartDrive update');
            const bleFileName = currentVersions['SmartDriveBLE.ota'].filename;
            const mcuFileName = currentVersions['SmartDriveMCU.ota'].filename;
            const mcuFw = LS.getItem(mcuFileName);
            const bleFw = LS.getItem(bleFileName);
            Log.D('mcu length:', typeof mcuFw, mcuFw.length);
            Log.D('ble length:', typeof bleFw, bleFw.length);
            // disable swipe close of the updates layout
            (this._updatesLayout as any).swipeable = false;
            // smartdrive needs to update
            this.smartDrive
              .performOTA(
                bleFw,
                mcuFw,
                bleVersion,
                mcuVersion,
                300 * 1000,
                true
              )
              .then(otaStatus => {
                const status = otaStatus.replace('OTA', 'Update');
                this.updateProgressText = status;
                Log.D('update status:', otaStatus);
                if (status === 'Update Complete') {
                  showSuccess('SmartDrive update completed successfully!');
                }
                // re-enable swipe close of the updates layout
                (this._updatesLayout as any).swipeable = true;
              })
              .catch(err => {
                const msg = `Update failed: ${err}`;
                Log.E(msg);
                this.updateProgressText = msg;
                showFailure(msg);
                // re-enable swipe close of the updates layout
                (this._updatesLayout as any).swipeable = true;
              });
            // send the start command automatically
            this.smartDrive.onOTAActionTap('ota.action.start');
          });
        } else {
          // smartdrive is already up to date
          hideOffScreenLayout(this._updatesLayout, { x: 500, y: 0 });
          this.isUpdatesLayoutEnabled = false;
          setTimeout(() => {
            showSuccess('SmartDrive is up to date!');
          }, 100);
        }
      })
      .catch(err => {
        Log.E("Couldn't get files:", err);
        this.updateProgressText = `Error getting updates: ${err}`;
        this.hasUpdateData = false;
        this.checkingForUpdates = false;
        // @ts-ignore
        this.updateProgressCircle.stopSpinning();
      });
  }

  cancelUpdates() {
    this.updateProgressText = 'Update Cancelled';
    // re-enable swipe close of the updates layout
    (this._updatesLayout as any).swipeable = true;
    if (this.smartDrive) {
      this.smartDrive.cancelOTA();
    }
  }

  onUpdateAction(args: any) {
    Log.D('update action:', args);
  }

  /**
   * Error History Page Handlers
   */

  onErrorHistoryLayoutLoaded(args) {
    // show the chart
    this._errorHistoryLayout = args.object as SwipeDismissLayout;
    this.errorsScrollView = this._errorHistoryLayout.getViewById(
      'errorsScrollView'
    ) as ScrollView;
    this._errorHistoryLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // Log.D('dismissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._errorHistoryLayout, { x: 500, y: 0 });
      this.isErrorHistoryLayoutEnabled = false;
      // clear the error history data when it's not being displayed to save on memory
      this.errorHistoryData.splice(0, this.errorHistoryData.length);
    });
  }

  /**
   * Setings page handlers
   */
  onSettingsLayoutLoaded(args) {
    this._settingsLayout = args.object as SwipeDismissLayout;
    this.settingsScrollView = this._settingsLayout.getViewById(
      'settingsScrollView'
    ) as ScrollView;
    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // Log.D('dismissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._settingsLayout, { x: 500, y: 0 });
      this.isSettingsLayoutEnabled = false;
    });
  }

  onAboutLayoutLoaded(args) {
    // show the chart
    this._aboutLayout = args.object as SwipeDismissLayout;
    this.aboutScrollView = this._aboutLayout.getViewById(
      'aboutScrollView'
    ) as ScrollView;
    this._aboutLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // Log.D('dismissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._aboutLayout, { x: 500, y: 0 });
      this.isAboutLayoutEnabled = false;
    });
  }

  updateChartData() {
    // Log.D('Updating Chart Data / Display');
    return this.getUsageInfoFromDatabase(7)
      .then(sdData => {
        // we've asked for one more day than needed so that we can
        // compute distance differences
        const oldest = sdData[0];
        const newest = last(sdData);
        let sumDistance = 0;
        // keep track of the most recent day so we know when to update
        this._lastChartDay = new Date(newest.date);
        // remove the oldest so it's not displayed - we only use it
        // to track distance differences
        sdData = sdData.slice(1);
        // update battery data
        const maxBattery = sdData.reduce((max, obj) => {
          return obj.battery > max ? obj.battery : max;
        }, 0);
        const batteryData = sdData.map(e => {
          return {
            day: format(new Date(e.date), 'dd'),
            value: (e.battery * 100.0) / maxBattery
          };
        });
        // Log.D('Highest Battery Value:', maxBattery);
        this.batteryChartMaxValue = maxBattery;
        this.batteryChartData = batteryData;

        // update distance data
        let oldestDist = oldest[SmartDriveData.Info.DriveDistanceName];
        const distanceData = sdData.map(e => {
          const dist = e[SmartDriveData.Info.DriveDistanceName];
          let diff = 0;
          // make sure we only compute diffs between valid distances
          if (oldestDist > 0) {
            diff = dist - oldestDist;
            // used for range computation
            sumDistance += diff;
          }
          oldestDist = Math.max(dist, oldestDist);
          diff = SmartDrive.motorTicksToMiles(diff);
          if (this.settings.units === 'Metric') {
            diff = diff * 1.609;
          }
          return {
            day: format(new Date(e.date), 'dd'),
            value: diff.toFixed(1)
          };
        });
        const maxDist = distanceData.reduce((max, obj) => {
          return obj.value > max ? obj.value : max;
        }, 0);
        distanceData.map(data => {
          data.value = (100.0 * data.value) / maxDist;
        });
        // Log.D('Highest Distance Value:', maxDist);
        this.distanceChartMaxValue = maxDist;
        this.distanceChartData = distanceData;

        // update estimated range based on battery / distance
        let rangeFactor = (this.minRangeFactor + this.maxRangeFactor) / 2.0;
        const totalBatteryUsage = sdData.reduce((usage, obj) => {
          return usage + obj[SmartDriveData.Info.BatteryName];
        }, 0);
        if (sumDistance && totalBatteryUsage) {
          // convert from ticks to miles
          sumDistance = SmartDrive.motorTicksToMiles(sumDistance);
          // now compute the range factor
          rangeFactor = clamp(
            sumDistance / totalBatteryUsage,
            this.minRangeFactor,
            this.maxRangeFactor
          );
        }
        // estimated distance is always in miles
        this.estimatedDistance =
          this.smartDriveCurrentBatteryPercentage * rangeFactor;
        // now actually update the display of the distance
        this.updateSpeedDisplay();
      })
      .catch(err => {});
  }

  onBatteryChartRepeaterLoaded(args) {
    const rpter = args.object as Repeater;
    // get distance data from db here then handle the data binding and
    // calculating the Max Value for the chart and some sizing checks
  }

  onDistanceChartRepeaterLoaded(args) {
    const rpter = args.object as Repeater;
    // get distance data from db here then handle the data binding and
    // calculating the Max Value for the chart and some sizing checks
  }

  onLoadMoreErrors(args: ItemEventData) {
    // TODO: show loading indicator
    this.getRecentErrors(10, this.errorHistoryData.length).then(recents => {
      // TODO: hide loading indicator
      this.errorHistoryData.push(...recents);
      if (!this.errorHistoryData.length) {
        // TODO: say that there were no errors
      }
    });
  }

  showErrorHistory() {
    // clear out any pre-loaded data
    this.errorHistoryData.splice(0, this.errorHistoryData.length);
    if (this.errorsScrollView) {
      // reset to to the top when entering the page
      this.errorsScrollView.scrollToVerticalOffset(0, true);
    }
    // TODO: say that we're loading
    // load the error data
    this.getRecentErrors(10).then(recents => {
      // TODO: hide loading indicator
      this.errorHistoryData.push(...recents);
      if (!this.errorHistoryData.length) {
        // TODO: say that there were no errors
      }
    });
    showOffScreenLayout(this._errorHistoryLayout);
    this.isErrorHistoryLayoutEnabled = true;
  }

  onSettingsTap() {
    if (this.settingsScrollView) {
      // reset to to the top when entering the page
      this.settingsScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this._settingsLayout);
    this.isSettingsLayoutEnabled = true;
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settings);
    this.tempThrottleSettings.copy(this.throttleSettings);
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
      case 'throttlemode':
        this.changeSettingKeyString = 'Throttle Mode';
        break;
      case 'throttlespeed':
        this.changeSettingKeyString = 'Throttle Speed';
        break;
      default:
        break;
    }
    this.updateSettingsChangeDisplay();
    if (args.object.id) {
    }

    showOffScreenLayout(this._changeSettingsLayout);
    this.isChangeSettingsLayoutEnabled = true;
  }

  updateSettingsChangeDisplay() {
    switch (this.changeSettingKeyString) {
      case 'Max Speed':
        this.changeSettingKeyValue = `${this.tempSettings.maxSpeed} %`;
        break;
      case 'Acceleration':
        this.changeSettingKeyValue = `${this.tempSettings.acceleration} %`;
        break;
      case 'Tap Sensitivity':
        this.changeSettingKeyValue = `${this.tempSettings.tapSensitivity} %`;
        break;
      case 'Control Mode':
        this.changeSettingKeyValue = `${this.tempSettings.controlMode}`;
        return;
      case 'Units':
        this.changeSettingKeyValue = `${this.tempSettings.units}`;
        return;
      case 'Throttle Mode':
        this.changeSettingKeyValue = `${this.tempThrottleSettings.throttleMode}`;
        return;
      case 'Throttle Speed':
        this.changeSettingKeyValue = `${this.tempThrottleSettings.maxSpeed} %`;
        return;
      default:
        break;
    }
  }

  onCancelChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    this.isChangeSettingsLayoutEnabled = false;
  }

  updateSettingsDisplay() {
    this.updateSpeedDisplay();
    this.updateChartData();
  }

  updateSpeedDisplay() {
    if (this.settings.units === 'English') {
      // update distance units
      this.distanceUnits = 'mi';
      // update speed display
      this.currentSpeedDisplay = this.currentSpeed.toFixed(1);
      this.currentSpeedDescription = 'Speed (mph)';
      // update estimated range display
      this.estimatedDistanceDisplay = this.estimatedDistance.toFixed(1);
      this.estimatedDistanceDescription = 'Estimated Range (mi)';
    } else {
      // update distance units
      this.distanceUnits = 'km';
      // update speed display
      this.currentSpeedDisplay = (this.currentSpeed * 1.609).toFixed(1);
      this.currentSpeedDescription = 'Speed (kph)';
      // update estimated range display
      this.estimatedDistanceDisplay = (this.estimatedDistance * 1.609).toFixed(
        1
      );
      this.estimatedDistanceDescription = 'Estimated Range (km)';
    }
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, {
      x: 500,
      y: 0
    });
    this.isChangeSettingsLayoutEnabled = false;
    // SAVE THE VALUE to local data for the setting user has selected
    this.settings.copy(this.tempSettings);
    this.throttleSettings.copy(this.tempThrottleSettings);
    this.hasSentSettings = false;
    this.saveSettings();
    // now update any display that needs settings:
    this.updateSettingsDisplay();
    // warning / indication to the user that they've updated their settings
    alert({
      title: 'Saved Settings',
      message:
        "CAUTION: You MUST consult the SmartDrive User's Manual on how changing the settings affects its operation and performance.",
      okButtonText: 'OK'
    });
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.changeSettingKeyString);
    this.tempThrottleSettings.increase(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap(args) {
    this.tempSettings.decrease(this.changeSettingKeyString);
    this.tempThrottleSettings.decrease(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this._changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button without starting the swipe behavior
    (this._changeSettingsLayout as any).swipeable = false;
    // this._changeSettingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
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
    this.throttleSettings.throttleMode =
      appSettings.getString(DataKeys.SD_THROTTLE_MODE) || 'Active';
    this.throttleSettings.maxSpeed =
      appSettings.getNumber(DataKeys.SD_THROTTLE_SPEED) || 70;
    this.hasSentSettings = appSettings.getBoolean(
      DataKeys.SD_SETTINGS_DIRTY_FLAG
    );
  }

  saveSettings() {
    appSettings.setBoolean(
      DataKeys.SD_SETTINGS_DIRTY_FLAG,
      this.hasSentSettings
    );
    appSettings.setNumber(DataKeys.SD_MAX_SPEED, this.settings.maxSpeed);
    appSettings.setNumber(DataKeys.SD_ACCELERATION, this.settings.acceleration);
    appSettings.setNumber(
      DataKeys.SD_TAP_SENSITIVITY,
      this.settings.tapSensitivity
    );
    appSettings.setString(DataKeys.SD_CONTROL_MODE, this.settings.controlMode);
    appSettings.setString(DataKeys.SD_UNITS, this.settings.units);
    appSettings.setString(
      DataKeys.SD_THROTTLE_MODE,
      this.throttleSettings.throttleMode
    );
    appSettings.setNumber(
      DataKeys.SD_THROTTLE_SPEED,
      this.throttleSettings.maxSpeed
    );
  }

  updatePowerAssistRing(color?: any) {
    if (color) {
      this.powerAssistRingColor = color;
    } else {
      switch (this.powerAssistState) {
        case PowerAssist.State.Connected:
          this.powerAssistRingColor = PowerAssist.ConnectedRingColor;
          break;
        case PowerAssist.State.Disconnected:
          this.powerAssistRingColor = PowerAssist.DisconnectedRingColor;
          break;
        case PowerAssist.State.Inactive:
          this.powerAssistRingColor = PowerAssist.InactiveRingColor;
          break;
        case PowerAssist.State.Training:
          this.powerAssistRingColor = PowerAssist.TrainingRingColor;
          break;
      }
    }
  }

  blinkPowerAssistRing() {
    if (this.powerAssistActive) {
      if (this.motorOn) {
        this.updatePowerAssistRing(PowerAssist.ConnectedRingColor);
      } else {
        if (this.powerAssistRingColor === PowerAssist.InactiveRingColor) {
          if (this.smartDrive.ableToSend) {
            this.updatePowerAssistRing(PowerAssist.ConnectedRingColor);
          } else {
            this.updatePowerAssistRing(PowerAssist.DisconnectedRingColor);
          }
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
    this.wakeLock.acquire();
    keepAwake();
    this.powerAssistState = PowerAssist.State.Disconnected;
    this.powerAssistActive = true;
    this.updatePowerAssistRing();
    return this.connectToSavedSmartDrive()
      .then(didConnect => {
        if (didConnect) {
          this._ringTimerId = setInterval(
            this.blinkPowerAssistRing.bind(this),
            this.RING_TIMER_INTERVAL_MS
          );
        } else {
          this.disablePowerAssist();
        }
      })
      .catch(err => {
        this.disablePowerAssist();
      });
  }

  disablePowerAssist() {
    if (this.wakeLock.isHeld()) this.wakeLock.release();
    allowSleepAgain();
    this.powerAssistState = PowerAssist.State.Inactive;
    this.powerAssistActive = false;
    this.motorOn = false;
    if (this._ringTimerId) {
      clearInterval(this._ringTimerId);
    }
    this.updatePowerAssistRing();
    // turn off the smartdrive
    return this.stopSmartDrive()
      .then(() => {
        return this.disconnectFromSmartDrive();
      })
      .catch(err => {
        return this.disconnectFromSmartDrive();
      });
  }

  togglePowerAssist() {
    if (this.powerAssistActive) {
      this.disablePowerAssist();
    } else {
      this.enablePowerAssist();
    }
  }

  saveNewSmartDrive(): Promise<any> {
    let scanDisplayId = null;
    // ensure bluetoothservice is functional
    return this._bluetoothService
      .initialize()
      .then(() => {
        this.pairSmartDriveText = 'Scanning';
        scanDisplayId = setInterval(() => {
          this.pairSmartDriveText += '.';
        }, 1000);
        // scan for smartdrives
        return this._bluetoothService.scanForSmartDrives(3);
      })
      .then(() => {
        clearInterval(scanDisplayId);
        this.pairSmartDriveText = 'Pair SmartDrive';
        Log.D(`Discovered ${BluetoothService.SmartDrives.length} SmartDrives`);

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
          // if user selected one of the smartdrives in the action dialog, attempt to connect to it
          if (addresses.indexOf(result) > -1) {
            // save the smartdrive here
            this.updateSmartDrive(result);
            appSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);
            showSuccess(`Paired to SmartDrive ${result}`);
            return true;
          } else {
            return false;
          }
        });
      })
      .catch(error => {
        clearInterval(scanDisplayId);
        this.pairSmartDriveText = 'Pair SmartDrive';
        Log.E('could not scan', error);
        showFailure(`Could not scan: ${error}`);
        return false;
      });
  }

  connectToSmartDrive(smartDrive) {
    if (!smartDrive) return;
    this.smartDrive = smartDrive;

    // need to make sure we unregister disconnect event since it may have been registered
    this.smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    // set the event listeners for mcu_version_event and smartdrive_distance_event
    this.smartDrive.on(
      SmartDrive.smartdrive_connect_event,
      this.onSmartDriveConnect,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_mcu_version_event,
      this.onSmartDriveVersion,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_distance_event,
      this.onDistance,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_motor_info_event,
      this.onMotorInfo,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_error_event,
      this.onSmartDriveError,
      this
    );

    // now connect to smart drive
    return this.smartDrive
      .connect()
      .then(() => {
        return true;
      })
      .catch(err => {
        showFailure('Could not connect to ' + smartDrive.address);
        return false;
      });
  }

  connectToSavedSmartDrive(): Promise<any> {
    if (
      this._savedSmartDriveAddress === null ||
      this._savedSmartDriveAddress.length === 0
    ) {
      return this.saveNewSmartDrive().then(didSave => {
        if (didSave) {
          return this.connectToSavedSmartDrive();
        }
        return false;
      });
    }

    // try to connect to the SmartDrive
    const sd = BluetoothService.SmartDrives.filter(
      sd => sd.address === this._savedSmartDriveAddress
    )[0];
    if (sd) {
      return this.connectToSmartDrive(sd);
    } else {
      const sd = this._bluetoothService.getOrMakeSmartDrive({
        address: this._savedSmartDriveAddress
      });
      return this.connectToSmartDrive(sd);
    }
  }

  async disconnectFromSmartDrive() {
    if (this.smartDrive && this.smartDrive.connected) {
      this.smartDrive.off(
        SmartDrive.smartdrive_connect_event,
        this.onSmartDriveConnect,
        this
      );
      this.smartDrive.off(
        SmartDrive.smartdrive_mcu_version_event,
        this.onSmartDriveVersion,
        this
      );
      this.smartDrive.off(
        SmartDrive.smartdrive_distance_event,
        this.onDistance,
        this
      );
      this.smartDrive.off(
        SmartDrive.smartdrive_motor_info_event,
        this.onMotorInfo,
        this
      );
      this.smartDrive.off(
        SmartDrive.smartdrive_error_event,
        this.onSmartDriveError,
        this
      );
      this.smartDrive.disconnect().then(() => {
        this.motorOn = false;
        this.powerAssistActive = false;
      });
    }
  }

  retrySmartDriveConnection() {
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      !this.smartDrive.connected
    ) {
      setTimeout(() => {
        this.connectToSavedSmartDrive();
      }, 5 * 1000);
    }
  }

  sendSmartDriveSettings() {
    // send the current settings to the SD
    return this.smartDrive
      .sendSettingsObject(this.settings)
      .then(() => {
        return this.smartDrive.sendThrottleSettingsObject(
          this.throttleSettings
        );
      })
      .catch(err => {
        // make sure we retry this while we're connected
        this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
        // indicate failure
        Log.E('send settings failed', err);
        showFailure(
          'Failed to send settings to ' +
            this._savedSmartDriveAddress +
            ' ' +
            err
        );
      });
  }

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  async onSmartDriveConnect(args: any) {
    this.powerAssistState = PowerAssist.State.Connected;
    this.updatePowerAssistRing();
    this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
  }

  async onSmartDriveDisconnect(args: any) {
    if (this.motorOn) {
      // record disconnect error - the SD should never be on when
      // we disconnect!
      const errorCode = this.smartDrive.getBleDisconnectError();
      this.saveErrorToDatabase(errorCode, undefined);
    }
    this.motorOn = false;
    if (this.powerAssistActive) {
      this.powerAssistState = PowerAssist.State.Disconnected;
      this.updatePowerAssistRing();
      this.retrySmartDriveConnection();
    }
    this.smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
  }

  async onSmartDriveError(args: any) {
    // Log.D('onSmartDriveError event');
    const errorType = args.data.errorType;
    const errorId = args.data.errorId;
    // save the error into the database
    this.saveErrorToDatabase(errorType, errorId);
  }

  async onMotorInfo(args: any) {
    // send current settings to SD
    this._onceSendSmartDriveSettings();
    // Log.D('onMotorInfo event');
    const motorInfo = args.data.motorInfo;

    // update motor state
    if (this.motorOn !== this.smartDrive.driving) {
      if (this.smartDrive.driving) {
        this._vibrator.cancel();
        this._vibrator.vibrate(250); // vibrate for 250 ms
      } else {
        this._vibrator.cancel();
        this._vibrator.vibrate([0, 250, 50, 250]); // vibrate twice
      }
    }
    this.motorOn = this.smartDrive.driving;
    // determine if we've used more battery percentage
    const batteryChange =
      this.smartDriveCurrentBatteryPercentage - this.smartDrive.battery;
    // only check against 1 so that we filter out charging and only
    // get decreases due to driving / while connected
    if (batteryChange === 1) {
      // cancel previous invocations of the save so that the next
      // one definitely saves the battery increment
      this._throttledSmartDriveSaveFn.flush();
      // save to the database
      this._throttledSmartDriveSaveFn({
        battery: 1
      });
    }
    // update battery percentage
    this.smartDriveCurrentBatteryPercentage = this.smartDrive.battery;
    // save the updated smartdrive battery
    appSettings.setNumber(DataKeys.SD_BATTERY, this.smartDrive.battery);
    // update speed display
    this.currentSpeed = motorInfo.speed;
    this.updateSpeedDisplay();
  }

  async onDistance(args: any) {
    // Log.D('onDistance event');
    const coastDistance = args.data.coastDistance;
    const driveDistance = args.data.driveDistance;

    // save to the database
    this._throttledSmartDriveSaveFn({
      driveDistance: this.smartDrive.driveDistance,
      coastDistance: this.smartDrive.coastDistance
    });

    // save the updated distance
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_CASE,
      this.smartDrive.coastDistance
    );
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_DRIVE,
      this.smartDrive.driveDistance
    );
  }

  async onSmartDriveVersion(args: any) {
    // Log.D('onSmartDriveVersion event');
    const mcuVersion = args.data.mcu;

    // update version displays
    this.mcuVersion = this.smartDrive.mcu_version_string;
    this.bleVersion = this.smartDrive.ble_version_string;

    // save the updated SmartDrive version info
    appSettings.setNumber(DataKeys.SD_VERSION_MCU, this.smartDrive.mcu_version);
    appSettings.setNumber(DataKeys.SD_VERSION_BLE, this.smartDrive.ble_version);
  }

  /*
   * DATABASE FUNCTIONS
   */
  getFirmwareMetadata() {
    return this._sqliteService
      .getAll({ tableName: SmartDriveData.Firmwares.TableName })
      .then(objs => {
        // @ts-ignore
        return objs.map(o => SmartDriveData.Firmwares.loadFirmware(...o));
      })
      .then(mds => {
        const data = {};
        mds.map(md => {
          data[md[SmartDriveData.Firmwares.FirmwareName]] = {
            version: md[SmartDriveData.Firmwares.VersionName],
            filename: md[SmartDriveData.Firmwares.FileName],
            id: md[SmartDriveData.Firmwares.IdName],
            changes: md[SmartDriveData.Firmwares.ChangesName]
          };
        });
        return data;
      })
      .catch(err => {
        Log.E("Couldn't get firmware metadata:", err);
      });
  }

  saveErrorToDatabase(errorCode: string, errorId: number) {
    if (errorId === undefined) {
      // we use this when saving a local error
      errorId = -1;
    }
    // get the most recent error
    return this._sqliteService
      .getLast(SmartDriveData.Errors.TableName, SmartDriveData.Errors.IdName)
      .then(obj => {
        // Log.D('From DB: ', obj);
        const lastId = obj && obj[0];
        const lastTimestamp = obj && obj[1];
        const lastErrorCode = obj && obj[2];
        const lastErrorId = obj && obj[3];
        // make sure this isn't an error we've seen before
        if (errorId === -1 || errorId !== lastErrorId) {
          const newError = SmartDriveData.Errors.newError(errorCode, errorId);
          // now save the error into the table
          return this._sqliteService
            .insertIntoTable(SmartDriveData.Errors.TableName, newError)
            .catch(err => {
              showFailure(`Failed Saving SmartDrive Error: ${err}`);
            });
        }
      })
      .catch(err => {
        showFailure(`Failed getting SmartDrive Error: ${err}`);
      });
  }

  getRecentErrors(numErrors: number, offset: number = 0) {
    let errors = [];
    return this._sqliteService
      .getAll({
        tableName: SmartDriveData.Errors.TableName,
        orderBy: SmartDriveData.Errors.IdName,
        ascending: false,
        limit: numErrors,
        offset: offset
      })
      .then(rows => {
        if (rows && rows.length) {
          errors = rows.map(r => {
            return {
              time: format(new Date(r && +r[1]), 'YYYY-MM-DD HH:mm'),
              code: r && r[2]
            };
          });
        }
        return errors;
      })
      .catch(err => {
        Log.E(`couldn't get errors`, err);
        return errors;
      });
  }

  saveUsageInfoToDatabase(args: {
    driveDistance?: number;
    coastDistance?: number;
    battery?: number;
  }) {
    const driveDistance = args.driveDistance || 0;
    const coastDistance = args.coastDistance || 0;
    const battery = args.battery || 0;
    if (driveDistance === 0 && coastDistance === 0 && battery === 0) {
      return Promise.reject(
        'Must provide at least one valid usage data point!'
      );
    }
    return this.getRecentInfoFromDatabase(1)
      .then(infos => {
        // Log.D('recent infos', infos);
        if (!infos || !infos.length) {
          // record the data if we have it
          if (driveDistance > 0 && coastDistance > 0) {
            // make the first entry for computing distance differences
            const firstEntry = SmartDriveData.Info.newInfo(
              undefined,
              subDays(new Date(), 1),
              0,
              driveDistance,
              coastDistance
            );
            return this._sqliteService.insertIntoTable(
              SmartDriveData.Info.TableName,
              firstEntry
            );
          }
        }
      })
      .then(() => {
        return this.getTodaysUsageInfoFromDatabase();
      })
      .then(u => {
        if (u[SmartDriveData.Info.IdName]) {
          // there was a record, so we need to update it. we add the
          // already used battery plus the amount of new battery
          // that has been used
          const updatedBattery = battery + u[SmartDriveData.Info.BatteryName];
          const updatedDriveDistance =
            driveDistance || u[SmartDriveData.Info.DriveDistanceName];
          const updatedCoastDistance =
            coastDistance || u[SmartDriveData.Info.CoastDistanceName];
          return this._sqliteService.updateInTable(
            SmartDriveData.Info.TableName,
            {
              [SmartDriveData.Info.BatteryName]: updatedBattery,
              [SmartDriveData.Info.DriveDistanceName]: updatedDriveDistance,
              [SmartDriveData.Info.CoastDistanceName]: updatedCoastDistance,
              [SmartDriveData.Info.HasBeenSentName]: 0
            },
            {
              [SmartDriveData.Info.IdName]: u.id
            }
          );
        } else {
          // this is the first record, so we create it
          return this._sqliteService.insertIntoTable(
            SmartDriveData.Info.TableName,
            SmartDriveData.Info.newInfo(
              undefined,
              new Date(),
              battery,
              driveDistance,
              coastDistance
            )
          );
        }
      })
      .then(() => {
        return this.updateChartData();
      })
      .catch(err => {
        Log.E('Failed saving usage:', err);
        showFailure(`Failed saving usage: ${err}`);
      });
  }

  getTodaysUsageInfoFromDatabase() {
    return this._sqliteService
      .getLast(SmartDriveData.Info.TableName, SmartDriveData.Info.IdName)
      .then(e => {
        const date = new Date((e && e[1]) || null);
        if (e && e[1] && isToday(date)) {
          // @ts-ignore
          return SmartDriveData.Info.loadInfo(...e);
        } else {
          return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
        }
      })
      .catch(err => {
        // nothing was found
        return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
      });
  }

  getUsageInfoFromDatabase(numDays: number) {
    const dates = SmartDriveData.Info.getPastDates(numDays);
    const usageInfo = dates.map(d => {
      return SmartDriveData.Info.newInfo(null, d, 0, 0, 0);
    });
    return this.getRecentInfoFromDatabase(6)
      .then(objs => {
        objs.map(o => {
          // @ts-ignore
          const obj = SmartDriveData.Info.loadInfo(...o);
          const objDate = new Date(obj.date);
          const index = closestIndexTo(objDate, dates);
          const usageDate = dates[index];
          // Log.D('recent info:', o);
          if (index > -1 && isSameDay(objDate, usageDate)) {
            usageInfo[index] = obj;
          }
        });
        return usageInfo;
      })
      .catch(err => {
        console.log('error getting recent info:', err);
        return usageInfo;
      });
  }

  getRecentInfoFromDatabase(numRecentEntries: number) {
    return this._sqliteService.getAll({
      tableName: SmartDriveData.Info.TableName,
      orderBy: SmartDriveData.Info.DateName,
      ascending: false,
      limit: numRecentEntries
    });
  }

  getUnsentInfoFromDatabase(numEntries: number) {
    return this._sqliteService.getAll({
      tableName: SmartDriveData.Info.TableName,
      queries: {
        [SmartDriveData.Info.HasBeenSentName]: 0
      },
      orderBy: SmartDriveData.Info.IdName,
      ascending: true,
      limit: numEntries
    });
  }

  /**
   * Network Functions
   */
  sendSettingsToServer() {
    if (!this.hasSentSettings) {
      const settingsObj = {
        settings: this.settings.toObj(),
        throttleSettings: this.throttleSettings.toObj()
      };
      return this._kinveyService
        .sendSettings(settingsObj)
        .then(() => {
          this.hasSentSettings = true;
          appSettings.setBoolean(
            DataKeys.SD_SETTINGS_DIRTY_FLAG,
            this.hasSentSettings
          );
        })
        .catch(err => {});
    } else {
      return Promise.resolve();
    }
  }

  sendErrorsToServer(numErrors: number) {
    return this._sqliteService
      .getAll({
        tableName: SmartDriveData.Errors.TableName,
        orderBy: SmartDriveData.Errors.IdName,
        queries: {
          [SmartDriveData.Errors.HasBeenSentName]: 0
        },
        ascending: true,
        limit: numErrors
      })
      .then(errors => {
        if (errors && errors.length) {
          // now send them one by one
          const promises = errors.map(e => {
            // @ts-ignore
            e = SmartDriveData.Errors.loadError(...e);
            return this._kinveyService.sendError(
              e,
              e[SmartDriveData.Errors.UuidName]
            );
          });
          return Promise.all(promises);
        }
      })
      .then(rets => {
        if (rets && rets.length) {
          const promises = rets
            .map(r => r.content.toJSON())
            .map(r => {
              const id = r['_id'];
              return this._sqliteService.updateInTable(
                SmartDriveData.Errors.TableName,
                {
                  [SmartDriveData.Errors.HasBeenSentName]: 1
                },
                {
                  [SmartDriveData.Errors.UuidName]: id
                }
              );
            });
          return Promise.all(promises);
        }
      })
      .catch(e => {
        Log.E('Error sending errors to server:', e);
      });
  }

  sendInfosToServer(numInfo: number) {
    return this.getUnsentInfoFromDatabase(numInfo)
      .then(infos => {
        if (infos && infos.length) {
          // now send them one by one
          const promises = infos.map(i => {
            // @ts-ignore
            i = SmartDriveData.Info.loadInfo(...i);
            // update info date here
            i[SmartDriveData.Info.DateName] = new Date(
              i[SmartDriveData.Info.DateName]
            );
            return this._kinveyService.sendInfo(
              i,
              i[SmartDriveData.Info.UuidName]
            );
          });
          return Promise.all(promises);
        }
      })
      .then(rets => {
        if (rets && rets.length) {
          const promises = rets
            .map(r => r.content.toJSON())
            .map(r => {
              const id = r['_id'];
              return this._sqliteService.updateInTable(
                SmartDriveData.Info.TableName,
                {
                  [SmartDriveData.Info.HasBeenSentName]: 1
                },
                {
                  [SmartDriveData.Info.UuidName]: id
                }
              );
            });
          return Promise.all(promises);
        }
      })
      .catch(e => {
        Log.E('Error sending infos to server:', e);
      });
  }
}
