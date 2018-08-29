import * as app from 'tns-core-modules/application';
import { ComplicationTapBroadcastReceiver } from './complication_tap_broadcast_receiver';

@JavaProxy('com.permobil.CustomComplicationProviderService')
export class CustomComplicationProviderService extends android.support.wearable
  .complications.ComplicationProviderService {
  private static TAG = 'ComplicationProviderService';

  constructor() {
    super();
    return global.__native(this);
  }

  /*
   * Called when a complication has been activated. The method is for any one-time
   * (per complication) set-up.
   *
   * You can continue sending data for the active complicationId until onComplicationDeactivated()
   * is called.
   */
  onComplicationActivated(
    complicationId: number,
    dataType: number,
    complicationManager: android.support.wearable.complications.ComplicationManager
  ): void {
    console.log(
      CustomComplicationProviderService.TAG,
      'onComplicationActivated(): ' + complicationId
    );
  }

  /*
   * Called when the complication needs updated data from your provider. There are four scenarios
   * when this will happen:
   *
   *   1. An active watch face complication is changed to use this provider
   *   2. A complication using this provider becomes active
   *   3. The period of time you specified in the manifest has elapsed (UPDATE_PERIOD_SECONDS)
   *   4. You triggered an update from your own class via the
   *       ProviderUpdateRequester.requestUpdate() method.
   */

  onComplicationUpdate(
    complicationId: number,
    dataType: number,
    complicationManager: android.support.wearable.complications.ComplicationManager
  ): void {
    console.log(
      CustomComplicationProviderService.TAG,
      'onComplicationUpdate() id: ' + complicationId
    );

    // if (javaObj === null || typeof javaObj !== 'object') {
    //   return javaObj;
    // }

    // Used to create a unique key to use with SharedPreferences for this complication.
    const thisProvider = new (android as any).content.ComponentName(
      app.android.context,
      java.lang.Class.forName('com.permobil.CustomComplicationProviderService')
    );

    // Retrieves your data, in this case, we grab an incrementing number from SharedPrefs.
    const preferences = app
      .getNativeApplication()
      .getApplicationContext()
      .getSharedPreferences(
        ComplicationTapBroadcastReceiver.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY,
        0
      );

    const keyNumber = preferences.getInt(
      ComplicationTapBroadcastReceiver.getPreferenceKey(
        thisProvider,
        complicationId
      ),
      0
    );
    // const numberText = String.format(Locale.getDefault(), '%d!', number);
    const numberText = `${keyNumber}!`;
    console.log({ numberText });
  }

  /*
   * Called when the complication has been deactivated.
   */
  onComplicationDeactivated(complicationId: number): void {
    console.log(
      CustomComplicationProviderService.TAG,
      'onComplicationDeactivated(): ' + complicationId
    );
  }
}
