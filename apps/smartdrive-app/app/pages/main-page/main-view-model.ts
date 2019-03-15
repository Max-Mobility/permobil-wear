import {
  BluetoothService,
  DataKeys,
  LoggingCategory,
  Prop,
  SentryService,
  SmartDrive,
  throttle
} from '@permobil/core';
import * as accelerometer from 'nativescript-accelerometer-advanced';
import { LottieView } from 'nativescript-lottie';
import * as permissions from 'nativescript-permissions';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import {
  SwipeDismissLayout,
  WearOsLayout,
  WearOsListView
} from 'nativescript-wear-os';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Observable } from 'tns-core-modules/data/observable';
import {
  ObservableArray,
  ChangedData
} from 'tns-core-modules/data/observable-array';
import { device } from 'tns-core-modules/platform';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { Page, topmost } from 'tns-core-modules/ui/frame';
import { Image } from 'tns-core-modules/ui/image';
import { injector } from '../../app';
import {
  hideOffScreenLayout,
  promptUserForSpeech,
  showOffScreenLayout
} from '../../utils';

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
  tapSensitivity: number = 0.9;

  /**
   * The tap sensitivity display
   */
  @Prop()
  tapSensitivityText: string = 'Tap Sensitivity: 0.9 g';

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
      image: 'res://sdstock',
      class: 'icon smartdrive',
      text: 'Pair a SmartDrive',
      func: this.saveNewSmartDrive.bind(this)
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
  private _heartRateButtonIndex = 3;

  /**
   * Boolean to track if accelerometer is already registered listener events.
   */
  private _isListeningAccelerometer = false;
  private _heartrateListener;
  private _page: Page;
  private _smartDrive: SmartDrive;
  private _motionDetectedLottie: LottieView;

  private _settingsLayout: SwipeDismissLayout;
  private _mainviewLayout: WearOsListView;

  private _savedSmartDriveAddress: string = null;
  private _powerAssistActive: boolean = false;

  // private _bluetoothService: BluetoothService;

  constructor(
    page: Page,
    private _bluetoothService: BluetoothService = injector.get(
      BluetoothService
    ),
    private _sentryService: SentryService = injector.get(SentryService)
  ) {
    super();
    this._page = page;

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
        1
      )} g`;
    }

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

  onIncreaseTapSensitivityTap() {
    this.tapSensitivity =
      this.tapSensitivity < 2.0 ? this.tapSensitivity + 0.1 : 2.0;
    this.tapSensitivityText = `Tap Sensitivity: ${this.tapSensitivity.toFixed(
      1
    )} g`;
    this.saveTapSensitivity();
  }

  onDecreaseTapSensitivityTap() {
    this.tapSensitivity =
      this.tapSensitivity > 0.5 ? this.tapSensitivity - 0.1 : 0.5;
    this.tapSensitivityText = `Tap Sensitivity: ${this.tapSensitivity.toFixed(
      1
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
      this.disableAccelerometer();
      this.onDisconnectTap();
      this.updatePowerAssistButtonText('Power Assist OFF');
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
    // console.log('disableAccelerometer');
    if (this._smartDrive && this._smartDrive.ableToSend) {
      console.log('Turning off Motor!');
      this._smartDrive
        .stopMotor()
        .catch(err => console.log('could not stop motor', err));
    }
    try {
      accelerometer.stopAccelerometerUpdates();
    } catch (err) {
      console.log('could not disable accelerometer', err);
    }
    this._isListeningAccelerometer = false;
    return;
  }

  onAccelerometerData(data) {
    // console.log('onAccelerometerData');
    // only showing linear acceleration data for now
    if (data.sensorType === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
      const z = data.z;
      let diff = z;
      if (this.motorOn) {
        diff = Math.abs(z);
      }

      if (diff > this.tapSensitivity && !this.motionDetected) {
        // console.log('Motion detected!', { diff });
        if (this._smartDrive && this._smartDrive.ableToSend) {
          console.log('Sending tap!');
          this._smartDrive
            .sendTap()
            .catch(err => console.log('could not send tap', err));
        }
        this.motionDetected = true;
        setTimeout(() => {
          this.motionDetected = false;
        }, 300);
      }
    }
  }

  enableAccelerometer() {
    // console.log('enableAccelerometer');
    try {
      accelerometer.startAccelerometerUpdates(
        this.onAccelerometerData.bind(this),
        { sensorDelay: 'game' }
      );
      this._isListeningAccelerometer = true;
    } catch (err) {
      console.log('could not enable accelerometer', err);
    }
  }

  async onMotorInfo(args: any) {
    // console.log('onMotorInfo event');
    this.motorOn = this._smartDrive.driving;
  }

  async onDistance(args: any) {
    // console.log('onDistance event');

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
    // console.log('onSmartDriveVersion event');

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

    /*
    // log breadcrumb
    throttle(
      10000,
      this._sentryService.logBreadCrumb(
        `Updated SD: ${this._smartDrive.address} -- MCU: ${
          this._smartDrive.mcu_version
        }, BLE: ${this._smartDrive.ble_version}, Battery: ${
          this._smartDrive.battery
        }`
      )
    );
	  */
  }

  saveNewSmartDrive() {
    console.log('saveNewSmartDrive()');

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
          message: 'Select SmartDrive:',
          actions: addresses,
          cancelButtonText: 'Dismiss'
        }).then(result => {
          console.log('result', result);

          // if user selected one of the smartdrives in the action dialog, attempt to connect to it
          if (addresses.indexOf(result) > -1) {
            // save the smartdrive here
            this._savedSmartDriveAddress = result;
            appSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);
            new Toasty(
              'Paired to SmartDrive ' + result,
              ToastDuration.SHORT,
              ToastPosition.CENTER
            ).show();
          }
        });
      })
      .catch(error => {
        console.log('could not scan', error);
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
    new Toasty(`Connected to ${this._smartDrive.address}`)
      .setToastPosition(ToastPosition.CENTER)
      .show();
  }

  connectToSavedSmartDrive() {
    console.log('connectToSavedSmartDrive()');
    if (
      this._savedSmartDriveAddress === null ||
      this._savedSmartDriveAddress.length === 0
    ) {
      new Toasty(
        'You must pair to a SmartDrive first!',
        ToastDuration.LONG,
        ToastPosition.CENTER
      ).show();
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
          if (sd) {
            new Toasty(`Could not find ${this._savedSmartDriveAddress}`)
              .setToastPosition(ToastPosition.CENTER)
              .show();
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
            console.log(event.values[0]);
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
        this.updateHeartRateButtonText('Reading Heart Rate');
        this._animateHeartIcon();
        // don't read heart rate for more than one minute at a time
        setTimeout(() => {
          if (this.isGettingHeartRate) {
            console.log('timer cancelling heart rate');
            this.startHeartRate();
          }
        }, 60000);

        console.log('Registered heart rate sensor listener');
      } else {
        console.log('Heart Rate listener did not register.');
      }
    } catch (error) {
      console.log({ error });
    }
  }
  onMainLayoutLoaded(args) {
    this._mainviewLayout = args.object as WearOsListView;
  }

  onSettingsLayoutLoaded(args) {
    this._settingsLayout = args.object as SwipeDismissLayout;

    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      console.log('dimissedEvent', args.object);
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
        console.log('result from speech', result);
      })
      .catch(error => {
        console.log('speech error', error);
      });
  }

  onUpdatesTap() {
    new Toasty(
      'No updates available.',
      ToastDuration.LONG,
      ToastPosition.CENTER
    ).show();
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
