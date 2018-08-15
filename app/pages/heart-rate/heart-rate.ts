import * as application from 'tns-core-modules/application';
import { ShownModallyData, Page } from 'tns-core-modules/ui/frame';
import { screen } from 'tns-core-modules/platform';
import { fromObject } from 'tns-core-modules/data/observable';

let page: Page;

export function startHeartRate() {
  try {
    console.log('getHeartRateData');
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
    console.log('mHeartRateSensor', mHeartRateSensor);

    const sensorListener = new android.hardware.SensorEventListener({
      onAccuracyChanged: (sensor, accuracy) => {},
      onSensorChanged: event => {
        console.log(`Sensor: ${event.sensor}`);
        console.log(`Timestamp: ${event.timestamp}`);
        console.log(`Values: ${event.values}`);
        this.heartRate = event.values[0].toString();
      }
    });

    console.log('sensorListener', sensorListener);

    mSensorManager.registerListener(
      sensorListener,
      mHeartRateSensor,
      android.hardware.SensorManager.SENSOR_DELAY_NORMAL
    );

    console.log('Registered heart rate sensor listener');
  } catch (error) {
    console.log(error);
  }
}

export function onShowingModally(args: ShownModallyData) {
  console.log('onShowingModally');
  page = args.object as any;
  page.bindingContext = fromObject({
    halfScreenHeight: screen.mainScreen.heightDIPs * 0.5
  });
}
