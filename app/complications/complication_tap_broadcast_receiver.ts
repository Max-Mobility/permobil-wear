/// <reference path="../../node_modules/tns-platform-declarations/android.d.ts" />

/**
 * Simple {@link BroadcastReceiver} subclass for asynchronously incrementing an integer for any
 * complication id triggered via TapAction on complication. Also, provides static method to create
 * a {@link PendingIntent} that triggers this receiver.
 */
@JavaProxy('com.permobil.ComplicationTapBroadcastReceiver')
export class ComplicationTapBroadcastReceiver extends android.content
  .BroadcastReceiver {
  private static TAG = 'ComplicationProviderService';
  private static EXTRA_PROVIDER_COMPONENT =
    'com.example.android.wearable.watchface.provider.action.PROVIDER_COMPONENT';
  private static EXTRA_COMPLICATION_ID =
    'com.example.android.wearable.watchface.provider.action.COMPLICATION_ID';

  static MAX_NUMBER = 20;
  static COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY =
    'com.example.android.wearable.watchface.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY';

  constructor() {
    super();
    console.log(
      ComplicationTapBroadcastReceiver.TAG,
      'ComplicationTapBroadcastReceiver constructor ****'
    );

    return global.__native(this);
  }

  public onReceive(
    context: android.content.Context,
    intent: android.content.Intent
  ): void {
    const extras = intent.getExtras();
    const provider = extras.getParcelable(
      ComplicationTapBroadcastReceiver.EXTRA_PROVIDER_COMPONENT
    ) as android.content.ComponentName;
    const complicationId = extras.getInt(
      ComplicationTapBroadcastReceiver.EXTRA_COMPLICATION_ID
    );

    // Retrieve data via SharedPreferences.
    const preferenceKey = ComplicationTapBroadcastReceiver.getPreferenceKey(
      provider,
      complicationId
    );
    const sharedPreferences = context.getSharedPreferences(
      ComplicationTapBroadcastReceiver.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY,
      0
    );

    let value = sharedPreferences.getInt(preferenceKey, 0);

    // Update data for complication.
    value = (value + 1) % ComplicationTapBroadcastReceiver.MAX_NUMBER;

    const editor = sharedPreferences.edit() as android.content.SharedPreferences.Editor;
    editor.putInt(preferenceKey, value);
    editor.apply();
  }

  /**
   * Returns a pending intent, suitable for use as a tap intent, that causes a complication to be
   * toggled and updated.
   */
  static getToggleIntent(
    context: android.content.Context,
    provider: android.content.ComponentName,
    complicationId: number
  ): android.app.PendingIntent {
    const intent = new android.content.Intent(
      context,
      ComplicationTapBroadcastReceiver.class
    );
    intent.putExtra(
      ComplicationTapBroadcastReceiver.EXTRA_PROVIDER_COMPONENT,
      provider
    );
    intent.putExtra(
      ComplicationTapBroadcastReceiver.EXTRA_COMPLICATION_ID,
      complicationId
    );

    // Pass complicationId as the requestCode to ensure that different complications get
    // different intents.
    return android.app.PendingIntent.getBroadcast(
      context,
      complicationId,
      intent,
      android.app.PendingIntent.FLAG_UPDATE_CURRENT
    );
  }

  /**
   * Returns the key for the shared preference used to hold the current state of a given
   * complication.
   */
  static getPreferenceKey(
    provider: android.content.ComponentName,
    complicationId: number
  ): string {
    return provider.getClassName() + complicationId;
  }
}
