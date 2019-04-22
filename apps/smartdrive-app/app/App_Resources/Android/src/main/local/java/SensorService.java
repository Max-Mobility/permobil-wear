package com.github.maxmobility;

import android.app.Service;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import com.kinvey.android.Client;
import com.kinvey.android.callback.KinveyPingCallback;


public class SensorService extends Service {

    private static final String TAG = "SensorServiceB";

    private Client mKinveyClient;
    private SensorManager mSensorManager;

    SensorEventListener mSensorListener = new SensorListener();


    public SensorService() {
    }

    public Client getKinveyClient() {
        return mKinveyClient;
    }

    @Override
    public IBinder onBind(Intent intent) {
        // TODO: Return the communication channel to the service.
        throw new UnsupportedOperationException("Not yet implemented");
    }

    @Override
    public void onCreate() {
        // TODO Auto-generated method stub
        Toast.makeText(getApplicationContext(), "Started", Toast.LENGTH_SHORT).show();
        super.onCreate();

        mKinveyClient = new Client.Builder("kid_SyIIDJjdM", "3cfe36e6ac8f4d80b04014cc980a4d47", this).build();
        Log.d(TAG, "Kinvey Client initialized in Sensor Service!");

        mKinveyClient.ping(new KinveyPingCallback() {
            public void onFailure(Throwable t) {
                Log.e(TAG, "Kinvey Ping Failed", t);
            }

            public void onSuccess(Boolean b) {
                Log.d(TAG, "Kinvey Ping Success: " + b.toString());
              /*  try {
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
                }*/
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        mSensorManager = (SensorManager) getApplicationContext()
                .getSystemService(SENSOR_SERVICE);

        Sensor accel = mSensorManager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
        mSensorManager.registerListener(mSensorListener, accel, SensorManager.SENSOR_DELAY_NORMAL, 50000000);

        return START_STICKY;
    }


    public class SensorListener implements SensorEventListener {

        @Override
        public void onSensorChanged(SensorEvent event) {
            // TODO Auto-generated method stub
            if (event.sensor.getType() == Sensor.TYPE_GAME_ROTATION_VECTOR) {
                Log.d("f ME", "TYPE_GAME_ROTATION_VECTOR data: " + event.values[0]);
            }
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {
            // TODO Auto-generated method stub

        }

    }


}


