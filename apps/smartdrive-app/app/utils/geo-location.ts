import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { Log } from '@permobil/core';

declare const com: any;

export function getLastLocation() {
  return new Promise((resolve, reject) => {
    const hasGps = deviceHasGps();
    Log.D('This device has a built in GPS?', hasGps);

    const isPlayServices = _isGooglePlayServicesAvailable();
    Log.D('play services', isPlayServices);

    const fusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(
      androidUtils.getApplicationContext()
    );

    Log.D('fusedLocationClient', fusedLocationClient);

    const lastLocation = fusedLocationClient
      .getLastLocation()
      .addOnSuccessListener(
        new com.google.android.gms.tasks.OnSuccessListener({
          onSuccess: location => {
            resolve(location);
          }
        })
      )
      .addOnFailureListener(
        new com.google.android.gms.tasks.OnFailureListener({
          onFailure: error => {
            reject(error);
          }
        })
      );
  });
}

export function deviceHasGps() {
  return androidUtils
    .getApplicationContext()
    .getPackageManager()
    .hasSystemFeature(android.content.pm.PackageManager.FEATURE_LOCATION_GPS);
}

export function bradTest() {
  return new Promise((resolve, reject) => {
    const isPlayServices = _isGooglePlayServicesAvailable();
    Log.D('play services', isPlayServices);

    const locationRequest = com.google.android.gms.location.LocationRequest.create();
    locationRequest.setInterval(10000);
    locationRequest.setFastestInterval(5000);
    locationRequest.setPriority(
      com.google.android.gms.location.LocationRequest.PRIORITY_HIGH_ACCURACY
    );

    const builder = new com.google.android.gms.location.LocationSettingsRequest.Builder().addLocationRequest(
      locationRequest
    );

    const client = com.google.android.gms.location.LocationServices.getSettingsClient(
      androidUtils.getApplicationContext()
    );
    const task = client.checkLocationSettings(builder.build());
    Log.D('task', task);

    task
      .addOnSuccessListener(
        new com.google.android.gms.tasks.OnSuccessListener({
          onSuccess(locationSettingsResponse) {
            // All location settings are satisfied. The client can initialize
            // location requests here.
            // ...
            resolve(locationSettingsResponse);
          }
        })
      )
      .addOnFailureListener(
        new com.google.android.gms.tasks.OnFailureListener({
          onFailure(error) {
            reject(error);
          }
        })
      );
  });
}

function _isGooglePlayServicesAvailable(): boolean {
  let isLocationServiceEnabled = true;
  const googleApiAvailability = com.google.android.gms.common.GoogleApiAvailability.getInstance();
  const resultCode = googleApiAvailability.isGooglePlayServicesAvailable(
    androidUtils.getApplicationContext()
  );
  if (resultCode !== com.google.android.gms.common.ConnectionResult.SUCCESS) {
    isLocationServiceEnabled = false;
  }

  return isLocationServiceEnabled;
}
