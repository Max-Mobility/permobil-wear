/// <reference path="./node_modules/tns-platform-declarations/android-25.d.ts" />

import * as application from 'tns-core-modules/application';
import { AccelerometerOptions, SensorType, AccelerometerData } from './base';

// const baseAcceleration = -9.81;

// GYROSCOPE handling
// const deltaRotationVector = float[4];
// const NS2S = 1 / 1000000000.0;
// const EPSILON = 0.000000001;
// let timestamp;
// end GYROSCOPE

let triggerEventListener: android.hardware.TriggerEventListener;
let sensorListener: android.hardware.SensorEventListener;
let sensorManager: android.hardware.SensorManager;
let accelerometerSensor: android.hardware.Sensor;
let compassSensor: android.hardware.Sensor;
let gravitySensor: android.hardware.Sensor;
let rotationSensor: android.hardware.Sensor;
let gyroScopeSensor: android.hardware.Sensor;
let stationarySensor: android.hardware.Sensor;
let significantMotionSensor: android.hardware.Sensor;

function getNativeDelay(options?: AccelerometerOptions): number {
  if (!options || !options.sensorDelay) {
    return android.hardware.SensorManager.SENSOR_DELAY_NORMAL;
  }

  switch (options.sensorDelay) {
    case 'normal':
      return android.hardware.SensorManager.SENSOR_DELAY_NORMAL;

    case 'game':
      return android.hardware.SensorManager.SENSOR_DELAY_GAME;

    case 'ui':
      return android.hardware.SensorManager.SENSOR_DELAY_UI;

    case 'fastest':
      return android.hardware.SensorManager.SENSOR_DELAY_FASTEST;
  }
}

export function startAccelerometerUpdates(
  callback: (AccelerometerData: AccelerometerData) => void,
  options?: AccelerometerOptions
) {
  if (sensorListener) {
    throw new Error('Already listening for accelerometer updates.');
  }

  const wrappedCallback = zonedCallback(callback);
  const activity: android.app.Activity =
    application.android.foregroundActivity || application.android.startActivity;
  if (!activity) {
    throw Error('Could not get the current running android activity.');
  }

  // get the SensorManager instance from the system service
  if (!sensorManager) {
    sensorManager = activity.getSystemService(
      android.content.Context.SENSOR_SERVICE
    ) as android.hardware.SensorManager;

    if (!sensorManager) {
      throw Error('Could not initialize SensorManager.');
    }
  }

  // get list of sensors from the sensor manager of the device
  const sensorList = sensorManager.getSensorList(
    android.hardware.Sensor.TYPE_ALL
  );

  // booleans to track what sensors we have from the sensor list
  let hasAccel = false;
  let hasGravity = false;
  let hasCompass = false;
  let hasRotation = false;
  let hasGyroscope = false;
  let hasStationary = false;
  let hasSignificantMotion = false;

  // iterate the sensor list and set the sensor booleans to true if the list returned them
  for (let i = 0; i < sensorList.size(); i++) {
    const s = sensorList.get(i) as android.hardware.Sensor;
    const sensorType = s.getType() as number;
    if (sensorType === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
      hasAccel = true;
    } else if (sensorType === android.hardware.Sensor.TYPE_GRAVITY) {
      hasGravity = true;
    } else if (sensorType === android.hardware.Sensor.TYPE_MAGNETIC_FIELD) {
      hasCompass = true;
    } else if (sensorType === android.hardware.Sensor.TYPE_ROTATION_VECTOR) {
      hasRotation = true;
    } else if (sensorType === android.hardware.Sensor.TYPE_GYROSCOPE) {
      hasGyroscope = true;
    } else if (sensorType === android.hardware.Sensor.TYPE_STATIONARY_DETECT) {
      hasStationary = true;
    } else if (sensorType === android.hardware.Sensor.TYPE_SIGNIFICANT_MOTION) {
      hasSignificantMotion = true;
    }
  }

  // set the accelerometer sensor
  if (!accelerometerSensor && hasAccel) {
    accelerometerSensor = getAccelerometerSensor(sensorManager);
    if (!accelerometerSensor) {
      throw Error('Could not get accelerometer sensor.');
    }
  }

  // set the gravity sensor
  if (!gravitySensor && hasGravity) {
    gravitySensor = getGravitySensor(sensorManager);
    if (!gravitySensor) {
      throw Error('Could not get gravity sensor.');
    }
  }

  // set the compass sensor
  if (!compassSensor && hasCompass) {
    compassSensor = getCompassSensor(sensorManager);
    if (!compassSensor) {
      throw Error('Could not get compass sensor.');
    }
  }

  // set the rotation sensor
  if (!rotationSensor && hasRotation) {
    rotationSensor = getRotationVectorSensor(sensorManager);
    if (!rotationSensor) {
      throw Error('Could not get rotation sensor.');
    }
  }

  // set the gyroscope sensor
  if (!gyroScopeSensor && hasGyroscope) {
    gyroScopeSensor = getGyroscopeSensor(sensorManager);
    if (!gyroScopeSensor) {
      throw Error('Could not get gyroscope sensor');
    }
  }

  // set the stationary sensor
  if (!stationarySensor && hasStationary) {
    stationarySensor = getStationarySensor(sensorManager);
    if (!stationarySensor) {
      throw Error('Could not get stationary sensor');
    }
  }

  // set the significant motion sensor
  if (!significantMotionSensor && hasSignificantMotion) {
    significantMotionSensor = getSignificantMotionSensor(sensorManager);
    triggerEventListener = new SmartDriveTriggerListener();
    if (!significantMotionSensor) {
      throw Error('Could not get significant motion sensor');
    }
  }

  // if we don't have the basic sensors throw an error
  if (!accelerometerSensor && !gravitySensor && !rotationSensor) {
    throw Error('Could not get reasonable sensor for accelerometer updates.');
  }

  // create the new SensorEventListener
  sensorListener = new android.hardware.SensorEventListener({
    onAccuracyChanged: (sensor, accuracy) => {},
    onSensorChanged: event => {
      const sensorType = event.sensor.getType();
      const seconds = new Date().getTime() / 1000;

      // change mapped values here based on sensor type
      if (sensorType === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
        // https://developer.android.com/reference/android/hardware/SensorEvent.html#sensor.type_linear_acceleration:
        wrappedCallback({
          data: {
            x: event.values[0],
            y: event.values[1],
            z: event.values[2]
          },
          sensor: sensorType,
          time: seconds
        });
      } else if (sensorType === android.hardware.Sensor.TYPE_GRAVITY) {
        // https://developer.android.com/reference/android/hardware/SensorEvent.html#sensor.type_gravity:
        wrappedCallback({
          data: {
            x: event.values[0],
            y: event.values[1],
            z: event.values[2]
          },
          sensor: sensorType,
          time: seconds
        });
      } else if (sensorType === android.hardware.Sensor.TYPE_MAGNETIC_FIELD) {
        // https://developer.android.com/reference/android/hardware/SensorEvent.html#sensor.type_magnetic_field:
        wrappedCallback({
          data: {
            x: event.values[0],
            y: event.values[1],
            z: event.values[2]
          },
          sensor: sensorType,
          time: seconds
        });
      } else if (sensorType === android.hardware.Sensor.TYPE_ROTATION_VECTOR) {
        // https://developer.android.com/reference/android/hardware/SensorEvent.html#sensor.type_rotation_vector:
        // don't divide by baseAcceleration on anything other than linear_acceleration
        wrappedCallback({
          data: {
            x: event.values[0], // x*sin(θ/2)
            y: event.values[1], // y*sin(θ/2)
            z: event.values[2], // z*sin(θ/2)
            cos: event.values[3], // cos(θ/2)
            heading_accuracy: event.values[4] // estimated heading Accuracy (in radians) (-1 if unavailable)
          },
          sensor: sensorType,
          time: seconds
        });
      } else if (sensorType === android.hardware.Sensor.TYPE_GYROSCOPE) {
        // https://developer.android.com/reference/android/hardware/SensorEvent.html#values
        // let axisX = event.values[0];
        // let axisY = event.values[1];
        // let axisZ = event.values[2];

        // if (timestamp !== 0) {
        //   const dT = (event.timestamp - timestamp) * NS2S;

        //   // Calculate the angular speed of the sample
        //   const omegaMagnitude = sqrt(
        //     axisX * axisX + axisY * axisY + axisZ * axisZ
        //   );

        //   // Normalize the rotation vector if it's big enough to get the axis
        //   if (omegaMagnitude > EPSILON) {
        //     axisX /= omegaMagnitude;
        //     axisY /= omegaMagnitude;
        //     axisZ /= omegaMagnitude;
        //   }

        //   // Integrate around this axis with the angular speed by the time step
        //   // in order to get a delta rotation from this sample over the time step
        //   // We will convert this axis-angle representation of the delta rotation
        //   // into a quaternion before turning it into the rotation matrix.
        //   const thetaOverTwo = (omegaMagnitude * dT) / 2.0;
        //   const sinThetaOverTwo = sin(thetaOverTwo);
        //   const cosThetaOverTwo = cos(thetaOverTwo);
        //   deltaRotationVector[0] = sinThetaOverTwo * axisX;
        //   deltaRotationVector[1] = sinThetaOverTwo * axisY;
        //   deltaRotationVector[2] = sinThetaOverTwo * axisZ;
        //   deltaRotationVector[3] = cosThetaOverTwo;
        // }

        // timestamp = event.timestamp;
        // const deltaRotationMatrix = float[9];
        // getRotationMatrixFromVector(deltaRotationMatrix, deltaRotationVector);
        // TODO: handle getting the current rotation

        wrappedCallback({
          data: {
            x: event.values[0],
            y: event.values[1],
            z: event.values[2]
          },
          sensor: sensorType,
          time: seconds
        });
      } else if (
        sensorType === android.hardware.Sensor.TYPE_STATIONARY_DETECT
      ) {
        // https://developer.android.com/reference/android/hardware/SensorEvent.html#sensor.type_stationary_detect:
        /**
         * A TYPE_STATIONARY_DETECT event is produced if the device has been stationary for at least 5 seconds with a maximal latency of 5 additional seconds. ie: it may take up anywhere from 5 to 10 seconds after the device has been at rest to trigger this event.
         * The only allowed value is 1.0.
         */
        wrappedCallback({
          data: {
            stationary: true,
            value: event.values[0]
          },
          sensor: sensorType,
          time: seconds
        });
      } else if (
        sensorType === android.hardware.Sensor.TYPE_SIGNIFICANT_MOTION
      ) {
        startTriggerSensor();
        wrappedCallback({
          data: {
            significant_motion: true
          },
          sensor: sensorType,
          time: seconds
        });
      } else {
        wrappedCallback({
          data: {
            x: event.values[0],
            y: event.values[1],
            z: event.values[2]
          },
          sensor: 'Unknown',
          time: seconds
        });
      }
    }
  });

  const nativeDelay = getNativeDelay(options);
  if (accelerometerSensor)
    sensorManager.registerListener(
      sensorListener,
      accelerometerSensor,
      nativeDelay
    );
  if (compassSensor)
    sensorManager.registerListener(sensorListener, compassSensor, nativeDelay);
  if (gravitySensor)
    sensorManager.registerListener(sensorListener, gravitySensor, nativeDelay);
  if (rotationSensor)
    sensorManager.registerListener(sensorListener, rotationSensor, nativeDelay);
}

export function stopAccelerometerUpdates() {
  if (!sensorListener) {
    throw new Error('Currently not listening for acceleration events.');
  }

  sensorManager.unregisterListener(sensorListener);
  sensorListener = undefined;
}

export function startTriggerSensor() {
  if (triggerEventListener && sensorManager) {
    sensorManager.requestTriggerSensor(
      triggerEventListener,
      getSignificantMotionSensor(sensorManager)
    );
  }
}

export function stopTriggerSensor() {
  if (triggerEventListener && sensorManager) {
    sensorManager.cancelTriggerSensor(
      triggerEventListener,
      getSignificantMotionSensor(sensorManager)
    );
  }
}

export function getSensorList(): android.hardware.Sensor[] {
  // https://developer.android.com/reference/android/hardware/SensorManager.html#getSensorList(int)
  const sensorList = sensorManager.getSensorList(
    android.hardware.Sensor.TYPE_ALL
  ) as java.util.List<android.hardware.Sensor>;

  const result = [];
  // iterate the sensor List and put the sensors into a plain array to return
  for (let i = 0; i < sensorList.size(); i++) {
    const sensor = sensorList.get(i) as android.hardware.Sensor;
    result.push(sensor);
  }
  return result;
}

export function getAltitude(pressure) {
  // https://developer.android.com/reference/android/hardware/SensorManager.html#getAltitude(float,%20float)
  const data = android.hardware.SensorManager.getAltitude(
    android.hardware.SensorManager.PRESSURE_STANDARD_ATMOSPHERE,
    pressure
  ) as number;
  return data;
}

// ********* Non Exported Functions (private to this module) ********* //

function getAccelerometerSensor(sensorManager: android.hardware.SensorManager) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_LINEAR_ACCELERATION
  // constant value: 10
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
  );
}

function getCompassSensor(sensorManager: android.hardware.SensorManager) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_MAGNETIC_FIELD
  // constant value: 2
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_MAGNETIC_FIELD
  );
}

function getGravitySensor(sensorManager: android.hardware.SensorManager) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_GRAVITY
  // constant value: 9
  return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_GRAVITY);
}

function getRotationVectorSensor(
  sensorManager: android.hardware.SensorManager
) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_ROTATION_VECTOR
  // constant value: 11
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_ROTATION_VECTOR
  );
}

function getGyroscopeSensor(sensorManager: android.hardware.SensorManager) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_GYROSCOPE
  // constant value: 16
  return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_GYROSCOPE);
}

function getStationarySensor(sensorManager: android.hardware.SensorManager) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_STATIONARY_DETECT
  // constant value: 29
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_STATIONARY_DETECT
  );
}

function getSignificantMotionSensor(
  sensorManager: android.hardware.SensorManager
) {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_SIGNIFICANT_MOTION
  // constant value: 17
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_SIGNIFICANT_MOTION
  );
}

function getOrientation() {
  // https://developer.android.com/reference/android/hardware/Sensor.html#TYPE_SIGNIFICANT_MOTION
  // constant value: 17
  return android.hardware.SensorManager.getOrientation(float[9], float[3]);
}

/**
 * Helper function to convert a rotation vector to a normalized quaternion. Given a rotation vector (presumably from a ROTATION_VECTOR sensor), returns a normalized quaternion in the array Q. The quaternion is stored as [w, x, y, z]
 * https://developer.android.com/reference/android/hardware/SensorManager.html#getQuaternionFromVector(float[],%20float[])
 * @param returnValues
 */
function getQuaternionFromVector(returnValues) {
  return android.hardware.SensorManager.getQuaternionFromVector(
    float[4],
    returnValues
  );
}

function getRotationMatrixFromVector(deltaRotationMatrix, deltaRotationVector) {
  android.hardware.SensorManager.getRotationMatrixFromVector(
    deltaRotationMatrix,
    deltaRotationVector
  );
}

class SmartDriveTriggerListener extends android.hardware.TriggerEventListener {
  constructor() {
    super();
  }

  onTrigger(event: android.hardware.TriggerEvent) {
    // As it is a one shot sensor, it will be canceled automatically.
    // SensorManager.requestTriggerSensor(this, mSigMotion); needs to
    // be called again, if needed.
    console.log('SmartDriveTriggerListener onTrigger() executed');
  }
}
