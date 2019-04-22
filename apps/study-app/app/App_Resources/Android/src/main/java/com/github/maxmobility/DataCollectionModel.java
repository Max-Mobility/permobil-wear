package com.github.maxmobility;

import android.hardware.Sensor;

import java.util.ArrayList;

public class DataCollectionModel {
    public ArrayList<SensorServiceData> sensor_data;
    public ArrayList<Sensor> sensor_list;
    public String device_manufacturer;
    public String device_model;
    public String device_os_version;
    public String device_uuid;
    public int device_sdk_version;
    public String user_identifier;

    public DataCollectionModel() {

    }
}
