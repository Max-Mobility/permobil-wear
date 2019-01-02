// import * as accelerometer from 'nativescript-accelerometer-advanced';
// import { LottieView } from 'nativescript-lottie';
// import * as permissions from 'nativescript-permissions';
// import * as Toast from 'nativescript-toast';
// import * as application from 'tns-core-modules/application';
// import * as appSettings from 'tns-core-modules/application-settings';
// import { Observable, EventData } from 'tns-core-modules/data/observable';
// import { device } from 'tns-core-modules/platform';
// import { action, alert } from 'tns-core-modules/ui/dialogs';
// import { ContentView } from 'tns-core-modules/ui/content-view';
// import { Page, topmost } from 'tns-core-modules/ui/frame';
// import { Image } from 'tns-core-modules/ui/image';
// import { ListView, ItemEventData } from 'tns-core-modules/ui/list-view';
// import { SmartDrive } from '../../core';
// // import { Bluetooth } from 'nativescript-bluetooth';
// import { Prop } from '../../obs-prop';
// import { BluetoothService } from '../../services';
// import { ObservableArray } from 'tns-core-modules/data/observable-array/observable-array';
// import { AnimationCurve } from 'tns-core-modules/ui/enums';

// const THRESHOLD = 0.5; // change this threshold as you want, higher is more spike movement

// export class HelloWorldModel extends Observable {
//   /**
//    * The heart rate data to render.
//    */
//   @Prop()
//   heartRate: string;

//   /**
//    * The label text to display accelerometer data.
//    */
//   @Prop()
//   accelerometerData: string;

//   /**
//    * Button text for starting/stopping accelerometer.
//    */
//   @Prop()
//   accelerometerBtnText = 'Accelerometer';

//   /**
//    * Boolean to toggle when motion event detected to show animation in UI.
//    */
//   @Prop()
//   motionDetected = false;

//   /**
//    * Boolean to track if heart rate is being monitored.
//    */
//   @Prop()
//   public isGettingHeartRate = false;

//   /**
//    * Boolean to handle logic if we have connected to a SD unit.
//    */
//   @Prop()
//   public connected = false;

//   /**
//    * Boolean to track if accelerometer is already registered listener events.
//    */
//   private _isListeningAccelerometer = false;
//   private _heartrateListener;
//   private _page: Page;
//   private _smartDrive: SmartDrive;
//   private _motionDetectedLottie: LottieView;
//   private _heartRateLottie: LottieView;
//   private _bluetoothService: BluetoothService;

//   constructor(page: Page) {
//     super();
//     this._page = page;
//     // this._bluetoothService = new BluetoothService();
//     console.log(
//       { device },
//       'Device Info: ',
//       device.manufacturer,
//       device.model,
//       device.os,
//       device.osVersion,
//       device.sdkVersion,
//       device.region,
//       device.language,
//       device.uuid
//     );
//   }

//   motionDetectedLoaded(args) {
//     this._motionDetectedLottie = args.object;
//   }

//   heartRateLoaded(args) {
//     this._heartRateLottie = args.object;
//   }

//   toggleAccelerometer() {
//     // if already listening stop and reset isListening boolean
//     if (this._isListeningAccelerometer === true) {
//       accelerometer.stopAccelerometerUpdates();
//       this._isListeningAccelerometer = false;
//       this.accelerometerBtnText = 'Accelerometer';
//       this.accelerometerData = '';
//       return;
//     }

//     accelerometer.startAccelerometerUpdates(
//       accelerometerdata => {
//         // only showing linear acceleration data for now
//         if (
//           accelerometerdata.sensortype ===
//           android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
//         ) {
//           // console.log({ accelerometerdata });
//           const x = this._trimAccelerometerData(accelerometerdata.x);
//           const y = this._trimAccelerometerData(accelerometerdata.y);
//           const z = this._trimAccelerometerData(accelerometerdata.z);

//           let diff = Math.sqrt(
//             accelerometerdata.x * accelerometerdata.x +
//               accelerometerdata.y * accelerometerdata.y +
//               accelerometerdata.z * accelerometerdata.z
//           );
//           diff = Math.abs(accelerometerdata.z);

//           if (diff > THRESHOLD) {
//             if (this._smartDrive && this._smartDrive.ableToSend) {
//               console.log('Sending tap!');
//               this._smartDrive
//                 .sendTap()
//                 .catch(err => console.log('could not send tap', err));
//             }
//             this.accelerometerData = `Motion detected ${diff
//               .toString()
//               .substring(0, 8)}`;
//             console.log('Motion detected!', { diff });
//             this.motionDetected = true;
//             this._motionDetectedLottie.playAnimation();
//             setTimeout(() => {
//               this.motionDetected = false;
//               this._motionDetectedLottie.cancelAnimation();
//             }, 600);
//           }
//         }
//       },
//       { sensorDelay: 'game' }
//     );

//     // set true so next tap doesn't try to register the listeners again
//     this._isListeningAccelerometer = true;
//     this.accelerometerBtnText = 'Stop Accelerometer';
//   }

//   async onDistance(args: any) {
//     // save the updated distance
//     appSettings.setNumber('sd.distance.case', this._smartDrive.coastDistance);
//     appSettings.setNumber('sd.distance.drive', this._smartDrive.driveDistance);
//   }

//   async onSmartDriveVersion(args: any) {
//     // save the updated battery
//     appSettings.setNumber('sd.version.mcu', this._smartDrive.mcu_version);
//     appSettings.setNumber('sd.version.ble', this._smartDrive.ble_version);
//     appSettings.setNumber('sd.battery', this._smartDrive.battery);
//   }

//   async onScanForSmartDrivesTap() {
//     console.log('onScanForSmartDrivesTap()');
//     return this._bluetoothService
//       .scanForSmartDrive()
//       .then(() => {
//         const sds = BluetoothService.SmartDrives;
//         const addresses = sds.map(sd => sd.address);
//         action({
//           message: `Found ${sds && sds.length} SmartDrives!.`,
//           actions: addresses,
//           cancelButtonText: 'Dismiss'
//         }).then(result => {
//           console.log('result', result);
//           if (addresses.indexOf(result) > -1) {
//             this._smartDrive = sds.filter(sd => sd.address === result)[0];
//             this._smartDrive.on(
//               SmartDrive.smartdrive_mcu_version_event,
//               this.onSmartDriveVersion,
//               this
//             );
//             this._smartDrive.on(
//               SmartDrive.smartdrive_distance_event,
//               this.onDistance,
//               this
//             );
//             this._smartDrive.connect();
//             this.connected = true;
//             Toast.makeText('Connecting to ' + result).show();
//           }
//         });
//       })
//       .catch(err => {
//         console.log('could not scan', err);
//       });
//   }

//   async onDisconnectTap() {
//     if (this._smartDrive.connected) {
//       this._smartDrive.off(
//         SmartDrive.smartdrive_mcu_version_event,
//         this.onSmartDriveVersion,
//         this
//       );
//       this._smartDrive.off(
//         SmartDrive.smartdrive_distance_event,
//         this.onDistance,
//         this
//       );
//       this._smartDrive.disconnect().then(() => {
//         this.connected = false;
//         Toast.makeText('Disconnected from ' + this._smartDrive.address).show();
//       });
//     }
//   }

//   async startHeartRate() {
//     try {
//       // check permissions first
//       const hasPermission = permissions.hasPermission(
//         android.Manifest.permission.BODY_SENSORS
//       );
//       if (!hasPermission) {
//         await permissions.requestPermission(
//           android.Manifest.permission.BODY_SENSORS
//         );
//       }

//       const activity: android.app.Activity =
//         application.android.startActivity ||
//         application.android.foregroundActivity;
//       const mSensorManager = activity.getSystemService(
//         android.content.Context.SENSOR_SERVICE
//       ) as android.hardware.SensorManager;

//       if (!this._heartrateListener) {
//         this._heartrateListener = new android.hardware.SensorEventListener({
//           onAccuracyChanged: (sensor, accuracy) => {},
//           onSensorChanged: event => {
//             console.log(event.values[0]);
//             this.heartRate = event.values[0].toString().split('.')[0];
//             appSettings.setNumber('heartrate', this.heartRate);
//             // this._heartRateLottie.playAnimation();
//             // setTimeout(() => {
//             //   // this._heartRateLottie.cancelAnimation();
//             // }, 600);
//           }
//         });
//       }

//       // if already getting the HR, then turn off on this tap
//       if (this.isGettingHeartRate === true) {
//         this.isGettingHeartRate = false;
//         this._heartRateLottie.autoPlay = false;
//         this._heartRateLottie.cancelAnimation();
//         mSensorManager.unregisterListener(this._heartrateListener);
//         return;
//       }

//       if (!mSensorManager) {
//         alert({
//           message: 'Could not initialize the device sensors.',
//           okButtonText: 'Okay'
//         });
//       }

//       const mHeartRateSensor = mSensorManager.getDefaultSensor(
//         android.hardware.Sensor.TYPE_HEART_RATE
//       );
//       console.log(mHeartRateSensor);

//       const didRegListener = mSensorManager.registerListener(
//         this._heartrateListener,
//         mHeartRateSensor,
//         android.hardware.SensorManager.SENSOR_DELAY_NORMAL
//       );
//       console.log({ didRegListener });

//       if (didRegListener) {
//         this.isGettingHeartRate = true;
//         this._heartRateLottie.autoPlay = true;
//         this._heartRateLottie.playAnimation();
//         this._animateHeartIcon();

//         console.log('Registered heart rate sensor listener');
//       } else {
//         console.log('Heart Rate listener did not register.');
//       }
//     } catch (error) {
//       console.log({ error });
//     }
//   }

//   openHeartRateModal(args) {
//     try {
//       const modalPage = '../heart-rate/heart-rate';
//       args.object.page.showModal(modalPage, null, () => {}, true, true);
//     } catch (error) {
//       console.log({ error });
//     }
//   }

//   private _animateHeartIcon() {
//     const heartIcon = topmost().currentPage.getViewById('heartIcon') as Image;

//     heartIcon
//       .animate({
//         scale: {
//           x: 1.2,
//           y: 1.2
//         },
//         duration: 200,
//         curve: AnimationCurve.easeIn
//       })
//       .then(() => {
//         heartIcon.animate({
//           scale: {
//             x: 0,
//             y: 0
//           },
//           duration: 200,
//           curve: AnimationCurve.easeOut
//         });
//       });
//   }

//   private _trimAccelerometerData(value: number) {
//     const x = value.toString();
//     return x.substring(0, 8);
//   }
// }
