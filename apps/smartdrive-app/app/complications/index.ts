export * from './complication_provider_service';
export * from './complication_tap_broadcast_receiver';

/**
 * Returns the key for the shared preference used to hold the current state of a given
 * complication.
 */
export function getPreferenceKey(
  provider: android.content.ComponentName,
  complicationId: number
): string {
  return provider.getClassName() + complicationId;
}

export enum KEYS {
  COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY = 'com.example.android.wearable.watchface.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY',
  EXTRA_COMPLICATION_ID = 'com.example.android.wearable.watchface.provider.action.COMPLICATION_ID',
  EXTRA_PROVIDER_COMPONENT = 'com.example.android.wearable.watchface.provider.action.PROVIDER_COMPONENT',
  MAX_NUMBER = 20
}
