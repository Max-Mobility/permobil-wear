import {
  setActivityCallbacks,
  AndroidActivityCallbacks
} from 'tns-core-modules/ui/frame';

@JavaProxy('com.permobil.smartdrive.MainActivity')
class MainActivity extends android.support.wearable.activity.WearableActivity {
  constructor() {
    super();
  }

  public isNativeScriptActivity;

  private _callbacks: AndroidActivityCallbacks;

  public onCreate(savedInstanceState: android.os.Bundle): void {
    // Set the isNativeScriptActivity in onCreate (as done in the original NativeScript activity code)
    // The JS constructor might not be called because the activity is created from Android.
    this.isNativeScriptActivity = true;
    if (!this._callbacks) {
      setActivityCallbacks(this);
    }

    console.log('wearable activity setting ambient enabled');
    this.setAmbientEnabled();
    console.log('ambient mode enabled');

    this._callbacks.onCreate(this, savedInstanceState, super.onCreate);
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
