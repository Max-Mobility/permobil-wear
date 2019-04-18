import * as application from 'tns-core-modules/application';
import { ShownModallyData, Page } from 'tns-core-modules/ui/frame';
import { screen } from 'tns-core-modules/platform';
import { fromObject } from 'tns-core-modules/data/observable';
import { Log } from '@permobil/core';

let page: Page;

export function startHeartRate() {
  try {
    Log.D('getHeartRateData');
    const activity =
      application.android.startActivity ||
      application.android.foregroundActivity;
    if (!activity) {
      alert({
        message: 'Could not get the current Activity.',
        okButtonText: 'Okay'
      });
    }
    const mSensorManager = activity.getSystemService(
      android.content.Context.SENSOR_SERVICE
    );

    if (!mSensorManager) {
      alert({
        message: 'Could not initialize SensorManager.',
        okButtonText: 'Okay'
      });
    }

    const mHeartRateSensor = mSensorManager.getDefaultSensor(
      (android.hardware.Sensor as any).TYPE_HEART_RATE
    );
    Log.D('mHeartRateSensor', mHeartRateSensor);

    const sensorListener = new android.hardware.SensorEventListener({
      onAccuracyChanged: (sensor, accuracy) => {},
      onSensorChanged: event => {
        Log.D(`Sensor: ${event.sensor}`);
        Log.D(`Timestamp: ${event.timestamp}`);
        Log.D(`Values: ${event.values}`);
        this.heartRate = event.values[0].toString();
      }
    });

    Log.D('sensorListener', sensorListener);

    mSensorManager.registerListener(
      sensorListener,
      mHeartRateSensor,
      android.hardware.SensorManager.SENSOR_DELAY_NORMAL
    );

    Log.D('Registered heart rate sensor listener');
  } catch (error) {
    Log.E(error);
  }
}

export function onShowingModally(args: ShownModallyData) {
  Log.D('onShowingModally');
  page = args.object as any;
  page.bindingContext = fromObject({
    halfScreenHeight: screen.mainScreen.heightDIPs * 0.5
  });
}
