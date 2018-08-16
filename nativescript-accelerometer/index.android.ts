/// <reference path="./node_modules/tns-platform-declarations/android.d.ts" /> Needed for autocompletion and compilation.

import application = require("tns-core-modules/application");
import { SensorDelay, AccelerometerOptions, AccelerometerData } from ".";

const baseAcceleration = -9.81;
var sensorListener;
var sensorManager;
var accelerometerSensor;
var compassSensor;
var gravitySensor;
var rotationSensor;

function getNativeDelay(options?: AccelerometerOptions): number {
  if (!options || !options.sensorDelay) {
    return android.hardware.SensorManager.SENSOR_DELAY_NORMAL;
  }

  switch (options.sensorDelay) {
    case "normal":
      return android.hardware.SensorManager.SENSOR_DELAY_NORMAL;

    case "game":
      return android.hardware.SensorManager.SENSOR_DELAY_GAME;

    case "ui":
      return android.hardware.SensorManager.SENSOR_DELAY_UI;

    case "fastest":
      return android.hardware.SensorManager.SENSOR_DELAY_FASTEST;
  }
}

export function startAccelerometerUpdates(
  callback: (AccelerometerData) => void,
  options?: AccelerometerOptions
) {
  if (sensorListener) {
    throw new Error("Already listening for accelerometer updates.");
  }

  const wrappedCallback = zonedCallback(callback);
  var activity =
    application.android.foregroundActivity || application.android.startActivity;
  if (!activity) {
    throw Error("Could not get foregroundActivity.");
  }

  if (!sensorManager) {
    sensorManager = activity.getSystemService(
      android.content.Context.SENSOR_SERVICE
    );

    if (!sensorManager) {
      throw Error("Could not initialize SensorManager.");
    }
  }

  if (!accelerometerSensor) {
    accelerometerSensor = getAccelerometer(sensorManager);
    if (!accelerometerSensor) {
      throw Error("Could not get accelerometer sensor.");
    }
  }
  if (!compassSensor) {
    compassSensor = getCompass(sensorManager);

    if (!compassSensor) {
      throw Error("Could not get compass sensor.");
    }
  }
  if (!gravitySensor) {
    gravitySensor = getGravity(sensorManager);

    if (!gravitySensor) {
      throw Error("Could not get gravity sensor.");
    }
  }
  if (!rotationSensor) {
    rotationSensor = getRotationVector(sensorManager);

    if (!rotationSensor) {
      throw Error("Could not get rotation sensor.");
    }
  }

  sensorListener = new android.hardware.SensorEventListener({
    onAccuracyChanged: (sensor, accuracy) => {},
    onSensorChanged: event => {
      const sensorType = event.sensor.getType();
      const d = new Date();
      const n = d.getMilliseconds();
      // change mapped values here based on sensor type
      if (sensorType === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
        wrappedCallback({
          x: event.values[0] / baseAcceleration,
          y: event.values[1] / baseAcceleration,
          z: event.values[2] / baseAcceleration,
          sensortype: sensorType,
          timemilli: n
        });
      } else if (sensorType === android.hardware.Sensor.TYPE_ROTATION_VECTOR) {
        // don't divide by baseAcceleration on anything other than linear_acceleration
        wrappedCallback({
          x: event.values[0], // x*sin(θ/2)
          y: event.values[1], // y*sin(θ/2)
          z: event.values[2], // z*sin(θ/2)
          cos: event.values[3], // cos(θ/2)
          heading_accuracy: event.values[4], // estimated heading Accuracy (in radians) (-1 if unavailable)
          sensortype: sensorType,
          timemilli: n
        });
      } else {
        wrappedCallback({
          x: event.values[0],
          y: event.values[1],
          z: event.values[2],
          sensortype: sensorType,
          timemilli: n
        });
      }
    }
  });

  const nativeDelay = getNativeDelay(options);
  sensorManager.registerListener(
    sensorListener,
    accelerometerSensor,
    nativeDelay
  );
  sensorManager.registerListener(sensorListener, compassSensor, nativeDelay);
  sensorManager.registerListener(sensorListener, gravitySensor, nativeDelay);
  sensorManager.registerListener(sensorListener, rotationSensor, nativeDelay);
}

function getAccelerometer(sensorManager) {
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
  );
}

function getCompass(sensorManager) {
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_MAGNETIC_FIELD
  );
}

function getGravity(sensorManager) {
  return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_GRAVITY);
}

function getRotationVector(sensorManager) {
  return sensorManager.getDefaultSensor(
    android.hardware.Sensor.TYPE_ROTATION_VECTOR
  );
}

export function stopAccelerometerUpdates() {
  if (!sensorListener) {
    throw new Error("Currently not listening for acceleration events.");
  }

  sensorManager.unregisterListener(sensorListener);
  sensorListener = undefined;
}
