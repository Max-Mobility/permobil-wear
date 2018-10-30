import * as COMMON from './common';

export class Bluetooth extends COMMON.BluetoothCommon {
  /**
   * If true console logs will be output to help debug NativeScript-Bluetooth.
   */
  debug: boolean;

  /**
   * Property to determine if bluetooth is enabled.
   */
  readonly enabled: boolean;

  isBluetoothEnabled(): Promise<boolean>;

  /**
   * Android only. Will return false if the user denied turning Bluetooth on.
   * @returns {Promise<boolean>}
   */
  enable(): Promise<boolean>;

  /**
   * Required for Android 6+ to be able to scan for peripherals in the background.
   */
  hasCoarseLocationPermission(): Promise<boolean>;

  /**
   * Required for Android 6+ to be able to scan for peripherals in the background.
   */
  requestCoarseLocationPermission(): Promise<any>;

  startScanning(options: COMMON.StartScanningOptions): Promise<any>;

  stopScanning(): Promise<any>;

  connect(options: COMMON.ConnectOptions): Promise<any>;

  disconnect(options: COMMON.DisconnectOptions): Promise<any>;

  read(options: COMMON.ReadOptions): Promise<COMMON.ReadResult>;

  write(options: COMMON.WriteOptions): Promise<any>;

  writeWithoutResponse(options: COMMON.WriteOptions): Promise<any>;

  startNotifying(options: COMMON.StartNotifyingOptions): Promise<any>;

  stopNotifying(options: COMMON.StopNotifyingOptions): Promise<any>;

  // PERIPHERAL MODE FUNCTIONS
  disable(): Promise<any>;
  isPeripheralModeSupported(): Promise<boolean>;
  stopAdvertising(): Promise<any>;
  startAdvertising(advertiseOptions: any): Promise<any>;
  getConnectedDevicesMatchingState(state: any): any;
  getConnectedDeviceState(device: any): any;
  getConnectedDevices(): any;
  getServerConnectedDevicesMatchingState(state: any): any;
  getServerConnectedDeviceState(device: any): any;
  getServerConnectedDevices(): any;
  cancelServerConnection(device: any);
  clearServices();
  offersService(uuidString: string): boolean;
  getServerService(uuidString: string): any;
  makeDescriptor(options: any): any;
  makeCharacteristic(options: any): any;
  makeService(options: any): any;
  addService(service): any;
  getAdvertiser(): any;
  setDiscoverable(): Promise<any>;
  startGattServer();
  stopGattServer();
  notifyCentrals(value: any, characteristic: any, addresses?: Array<any>);
  setGattServerCallbacks(options: any);
  fetchUuidsWithSdp(device: any): boolean;
  removeBond(device: any): any;
  getAdapter(): any;
}

export { BondState, ConnectionState } from './common';

/**
 * The returned object in several callback functions.
 */
export interface Peripheral {
  /**
   * Underlying object (CBCentral, BluetoothDevice)
   */
  device: any;

  /**
   * The UUID of the peripheral.
   */
  UUID: string;

  /**
   * A friendly description of the peripheral as provided by the manufacturer.
   */
  name: string;

  // state: string; // TODO not sure we'll keep this, so not adding it here for now

  /**
   * The relative signal strength which more or less can be used to determine how far away the peripheral is.
   */
  RSSI: number;

  /**
   * Once connected to the peripheral a list of services will be set.
   */
  services?: Service[];

  manufacturerId?: number;

  manufacturerData?: ArrayBuffer;
}

/**
 * The returned object in several callback functions.
 */
export interface Central {
  /**
   * Underlying object (CBCentral, BluetoothDevice)
   */
  device: any;

  /**
   * The UUIDs of the Central.
   */
  UUIDs: Array<string>;

  /**
   * The MAC Address of the Central
   */
  address: string;

  /**
   * A friendly description of the Central as provided by the manufacturer.
   */
  name: string;

  // state: string; // TODO not sure we'll keep this, so not adding it here for now

  /**
   * The relative signal strength which more or less can be used to determine how far away the central is.
   */
  RSSI: number;

  manufacturerId?: number;

  manufacturerData?: ArrayBuffer;
}

/**
 * A service provided by a periperhal.
 */
export interface Service {
  /**
   * The UUID of the service.
   */
  UUID: string;
  /**
   * Depending on the peripheral and platform this may be a more friendly description of the service.
   */
  name?: string;
  /**
   * A list of service characteristics a client can interact with by reading, writing, subscribing, etc.
   */
  characteristics: Characteristic[];
}

/**
 * A characteristic provided by a service.
 */
export interface Characteristic {
  /**
   * The UUID of the characteristic.
   */
  UUID: string;
  /**
   * Depending on the service and platform (iOS only) this may be a more friendly description of the characteristic.
   * On Android it's always the same as the UUID.
   */
  name: string;
  /**
   * An object containing characteristic properties like read, write and notify.
   */
  properties: {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
    indicate: boolean;
    broadcast: boolean;
    authenticatedSignedWrites: boolean;
    extendedProperties: boolean;
  };

  /**
   * ignored for now
   */
  descriptors: any;

  /**
   * ignored for now
   */
  permissions: any;
}

/**
 * Base properties for all CRUD actions
 */
export interface CRUDOptions {
  peripheralUUID: string;
  serviceUUID: string;
  characteristicUUID: string;
}

// tslint:disable-next-line:no-empty-interface
export interface ReadOptions extends CRUDOptions {}

export interface WriteOptions extends CRUDOptions {
  value: any;
}

// tslint:disable-next-line:no-empty-interface
export interface StopNotifyingOptions extends CRUDOptions {}

export interface StartNotifyingOptions extends CRUDOptions {
  onNotify: (data: ReadResult) => void;
}

/**
 * Response object for the read function
 */
export interface ReadResult {
  value: any;
  valueRaw: any;
  characteristicUUID: string;
}

export interface StartAdvertisingOptions {
  settings;
  UUID;
  data;
}

export interface MakeServiceOptions {
  UUID: string;
  primary: boolean;
}

/**
 * All of the events for Bluetooth that can be emitted and listened to.
 */
export declare enum IBluetoothEvents {
  error_event = 'error_event',
  bluetooth_enabled_event = 'bluetooth_enabled_event',
  peripheral_connected_event = 'peripheral_connected_event',
  peripheral_disconnected_event = 'peripheral_disconnected_event',
  peripheral_failed_to_connect_event = 'peripheral_failed_to_connect_event',
  centralmanager_updated_state_event = 'centralmanager_updated_state_event',
  centralmanager_restore_state_event = 'centralmanager_restore_state_event',
  peripheralmanager_restore_state_event = 'peripheralmanager_restore_state_event',
  peripheralmanager_update_state_event = 'peripheralmanager_update_state_event',
  peripheralmanager_did_add_event = 'peripheralmanager_did_add_event',
  peripheralmanager_subscribe_characteristic_event = 'peripheralmanager_subscribe_characteristic_event',
  peripheralmanager_unsubscribe_characteristic_event = 'peripheralmanager_unsubscribe_characteristic_event',
  peripheralmanager_ready_update_subscribers_event = 'peripheralmanager_ready_update_subscribers_event',
  peripheralmanager_read_request_event = 'peripheralmanager_read_request_event',
  peripheralmanager_write_request_event = 'peripheralmanager_write_request_event',
  bluetooth_advertise_success_event = 'bluetooth_advertise_success_event',
  bluetooth_advertise_failure_event = 'bluetooth_advertise_failure_event',
  server_connection_state_changed_event = 'server_connection_state_changed_event',
  bond_status_change_event = 'bond_status_change_event',
  device_discovered_event = 'device_discovered_event',
  device_name_change_event = 'device_name_change_event',
  device_uuid_change_event = 'device_uuid_change_event',
  device_acl_disconnected_event = 'device_acl_disconnected_event',
  characteristic_write_request_event = 'characteristic_write_request_event',
  characteristic_read_request_event = 'characteristic_read_request_event',
  descriptor_write_request_event = 'descriptor_write_request_event',
  descriptor_read_request_event = 'descriptor_read_request_event',
  execute_write_event = 'execute_write_event',
  notification_sent_event = 'notification_sent_event'
}
