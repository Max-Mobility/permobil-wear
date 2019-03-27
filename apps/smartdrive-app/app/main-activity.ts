/// <reference path="./typings/wearable-support.2.4.0.d.ts" />
/// <reference path="./typings/wear.d.ts" />

/// <reference path="../node_modules/tns-platform-declarations/android-25.d.ts" />

import {
  setActivityCallbacks,
  AndroidActivityCallbacks
} from 'tns-core-modules/ui/frame';

@JavaProxy('com.permobil.smartdrive.MainActivity')
@Interfaces([android.support.wear.ambient.AmbientModeSupport.AmbientCallbackProvider])
class MainActivity extends android.support.v7.app.AppCompatActivity
  implements
    android.support.wear.ambient.AmbientModeSupport.AmbientCallbackProvider {
  constructor() {
    super();
  }

  /**
   * Ambient mode controller attached to this display. Used by Activity to see if it is in ambient
   * mode.
   */
  public ambientController: android.support.wear.ambient.AmbientModeSupport.AmbientController;

  public isNativeScriptActivity;

  private _callbacks: AndroidActivityCallbacks;

  public getAmbientCallback(): android.support.wear.ambient.AmbientModeSupport.AmbientCallback {
    return new MyAmbientCallback();
  }

  public onCreate(savedInstanceState: android.os.Bundle): void {
    // Set the isNativeScriptActivity in onCreate (as done in the original NativeScript activity code)
    // The JS constructor might not be called because the activity is created from Android.
    this.isNativeScriptActivity = true;
    if (!this._callbacks) {
      setActivityCallbacks(this);
    }

    this._callbacks.onCreate(this, savedInstanceState, super.onCreate);

    console.log('attaching ambientController');

    this.ambientController = android.support.wear.ambient.AmbientModeSupport.attach(
      this
    );
    console.log('ambientController', this.ambientController);
  }

  public onSaveInstanceState(outState: android.os.Bundle): void {
    this._callbacks.onSaveInstanceState(
      this,
      outState,
      super.onSaveInstanceState
    );
  }

  public onStart(): void {
    this._callbacks.onStart(this, super.onStart);
  }

  public onStop(): void {
    this._callbacks.onStop(this, super.onStop);
  }

  public onDestroy(): void {
    this._callbacks.onDestroy(this, super.onDestroy);
  }

  public onBackPressed(): void {
    this._callbacks.onBackPressed(this, super.onBackPressed);
  }

  public onRequestPermissionsResult(
    requestCode: number,
    permissions: Array<string>,
    grantResults: Array<number>
  ): void {
    this._callbacks.onRequestPermissionsResult(
      this,
      requestCode,
      permissions,
      grantResults,
      undefined /*TODO: Enable if needed*/
    );
  }

  public onActivityResult(
    requestCode: number,
    resultCode: number,
    data: android.content.Intent
  ): void {
    this._callbacks.onActivityResult(
      this,
      requestCode,
      resultCode,
      data,
      super.onActivityResult
    );
  }
}

class MyAmbientCallback extends android.support.wear.ambient.AmbientModeSupport
.AmbientCallback {
  public onEnterAmbient(ambientDetails: android.os.Bundle): void {
    // Handle entering ambient mode
    console.log('onEnterAmbient from callback...');
  }

  public onExitAmbient(): void {
    // Handle exiting ambient mode
    console.log('onExitAmbient from callback...');
  }

  public onUpdateAmbient(): void {
    // Update the content
    console.log('onUpdateAmbient from callback...');
  }
}
