package com.github.maxmobility;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.PowerManager.WakeLock;
import android.util.Log;

import com.kinvey.android.Client;
import com.kinvey.android.callback.KinveyPingCallback;
import com.kinvey.android.store.DataStore;
import com.kinvey.java.store.StoreType;

public class SensorService extends Service {

    private static final String TAG = "PermobilSensorService";

    private Client mKinveyClient;
    private WakeLock mWakeLock;
    private SensorManager mSensorManager;
    private DataStore<SensorServiceData> watchDataStore;

    private Sensor mLinearAcceleration;
    private Sensor mGravity;
    private Sensor mMagneticField;
    private Sensor mRotationVector;
    private Sensor mGameRotationVector;
    private Sensor mGyroscope;
    private Sensor mProximity;
    private Sensor mOffBodyDetect;

    SensorEventListener mSensorListener = new SensorListener();

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
        // the intent that starts the service can pass the sensor delay and Max
        // Reporting Latency
        Bundle extras = intent.getExtras();
        if (extras != null) {
            // check for sensor delay from intent
            int delay = extras.getInt("SENSOR_DELAY", 0);
            sensorDelay = delay != 0 ? delay : SensorManager.SENSOR_DELAY_UI;
            // check for reporting delay
            int reportingDelay = extras.getInt("MAX_REPORTING_DELAY", 0);
            maxReportingLatency = reportingDelay != 0 ? reportingDelay : 50000000;
        } else {
            sensorDelay = SensorManager.SENSOR_DELAY_UI;
            maxReportingLatency = 50000000;
        }

        // Handle wake_lock so data collection can continue even when screen turns off
        // without wake_lock the service will stop bc the CPU gives up
        this._handleWakeLockSetup();

        // Initialize Kinvey
        this._configureKinvey();

        boolean didRegisterSensors = this._registerDeviceSensors(sensorDelay, maxReportingLatency);
        Log.d(TAG, "Did register Sensors: " + didRegisterSensors);

        return START_STICKY; // START_STICKY is used for services that are explicitly started and stopped as
                             // needed
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        this.mWakeLock.release();
    }

    public class SensorListener implements SensorEventListener {

        @Override
        public void onSensorChanged(SensorEvent event) {
            // TODO Auto-generated method stub
            if (event.sensor.getType() == Sensor.TYPE_GAME_ROTATION_VECTOR) {
                Log.d("F ME", "TYPE_GAME_ROTATION_VECTOR data: " + event.values[0]);
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
        watchDataStore = DataStore.collection("WatchData", SensorServiceData.class, StoreType.SYNC, mKinveyClient);
        Log.d(TAG, "Kinvey Watch Data Collection: " + watchDataStore.getCollectionName());

        mKinveyClient.ping(new KinveyPingCallback() {
            public void onFailure(Throwable t) {
                Log.e(TAG, "Kinvey Ping Failed", t);
            }

            public void onSuccess(Boolean b) {
                Log.d(TAG, "Kinvey Ping Success: " + b.toString());
                /*
                 * try { UserStore.login("bradwaynemartin@gmail.com", "testtest", mKinveyClient,
                 * new KinveyClientCallback<User>() {
                 * 
                 * @Override public void onSuccess(User user) { Log.d(TAG,
                 * "Kinvey login SUCCESS!!!"); }
                 * 
                 * @Override public void onFailure(Throwable throwable) { Log.d(TAG,
                 * "Kinvey Login FAILED!!!!");
                 * 
                 * } }); } catch (IOException e) { e.printStackTrace(); }
                 */
            }
        });
    }

    private boolean _registerDeviceSensors(int delay, int reportingLatency) {
        mSensorManager = (SensorManager) getApplicationContext().getSystemService(SENSOR_SERVICE);
        // make sure we have the sensor manager for the device
        if (mSensorManager != null) {
            Log.d(TAG, "Sensor Manager: " + mSensorManager.toString());
            // register all the sensors we want to track data for
            mLinearAcceleration = mSensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
            if (mLinearAcceleration != null)
                mSensorManager.registerListener(mSensorListener, mLinearAcceleration, delay, reportingLatency);

            mGravity = mSensorManager.getDefaultSensor(Sensor.TYPE_GRAVITY);
            if (mGravity != null)
                mSensorManager.registerListener(mSensorListener, mGravity, SensorManager.SENSOR_DELAY_NORMAL, 50000000);

            mMagneticField = mSensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
            if (mMagneticField != null)
                mSensorManager.registerListener(mSensorListener, mMagneticField, delay, reportingLatency);

            mRotationVector = mSensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            if (mRotationVector != null)
                mSensorManager.registerListener(mSensorListener, mRotationVector, delay, reportingLatency);

            mGameRotationVector = mSensorManager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
            if (mGameRotationVector != null)
                mSensorManager.registerListener(mSensorListener, mGameRotationVector, delay, reportingLatency);

            mGyroscope = mSensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
            if (mGyroscope != null)
                mSensorManager.registerListener(mSensorListener, mGyroscope, delay, reportingLatency);

            mProximity = mSensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
            if (mProximity != null)
                mSensorManager.registerListener(mSensorListener, mProximity, delay, reportingLatency);

            mOffBodyDetect = mSensorManager.getDefaultSensor(Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT);
            if (mOffBodyDetect != null)
                mSensorManager.registerListener(mSensorListener, mOffBodyDetect, delay, reportingLatency);
        } else {
            Log.e(TAG, "Sensor Manager was not found, so sensor service is unable to register sensor listener events.");
        }

        return true;
    }

}
