package com.github.maxmobility;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.PowerManager.WakeLock;
import android.support.v4.app.ActivityCompat;
import android.util.Log;

import com.kinvey.android.Client;
import com.kinvey.android.callback.KinveyPingCallback;
import com.kinvey.android.model.User;
import com.kinvey.android.store.DataStore;
import com.kinvey.android.store.UserStore;
import com.kinvey.java.KinveyException;
import com.kinvey.java.core.KinveyClientCallback;
import com.kinvey.java.store.StoreType;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;


public class SensorService extends Service {

    private static final String TAG = "PermobilSensorService";

    private LocationManager mLocationManager;
    private Client mKinveyClient;
    private WakeLock mWakeLock;
    private DataStore<DataCollectionModel> watchDataStore;
    private Handler mHandler = new Handler();
    private Runnable mHandlerTask;
    private String userIdentifier;
    private SensorManager mSensorManager;
    private SensorEventListener mListener;
    private FileWriter writer;

    private String sdCardPath = Environment.getExternalStorageDirectory().getPath();
    private String dataFileName = sdCardPath + "/permobil_sensor_data.txt";
    private File dataFile = new File(dataFileName);

    private Sensor mLinearAcceleration;
    private Sensor mGravity;
    private Sensor mMagneticField;
    private Sensor mRotationVector;
    private Sensor mGameRotationVector;
    private Sensor mGyroscope;
    private Sensor mProximity;
    private Sensor mOffBodyDetect;

    public static ArrayList<SensorServiceData> sensorServiceDataList;


    public SensorService() {
    }

    @Override
    public IBinder onBind(Intent intent) {
        // TODO: Return the communication channel to the service.
        throw new UnsupportedOperationException("Not yet implemented");
    }


    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int sensorDelay;
        int maxReportingLatency;
        // the intent that starts the service can pass the sensor delay and Max Reporting Latency
        Bundle extras = intent.getExtras();
        if (extras != null) {
            // check for sensor delay from intent
            int delay = extras.getInt("SENSOR_DELAY", 0);
            sensorDelay = delay != 0 ? delay : SensorManager.SENSOR_DELAY_UI;
            // check for reporting delay
            int reportingDelay = extras.getInt("MAX_REPORTING_DELAY", 0);
            maxReportingLatency = reportingDelay != 0 ? reportingDelay : 50000000;
            // check for user_identifier
            String id = extras.getString("USER_IDENTIFIER", null);
            userIdentifier = id != null ? id : "No User Provided to SensorService.";
        } else {
            sensorDelay = SensorManager.SENSOR_DELAY_UI;
            maxReportingLatency = 50000000;
            userIdentifier = null;
        }

        SensorService.sensorServiceDataList = new ArrayList<>();
        Log.d(TAG, "Device SD Card Path: " + sdCardPath);


        try {
            writer = new FileWriter(new File(sdCardPath, "permobil_sensors_" + System.currentTimeMillis() + ".txt"));
            Log.d(TAG, "New FileWriter: " + writer.toString());
        } catch (IOException e) {
            Log.e(TAG, "Error creating new FileWriter: " + e.getMessage());
            e.printStackTrace();
        }

        // Get the LocationManager so we can send last known location with the record when saving to Kinvey
        mLocationManager = (LocationManager) getApplicationContext().getSystemService(Context.LOCATION_SERVICE);
        Log.d(TAG, "Location Manager: " + mLocationManager);


        // Handle wake_lock so data collection can continue even when screen turns off
        // without wake_lock the service will stop bc the CPU gives up
        this._handleWakeLockSetup();

        // Initialize Kinvey
        this._configureKinvey();

        boolean didRegisterSensors = this._registerDeviceSensors(sensorDelay, maxReportingLatency);
        Log.d(TAG, "Did register Sensors: " + didRegisterSensors);

        mHandlerTask = new Runnable() {
            @Override
            public void run() {
                _writeAndUpload();
                mHandler.postDelayed(mHandlerTask, 60 * 1000);
            }
        };

        mHandlerTask.run();

        return START_STICKY; // START_STICKY is used for services that are explicitly started and stopped as needed
    }

    private void _writeAndUpload() {
        try {
            writer.write(String.valueOf(SensorService.sensorServiceDataList));
            Log.d(TAG, "Wrote the sensor data to file.");
        } catch (IOException e) {
            Log.e(TAG, "Write exception: " + e.getMessage());
            System.out.println("Exception");
        }
        _uploadSensorDataToKinvey();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (this.mWakeLock != null) {
            this.mWakeLock.release();
        }
        if (writer != null) {
            try {
                Log.d(TAG, "Closing the file writer...");
                writer.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing FileWriter: " + e.getMessage());
                e.printStackTrace();
            }
        }

        // remove handler tasks
        mHandler.removeCallbacks(mHandlerTask);

    }

    public class SensorListener implements SensorEventListener {


        @Override
        public void onSensorChanged(SensorEvent event) {
            if (mListener != null) {
                HashMap<String, Float> sensorData = new HashMap<>();
/*
                switch(event.sensor.getType()) {
                    case Sensor.TYPE_ACCELEROMETER:
                        writer.write(String.format("%d; ACC; %f; %f; %f; %f; %f; %f\n", evt.timestamp, evt.values[0], evt.values[1], evt.values[2], 0.f, 0.f, 0.f));
                    break;
                    case Sensor.TYPE_GRAVITY
                }*/

                int sensorType = event.sensor.getType();
                // depending on the the sensor type set the result to return in the listener
                if (sensorType == Sensor.TYPE_ACCELEROMETER
                        || sensorType == Sensor.TYPE_LINEAR_ACCELERATION
                        || sensorType == Sensor.TYPE_GRAVITY
                        || sensorType == Sensor.TYPE_GYROSCOPE
                        || sensorType == Sensor.TYPE_MAGNETIC_FIELD) {
                    sensorData.put("x", event.values[0]);
                    sensorData.put("y", event.values[1]);
                    sensorData.put("z", event.values[2]);
                } else if (sensorType == Sensor.TYPE_ROTATION_VECTOR) {
                    sensorData.put("x", event.values[0]);
                    sensorData.put("y", event.values[1]);
                    sensorData.put("z", event.values[2]);
                    sensorData.put("cos", event.values[3]);
                    sensorData.put("heading_accuracy", event.values[4]);
                } else if (sensorType == Sensor.TYPE_GAME_ROTATION_VECTOR) {
                    sensorData.put("x", event.values[0]);
                    sensorData.put("y", event.values[1]);
                    sensorData.put("z", event.values[2]);
                    sensorData.put("cos", event.values[3]);
                } else if (sensorType == Sensor.TYPE_STATIONARY_DETECT) {
                    sensorData.put("stationary", event.values[0]);
                } else if (sensorType == Sensor.TYPE_PROXIMITY) {
                    sensorData.put("proximity", event.values[0]);
                } else if (sensorType == Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT) {
                    sensorData.put("state", event.values[0]);
                } else if (sensorType == Sensor.TYPE_HEART_RATE) {
                    sensorData.put("heart_rate", event.values[0]);
                }

                SensorServiceData data = new SensorServiceData();
                data.s = event.sensor.getType();
                data.ts = event.timestamp;
                data.d = sensorData;

                SensorService.sensorServiceDataList.add(data);


             /*   AsyncTask.execute(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            writer.write(String.valueOf(SensorService.sensorServiceDataList));
                            Log.d(TAG, "Wrote the sensor data to file.");
                        } catch (IOException e) {
                            System.out.println("Exception");
                        }
                    }
                });
*/

            }
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {
            // TODO Auto-generated method stub

        }

    }

    private void _handleWakeLockSetup() {
        PowerManager mgr = (PowerManager) getApplicationContext().getSystemService(Context.POWER_SERVICE);
        mWakeLock = mgr.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PermobilWear:SensorServiceWakeLock");
        mWakeLock.acquire();
        Log.d(TAG, "PermobilWear:SensorServiceWakeLock has been acquired.");
    }

    private void _configureKinvey() {
        mKinveyClient = new Client.Builder("kid_SyIIDJjdM", "3cfe36e6ac8f4d80b04014cc980a4d47", this).build();
        Log.d(TAG, "Kinvey Client initialized in Sensor Service!");

        // Get our Kinvey Data Collection
        watchDataStore = DataStore.collection("WatchData", DataCollectionModel.class, StoreType.SYNC, mKinveyClient);
        Log.d(TAG, "Kinvey Watch Data Collection: " + watchDataStore.getCollectionName());

        mKinveyClient.ping(new KinveyPingCallback() {
            public void onFailure(Throwable t) {
                Log.e(TAG, "Kinvey Ping Failed", t);
            }

            public void onSuccess(Boolean b) {
                Log.d(TAG, "Kinvey Ping Success: " + b.toString());
                try {
                    UserStore.login("bradwaynemartin@gmail.com", "testtest", mKinveyClient, new KinveyClientCallback<User>() {
                        @Override
                        public void onSuccess(User user) {
                            Log.d(TAG, "Kinvey login SUCCESS!!!");
                        }

                        @Override
                        public void onFailure(Throwable throwable) {
                            Log.d(TAG, "Kinvey Login FAILED!!!!");

                        }
                    });
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });
    }


    private boolean _registerDeviceSensors(int delay, int reportingLatency) {
        mSensorManager = (SensorManager) getApplicationContext()
                .getSystemService(SENSOR_SERVICE);
        // make sure we have the sensor manager for the device
        if (mSensorManager != null) {
            Log.d(TAG, "Sensor Manager: " + mSensorManager.toString());

            Log.d(TAG, "Creating sensor listener...");
            mListener = new SensorListener();

            // register all the sensors we want to track data for
            mLinearAcceleration = mSensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
            if (mLinearAcceleration != null)
                mSensorManager.registerListener(mListener, mLinearAcceleration, delay, reportingLatency);

            mGravity = mSensorManager.getDefaultSensor(Sensor.TYPE_GRAVITY);
            if (mGravity != null)
                mSensorManager.registerListener(mListener, mGravity, SensorManager.SENSOR_DELAY_NORMAL, 50000000);

            mMagneticField = mSensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
            if (mMagneticField != null)
                mSensorManager.registerListener(mListener, mMagneticField, delay, reportingLatency);

            mRotationVector = mSensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            if (mRotationVector != null)
                mSensorManager.registerListener(mListener, mRotationVector, delay, reportingLatency);

            mGameRotationVector = mSensorManager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
            if (mGameRotationVector != null)
                mSensorManager.registerListener(mListener, mGameRotationVector, delay, reportingLatency);

            mGyroscope = mSensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
            if (mGyroscope != null)
                mSensorManager.registerListener(mListener, mGyroscope, delay, reportingLatency);

            mProximity = mSensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
            if (mProximity != null)
                mSensorManager.registerListener(mListener, mProximity, delay, reportingLatency);

            mOffBodyDetect = mSensorManager.getDefaultSensor(Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT);
            if (mOffBodyDetect != null)
                mSensorManager.registerListener(mListener, mOffBodyDetect, delay, reportingLatency);
        } else {
            Log.e(TAG, "Sensor Manager was not found, so sensor service is unable to register sensor listener events.");
        }

        return true;
    }


    private void _uploadSensorDataToKinvey() {
        Log.d(TAG, SensorService.sensorServiceDataList.toString());

        DataCollectionModel data = new DataCollectionModel();
        data.device_manufacturer = Build.MANUFACTURER;
        data.device_os_version = Build.VERSION.RELEASE;
        data.device_model = Build.MODEL;
        data.device_sdk_version = Build.VERSION.SDK_INT;

        @SuppressLint("HardwareIds")
        String uuid = android.provider.Settings.Secure.getString(
                getContentResolver(),
                android.provider.Settings.Secure.ANDROID_ID
        );
        data.device_uuid = uuid;
        data.user_identifier = userIdentifier;

        // if we have location permission write the location to record, if not, just print WARNING to LogCat, not sure on best handling for UX right now.
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Unable to get device location because LOCATION permission has not been granted.");
        } else {
            Location loc = mLocationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            data.location = loc;
        }

        // need to get the data from the array of saved sensor events
        // data.sensor_data =


        try {
            watchDataStore.save(data, new KinveyClientCallback<DataCollectionModel>() {
                @Override
                public void onSuccess(DataCollectionModel result) {
                    // Place your code here
                    // here we have a Book object with defined unique `_id`
                    Log.d(TAG, "Data Collection saved to Kinvey successfully.");
                }

                @Override
                public void onFailure(Throwable error) {
                    // Place your code here
                    Log.e(TAG, "Failed to save to Kinvey: " + error.getMessage());
                }
            });
        } catch (KinveyException ke) {
            // handle error
            Log.e(TAG, "Error saving kinvey record for sensor data. " + ke.getReason());
        }
    }


}


