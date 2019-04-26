package com.github.maxmobility;

import com.google.api.client.json.GenericJson;
import com.google.api.client.util.Key;

import java.util.HashMap;

public class SensorServiceData extends GenericJson {

    /**
     * Sensor type as int.
     */
    @Key
    public int s;

    /**
     * Sensor event timestamp.
     */
    @Key
    public long ts;

    /**
     * Returns the seconds since Epoch
     */
    @Key
    public long t;

    /**
     * Hashmap for storing the sensor data.
     */
    @Key
    public HashMap d;

    public SensorServiceData() {
        this.t = System.currentTimeMillis() / 1000;
    }

}
