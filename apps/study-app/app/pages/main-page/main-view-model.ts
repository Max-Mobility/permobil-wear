import {
  DataKeys,
  LoggingCategory,
  Prop,
  SentryService,
  Log,
  SensorService,
  SensorChangedEventData,
  AccuracyChangedEventData
} from '@permobil/core';
// import { padStart } from 'lodash';
// import { addSeconds, differenceInSeconds } from 'date-fns';
import * as permissions from 'nativescript-permissions';
import * as LS from 'nativescript-localstorage';
import { Vibrate } from 'nativescript-vibrate';
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
import { injector, currentSystemTime } from '../../app';
import { hideOffScreenLayout, showOffScreenLayout } from '../../utils';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { setInterval, clearInterval } from 'tns-core-modules/timer';
import { SensorDelay } from 'nativescript-android-sensors';

let sensorInterval = null;
let sensorData = [];

export class MainViewModel extends Observable {
  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop()
  public isSettingsLayoutEnabled = false;

  /**
   * Boolean to track if the user has a valid identifier
   */
  @Prop()
  public hasIdentifier = false;

  /**
   * The user's data identifier
   */
  @Prop()
  identifier: string;

  /**
   * The user's input id text
   */
  @Prop()
  idInputText: string;

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
      image: 'res://ic_watch_white',
      class: 'icon',
      text: 'Start Data Collection',
      func: this.onToggleDataCollection.bind(this)
    },
    {
      type: 'button',
      image: 'res://settings',
      class: 'icon',
      text: 'Settings',
      func: this.onSettingsTap.bind(this)
    }
  );

  /**
   * Index values into the menu
   */
  private _dataCollectionButtonIndex = 1;

  /**
   * State Management for Sensor Monitoring / Data Collection
   */
  private _isListeningDeviceSensors = false;
  private _isCollectingData = false;

  /**
   * User interaction objects
   */
  private _settingsLayout: SwipeDismissLayout;
  private _vibrator: Vibrate = new Vibrate();

  constructor(
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
        if (this._isCollectingData) {
          // now save the data
          sensorData.push(parsedData);
        }
      }
    );

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

    // load saved user identifier from settings / memory
    const savedId = appSettings.getString(DataKeys.USER_IDENTIFIER);
    this.hasIdentifier = this.idIsValid(savedId);
    if (this.hasIdentifier) {
      this.identifier = savedId;
      this._sensorService.identifier = savedId;
      // start continuous data collection / sending
      setTimeout(this.periodicDataSend.bind(this), 500);
      this.startDataCollection();
      Log.D('Data collection starting for', savedId);
    } else {
      setTimeout(this.onSettingsTap.bind(this), 1000);
    }
  }

  idIsValid(id: string): boolean {
    const regex = /PSDS[0-9]+/gi;
    const testID = 'xxr&dxx';
    return testID === id || regex.test(id);
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
        this._sensorService.startDeviceSensors(SensorDelay.UI, 500000);
        this._isListeningDeviceSensors = true;
      }
    } catch (err) {
      Log.E('Error starting the device sensors', err);
    }
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

  onUpdateIdentifier() {
    console.log('trying to get location...');
    permissions
      .requestPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
      .then(() => {
        try {
          // Acquire a reference to the system Location Manager
          const locationManager = androidUtils
            .getApplicationContext()
            .getSystemService(
              android.content.Context.LOCATION_SERVICE
            ) as android.location.LocationManager;

          console.log('locationManager', locationManager);

          const locationProvider =
            android.location.LocationManager.NETWORK_PROVIDER;
          // Or use LocationManager.GPS_PROVIDER
          const lastKnownLocation = locationManager.getLastKnownLocation(
            locationProvider
          );

          console.log('lastKnownLocation', lastKnownLocation);

          // Define a listener that responds to location updates
          const locationListener = new android.location.LocationListener({
            onLocationChanged: (location: android.location.Location) => {
              // Called when a new location is found by the network location provider.
              console.log('location changed', location);
            },

            onStatusChanged: (
              provider: string,
              status: number,
              extras: android.os.Bundle
            ) => {
              console.log('onStatusChanged', provider, status);
            },

            onProviderEnabled: provider => {
              console.log('onProviderEnabled', provider);
            },

            onProviderDisabled: provider => {
              console.log('onProviderDisabled', provider);
            }
          });
          console.log('locationListener', locationListener);

          Log.D('Registering for location updates...');
          // Register the listener with the Location Manager to receive location updates
          locationManager.requestLocationUpdates(
            android.location.LocationManager.NETWORK_PROVIDER,
            0,
            0,
            locationListener
          );
        } catch (error) {
          console.log(error);
        }
      });

    // Log.D('Validating identifier:', this.idInputText);
    // this.hasIdentifier = this.idIsValid(this.idInputText);
    // if (this.hasIdentifier) {
    //   // save the id in the app settings
    //   appSettings.setString(DataKeys.USER_IDENTIFIER, this.idInputText);
    //   // set the sensor service to use this user identifier
    //   this.identifier = this.idInputText;
    //   this._sensorService.identifier = this.idInputText;
    //   // start continuous data collection / sending
    //   setTimeout(this.periodicDataSend.bind(this), 500);
    //   this.startDataCollection();
    //   Log.D('Data collection starting for', this.idInputText);
    // } else {
    //   Log.D('Invalid identifier', this.idInputText);
    // }
  }

  hideSettings(args) {
    hideOffScreenLayout(this._settingsLayout, { x: 500, y: 0 });
    this.isSettingsLayoutEnabled = false;
  }

  onSettingsTap() {
    showOffScreenLayout(this._settingsLayout);
    this.isSettingsLayoutEnabled = true;
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
      // set timeout for later since we're done collecting data
      setTimeout(this.periodicDataSend.bind(this), 60000);
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
    // disable sensors
    this.disableDeviceSensors();
    // clear out the interval
    clearInterval(sensorInterval);
    // make sure all data is stored
    this.periodicDataStore();
  }

  async startDataCollection() {
    if (!this.hasIdentifier) {
      showFailure('No Valid Identifier Set!');
      this._vibrator.cancel();
      this._vibrator.vibrate(1000); // vibrate for 1000 ms
      return;
    }
    try {
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
}
