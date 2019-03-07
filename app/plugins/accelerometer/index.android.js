"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var application = require("tns-core-modules/application");
var baseAcceleration = -9.81;
var sensorListener;
var sensorManager;
var accelerometerSensor;
var compassSensor;
var gravitySensor;
var rotationSensor;
function getNativeDelay(options) {
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
function startAccelerometerUpdates(callback, options) {
    if (sensorListener) {
        throw new Error("Already listening for accelerometer updates.");
    }
    var wrappedCallback = zonedCallback(callback);
    var activity = application.android.foregroundActivity || application.android.startActivity;
    if (!activity) {
        throw Error("Could not get foregroundActivity.");
    }
    if (!sensorManager) {
        sensorManager = activity.getSystemService(android.content.Context.SENSOR_SERVICE);
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
        onAccuracyChanged: function (sensor, accuracy) { },
        onSensorChanged: function (event) {
            var sensorType = event.sensor.getType();
            var d = new Date();
            var n = d.getMilliseconds();
            if (sensorType === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
                wrappedCallback({
                    x: event.values[0] / baseAcceleration,
                    y: event.values[1] / baseAcceleration,
                    z: event.values[2] / baseAcceleration,
                    sensortype: sensorType,
                    timemilli: n
                });
            }
            else if (sensorType === android.hardware.Sensor.TYPE_ROTATION_VECTOR) {
                wrappedCallback({
                    x: event.values[0],
                    y: event.values[1],
                    z: event.values[2],
                    cos: event.values[3],
                    heading_accuracy: event.values[4],
                    sensortype: sensorType,
                    timemilli: n
                });
            }
            else {
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
    var nativeDelay = getNativeDelay(options);
    sensorManager.registerListener(sensorListener, accelerometerSensor, nativeDelay);
    sensorManager.registerListener(sensorListener, compassSensor, nativeDelay);
    sensorManager.registerListener(sensorListener, gravitySensor, nativeDelay);
    sensorManager.registerListener(sensorListener, rotationSensor, nativeDelay);
}
exports.startAccelerometerUpdates = startAccelerometerUpdates;
function getAccelerometer(sensorManager) {
    return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_LINEAR_ACCELERATION);
}
function getCompass(sensorManager) {
    return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_MAGNETIC_FIELD);
}
function getGravity(sensorManager) {
    return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_GRAVITY);
}
function getRotationVector(sensorManager) {
    return sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ROTATION_VECTOR);
}
function stopAccelerometerUpdates() {
    if (!sensorListener) {
        throw new Error("Currently not listening for acceleration events.");
    }
    sensorManager.unregisterListener(sensorListener);
    sensorListener = undefined;
}
exports.stopAccelerometerUpdates = stopAccelerometerUpdates;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguYW5kcm9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LmFuZHJvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSwwREFBNkQ7QUFHN0QsSUFBTSxnQkFBZ0IsR0FBRyxDQUFDLElBQUksQ0FBQztBQUMvQixJQUFJLGNBQWMsQ0FBQztBQUNuQixJQUFJLGFBQWEsQ0FBQztBQUNsQixJQUFJLG1CQUFtQixDQUFDO0FBQ3hCLElBQUksYUFBYSxDQUFDO0FBQ2xCLElBQUksYUFBYSxDQUFDO0FBQ2xCLElBQUksY0FBYyxDQUFDO0FBRW5CLHdCQUF3QixPQUE4QjtJQUNwRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtRQUNwQyxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO0tBQzNEO0lBRUQsUUFBUSxPQUFPLENBQUMsV0FBVyxFQUFFO1FBQzNCLEtBQUssUUFBUTtZQUNYLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUM7UUFFNUQsS0FBSyxNQUFNO1lBQ1QsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztRQUUxRCxLQUFLLElBQUk7WUFDUCxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQztRQUV4RCxLQUFLLFNBQVM7WUFDWixPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDO0tBQzlEO0FBQ0gsQ0FBQztBQUVELG1DQUNFLFFBQXFDLEVBQ3JDLE9BQThCO0lBRTlCLElBQUksY0FBYyxFQUFFO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQztLQUNqRTtJQUVELElBQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRCxJQUFJLFFBQVEsR0FDVixX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QUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDOUUsQ0FBQztBQUVELDJCQUEyQixhQUFhO0lBQ3RDLE9BQU8sYUFBYSxDQUFDLGdCQUFnQixDQUNuQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDN0MsQ0FBQztBQUNKLENBQUM7QUFFRDtJQUNFLElBQUksQ0FBQyxjQUFjLEVBQUU7UUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO0tBQ3JFO0lBRUQsYUFBYSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2pELGNBQWMsR0FBRyxTQUFTLENBQUM7QUFDN0IsQ0FBQztBQVBELDREQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vbm9kZV9tb2R1bGVzL3Rucy1wbGF0Zm9ybS1kZWNsYXJhdGlvbnMvYW5kcm9pZC5kLnRzXCIgLz4gTmVlZGVkIGZvciBhdXRvY29tcGxldGlvbiBhbmQgY29tcGlsYXRpb24uXHJcblxyXG5pbXBvcnQgYXBwbGljYXRpb24gPSByZXF1aXJlKFwidG5zLWNvcmUtbW9kdWxlcy9hcHBsaWNhdGlvblwiKTtcclxuaW1wb3J0IHsgU2Vuc29yRGVsYXksIEFjY2VsZXJvbWV0ZXJPcHRpb25zLCBBY2NlbGVyb21ldGVyRGF0YSB9IGZyb20gXCIuXCI7XHJcblxyXG5jb25zdCBiYXNlQWNjZWxlcmF0aW9uID0gLTkuODE7XHJcbnZhciBzZW5zb3JMaXN0ZW5lcjtcclxudmFyIHNlbnNvck1hbmFnZXI7XHJcbnZhciBhY2NlbGVyb21ldGVyU2Vuc29yO1xyXG52YXIgY29tcGFzc1NlbnNvcjtcclxudmFyIGdyYXZpdHlTZW5zb3I7XHJcbnZhciByb3RhdGlvblNlbnNvcjtcclxuXHJcbmZ1bmN0aW9uIGdldE5hdGl2ZURlbGF5KG9wdGlvbnM/OiBBY2NlbGVyb21ldGVyT3B0aW9ucyk6IG51bWJlciB7XHJcbiAgaWYgKCFvcHRpb25zIHx8ICFvcHRpb25zLnNlbnNvckRlbGF5KSB7XHJcbiAgICByZXR1cm4gYW5kcm9pZC5oYXJkd2FyZS5TZW5zb3JNYW5hZ2VyLlNFTlNPUl9ERUxBWV9OT1JNQUw7XHJcbiAgfVxyXG5cclxuICBzd2l0Y2ggKG9wdGlvbnMuc2Vuc29yRGVsYXkpIHtcclxuICAgIGNhc2UgXCJub3JtYWxcIjpcclxuICAgICAgcmV0dXJuIGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yTWFuYWdlci5TRU5TT1JfREVMQVlfTk9STUFMO1xyXG5cclxuICAgIGNhc2UgXCJnYW1lXCI6XHJcbiAgICAgIHJldHVybiBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvck1hbmFnZXIuU0VOU09SX0RFTEFZX0dBTUU7XHJcblxyXG4gICAgY2FzZSBcInVpXCI6XHJcbiAgICAgIHJldHVybiBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvck1hbmFnZXIuU0VOU09SX0RFTEFZX1VJO1xyXG5cclxuICAgIGNhc2UgXCJmYXN0ZXN0XCI6XHJcbiAgICAgIHJldHVybiBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvck1hbmFnZXIuU0VOU09SX0RFTEFZX0ZBU1RFU1Q7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRBY2NlbGVyb21ldGVyVXBkYXRlcyhcclxuICBjYWxsYmFjazogKEFjY2VsZXJvbWV0ZXJEYXRhKSA9PiB2b2lkLFxyXG4gIG9wdGlvbnM/OiBBY2NlbGVyb21ldGVyT3B0aW9uc1xyXG4pIHtcclxuICBpZiAoc2Vuc29yTGlzdGVuZXIpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkFscmVhZHkgbGlzdGVuaW5nIGZvciBhY2NlbGVyb21ldGVyIHVwZGF0ZXMuXCIpO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gem9uZWRDYWxsYmFjayhjYWxsYmFjayk7XHJcbiAgdmFyIGFjdGl2aXR5ID1cclxuICAgIGFwcGxpY2F0aW9uLmFuZHJvaWQuZm9yZWdyb3VuZEFjdGl2aXR5IHx8IGFwcGxpY2F0aW9uLmFuZHJvaWQuc3RhcnRBY3Rpdml0eTtcclxuICBpZiAoIWFjdGl2aXR5KSB7XHJcbiAgICB0aHJvdyBFcnJvcihcIkNvdWxkIG5vdCBnZXQgZm9yZWdyb3VuZEFjdGl2aXR5LlwiKTtcclxuICB9XHJcblxyXG4gIGlmICghc2Vuc29yTWFuYWdlcikge1xyXG4gICAgc2Vuc29yTWFuYWdlciA9IGFjdGl2aXR5LmdldFN5c3RlbVNlcnZpY2UoXHJcbiAgICAgIGFuZHJvaWQuY29udGVudC5Db250ZXh0LlNFTlNPUl9TRVJWSUNFXHJcbiAgICApO1xyXG5cclxuICAgIGlmICghc2Vuc29yTWFuYWdlcikge1xyXG4gICAgICB0aHJvdyBFcnJvcihcIkNvdWxkIG5vdCBpbml0aWFsaXplIFNlbnNvck1hbmFnZXIuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCFhY2NlbGVyb21ldGVyU2Vuc29yKSB7XHJcbiAgICBhY2NlbGVyb21ldGVyU2Vuc29yID0gZ2V0QWNjZWxlcm9tZXRlcihzZW5zb3JNYW5hZ2VyKTtcclxuICAgIGlmICghYWNjZWxlcm9tZXRlclNlbnNvcikge1xyXG4gICAgICB0aHJvdyBFcnJvcihcIkNvdWxkIG5vdCBnZXQgYWNjZWxlcm9tZXRlciBzZW5zb3IuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoIWNvbXBhc3NTZW5zb3IpIHtcclxuICAgIGNvbXBhc3NTZW5zb3IgPSBnZXRDb21wYXNzKHNlbnNvck1hbmFnZXIpO1xyXG5cclxuICAgIGlmICghY29tcGFzc1NlbnNvcikge1xyXG4gICAgICB0aHJvdyBFcnJvcihcIkNvdWxkIG5vdCBnZXQgY29tcGFzcyBzZW5zb3IuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoIWdyYXZpdHlTZW5zb3IpIHtcclxuICAgIGdyYXZpdHlTZW5zb3IgPSBnZXRHcmF2aXR5KHNlbnNvck1hbmFnZXIpO1xyXG5cclxuICAgIGlmICghZ3Jhdml0eVNlbnNvcikge1xyXG4gICAgICB0aHJvdyBFcnJvcihcIkNvdWxkIG5vdCBnZXQgZ3Jhdml0eSBzZW5zb3IuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoIXJvdGF0aW9uU2Vuc29yKSB7XHJcbiAgICByb3RhdGlvblNlbnNvciA9IGdldFJvdGF0aW9uVmVjdG9yKHNlbnNvck1hbmFnZXIpO1xyXG5cclxuICAgIGlmICghcm90YXRpb25TZW5zb3IpIHtcclxuICAgICAgdGhyb3cgRXJyb3IoXCJDb3VsZCBub3QgZ2V0IHJvdGF0aW9uIHNlbnNvci5cIik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzZW5zb3JMaXN0ZW5lciA9IG5ldyBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvckV2ZW50TGlzdGVuZXIoe1xyXG4gICAgb25BY2N1cmFjeUNoYW5nZWQ6IChzZW5zb3IsIGFjY3VyYWN5KSA9PiB7fSxcclxuICAgIG9uU2Vuc29yQ2hhbmdlZDogZXZlbnQgPT4ge1xyXG4gICAgICBjb25zdCBzZW5zb3JUeXBlID0gZXZlbnQuc2Vuc29yLmdldFR5cGUoKTtcclxuICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IG4gPSBkLmdldE1pbGxpc2Vjb25kcygpO1xyXG4gICAgICAvLyBjaGFuZ2UgbWFwcGVkIHZhbHVlcyBoZXJlIGJhc2VkIG9uIHNlbnNvciB0eXBlXHJcbiAgICAgIGlmIChzZW5zb3JUeXBlID09PSBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX0xJTkVBUl9BQ0NFTEVSQVRJT04pIHtcclxuICAgICAgICB3cmFwcGVkQ2FsbGJhY2soe1xyXG4gICAgICAgICAgeDogZXZlbnQudmFsdWVzWzBdIC8gYmFzZUFjY2VsZXJhdGlvbixcclxuICAgICAgICAgIHk6IGV2ZW50LnZhbHVlc1sxXSAvIGJhc2VBY2NlbGVyYXRpb24sXHJcbiAgICAgICAgICB6OiBldmVudC52YWx1ZXNbMl0gLyBiYXNlQWNjZWxlcmF0aW9uLFxyXG4gICAgICAgICAgc2Vuc29ydHlwZTogc2Vuc29yVHlwZSxcclxuICAgICAgICAgIHRpbWVtaWxsaTogblxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2UgaWYgKHNlbnNvclR5cGUgPT09IGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yLlRZUEVfUk9UQVRJT05fVkVDVE9SKSB7XHJcbiAgICAgICAgLy8gZG9uJ3QgZGl2aWRlIGJ5IGJhc2VBY2NlbGVyYXRpb24gb24gYW55dGhpbmcgb3RoZXIgdGhhbiBsaW5lYXJfYWNjZWxlcmF0aW9uXHJcbiAgICAgICAgd3JhcHBlZENhbGxiYWNrKHtcclxuICAgICAgICAgIHg6IGV2ZW50LnZhbHVlc1swXSwgLy8geCpzaW4ozrgvMilcclxuICAgICAgICAgIHk6IGV2ZW50LnZhbHVlc1sxXSwgLy8geSpzaW4ozrgvMilcclxuICAgICAgICAgIHo6IGV2ZW50LnZhbHVlc1syXSwgLy8geipzaW4ozrgvMilcclxuICAgICAgICAgIGNvczogZXZlbnQudmFsdWVzWzNdLCAvLyBjb3MozrgvMilcclxuICAgICAgICAgIGhlYWRpbmdfYWNjdXJhY3k6IGV2ZW50LnZhbHVlc1s0XSwgLy8gZXN0aW1hdGVkIGhlYWRpbmcgQWNjdXJhY3kgKGluIHJhZGlhbnMpICgtMSBpZiB1bmF2YWlsYWJsZSlcclxuICAgICAgICAgIHNlbnNvcnR5cGU6IHNlbnNvclR5cGUsXHJcbiAgICAgICAgICB0aW1lbWlsbGk6IG5cclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB3cmFwcGVkQ2FsbGJhY2soe1xyXG4gICAgICAgICAgeDogZXZlbnQudmFsdWVzWzBdLFxyXG4gICAgICAgICAgeTogZXZlbnQudmFsdWVzWzFdLFxyXG4gICAgICAgICAgejogZXZlbnQudmFsdWVzWzJdLFxyXG4gICAgICAgICAgc2Vuc29ydHlwZTogc2Vuc29yVHlwZSxcclxuICAgICAgICAgIHRpbWVtaWxsaTogblxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IG5hdGl2ZURlbGF5ID0gZ2V0TmF0aXZlRGVsYXkob3B0aW9ucyk7XHJcbiAgc2Vuc29yTWFuYWdlci5yZWdpc3Rlckxpc3RlbmVyKFxyXG4gICAgc2Vuc29yTGlzdGVuZXIsXHJcbiAgICBhY2NlbGVyb21ldGVyU2Vuc29yLFxyXG4gICAgbmF0aXZlRGVsYXlcclxuICApO1xyXG4gIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JMaXN0ZW5lciwgY29tcGFzc1NlbnNvciwgbmF0aXZlRGVsYXkpO1xyXG4gIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JMaXN0ZW5lciwgZ3Jhdml0eVNlbnNvciwgbmF0aXZlRGVsYXkpO1xyXG4gIHNlbnNvck1hbmFnZXIucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JMaXN0ZW5lciwgcm90YXRpb25TZW5zb3IsIG5hdGl2ZURlbGF5KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QWNjZWxlcm9tZXRlcihzZW5zb3JNYW5hZ2VyKSB7XHJcbiAgcmV0dXJuIHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihcclxuICAgIGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yLlRZUEVfTElORUFSX0FDQ0VMRVJBVElPTlxyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENvbXBhc3Moc2Vuc29yTWFuYWdlcikge1xyXG4gIHJldHVybiBzZW5zb3JNYW5hZ2VyLmdldERlZmF1bHRTZW5zb3IoXHJcbiAgICBhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX01BR05FVElDX0ZJRUxEXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0R3Jhdml0eShzZW5zb3JNYW5hZ2VyKSB7XHJcbiAgcmV0dXJuIHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihhbmRyb2lkLmhhcmR3YXJlLlNlbnNvci5UWVBFX0dSQVZJVFkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSb3RhdGlvblZlY3RvcihzZW5zb3JNYW5hZ2VyKSB7XHJcbiAgcmV0dXJuIHNlbnNvck1hbmFnZXIuZ2V0RGVmYXVsdFNlbnNvcihcclxuICAgIGFuZHJvaWQuaGFyZHdhcmUuU2Vuc29yLlRZUEVfUk9UQVRJT05fVkVDVE9SXHJcbiAgKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0b3BBY2NlbGVyb21ldGVyVXBkYXRlcygpIHtcclxuICBpZiAoIXNlbnNvckxpc3RlbmVyKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDdXJyZW50bHkgbm90IGxpc3RlbmluZyBmb3IgYWNjZWxlcmF0aW9uIGV2ZW50cy5cIik7XHJcbiAgfVxyXG5cclxuICBzZW5zb3JNYW5hZ2VyLnVucmVnaXN0ZXJMaXN0ZW5lcihzZW5zb3JMaXN0ZW5lcik7XHJcbiAgc2Vuc29yTGlzdGVuZXIgPSB1bmRlZmluZWQ7XHJcbn1cclxuIl19