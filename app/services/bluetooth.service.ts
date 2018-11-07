import {
  Bluetooth,
  BondState,
  Central,
  ConnectionState
} from 'nativescript-bluetooth';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import * as dialogsModule from 'tns-core-modules/ui/dialogs';
import { BlueFruit, Packet, SmartDrive } from '../core';

export class BluetoothService {
  // static members
  public static AppServiceUUID = '9358ac8f-6343-4a31-b4e0-4b13a2b45d86';
  public static SmartDrives = new ObservableArray<SmartDrive>();
  public static BlueFruits = new ObservableArray<BlueFruit>();

  // public members
  public enabled = false;
  public initialized = false;

  // private members
  public _bluetooth = new Bluetooth();

  constructor() {
    // enabling `debug` will output console.logs from the bluetooth source code
    this._bluetooth.debug = false;
    this.initialize().catch(err => {
      console.log('BLE constructor init error', err);
    });
  }

  public setEventListeners() {
    this.clearEventListeners();
    // setup event listeners
    this._bluetooth.on(
      Bluetooth.peripheral_connected_event,
      this.onPeripheralConnected,
      this
    );
    this._bluetooth.on(
      Bluetooth.peripheral_disconnected_event,
      this.onPeripheralDisconnected,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_discovered_event,
      this.onDeviceDiscovered,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_name_change_event,
      this.onDeviceNameChange,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_uuid_change_event,
      this.onDeviceUuidChange,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_acl_disconnected_event,
      this.onDeviceAclDisconnected,
      this
    );
    this._bluetooth.on(
      Bluetooth.server_connection_state_changed_event,
      this.onServerConnectionStateChanged,
      this
    );
  }

  public clearEventListeners() {
    // setup event listeners
    this._bluetooth.off(Bluetooth.peripheral_connected_event);
    this._bluetooth.off(Bluetooth.peripheral_disconnected_event);
    this._bluetooth.off(Bluetooth.device_discovered_event);
    this._bluetooth.off(Bluetooth.device_name_change_event);
    this._bluetooth.off(Bluetooth.device_uuid_change_event);
    this._bluetooth.off(Bluetooth.device_acl_disconnected_event);
    this._bluetooth.off(Bluetooth.server_connection_state_changed_event);
  }

  public clearSmartDrives() {
    const connectedSDs = BluetoothService.SmartDrives.slice().filter(
      sd => sd.connected
    );
    BluetoothService.SmartDrives.splice(
      0,
      BluetoothService.SmartDrives.length,
      ...connectedSDs
    );
  }

  public clearBlueFruits() {
    const connectedBlueFruits = BluetoothService.BlueFruits.slice().filter(
      bf => bf.connected
    );
    BluetoothService.BlueFruits.splice(
      0,
      BluetoothService.BlueFruits.length,
      ...connectedBlueFruits
    );
  }

  public radioEnabled(): Promise<boolean> {
    return this._bluetooth.isBluetoothEnabled();
  }

  public available(): Promise<boolean> {
    return this.isActive();
  }

  public isActive(): Promise<boolean> {
    return Promise.resolve(this.enabled && this.initialized);
  }

  public async initialize(): Promise<any> {
    this.enabled = false;
    this.initialized = false;

    this.clearEventListeners();
    this.setEventListeners();

    const x = await this._bluetooth
      .requestCoarseLocationPermission()
      .catch(error => {
        console.log('requestCoarseLocationPermission error', error);
      });
    this.enabled = true;
    this.initialized = true;
  }

  public scanForAny(timeout: number = 4): Promise<any> {
    return this.scan([], timeout);
  }

  public scanForSmartDrive(timeout: number = 4): Promise<any> {
    this.clearSmartDrives();
    return this.scan([SmartDrive.ServiceUUID], timeout);
  }

  // returns a promise that resolves when scanning completes
  public scan(uuids: string[], timeout: number = 4): Promise<any> {
    return this._bluetooth.startScanning({
      serviceUUIDs: uuids,
      seconds: timeout
    });
  }

  public scanForBlueFruits(seconds = 4) {
    this.clearBlueFruits();
    return this.scan([BlueFruit.UART_Service], seconds);
  }

  public stopScanning(): Promise<any> {
    return this._bluetooth.stopScanning();
  }

  public connect(
    address: string,
    onConnected?: (peripheral) => void,
    onDisconnected?: () => void
  ) {
    this._bluetooth.connect({
      UUID: address,
      onConnected,
      onDisconnected
    });
  }

  public disconnect(args: any): Promise<any> {
    return this._bluetooth.disconnect(args);
  }

  public discoverServices(opts: any) {}

  public discoverCharacteristics(opts: any) {}

  public startNotifying(opts: any) {
    return this._bluetooth.startNotifying(opts);
  }

  public stopNotifying(opts: any) {
    return this._bluetooth.stopNotifying(opts);
  }

  public write(opts: any) {
    return this._bluetooth.write(opts);
  }

  public async stop(): Promise<any> {
    this.enabled = false;
    this.initialized = false;
    this.clearEventListeners();
    return Promise.resolve();
  }

  public restart(): Promise<any> {
    return this.stop()
      .then(() => {
        return this.initialize();
      })
      .catch(err => {
        this.enabled = false;
        this.initialized = false;
        console.log('enable err', err);
      });
  }

  // private functions
  // event listeners
  private onDeviceDiscovered(args: any): void {
    // console.log('device discovered!');
    const argdata = args.data;
    const peripheral = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    console.log(`${peripheral.name}::${peripheral.address} - discovered`);
    // upodate / add to the appropriate arrays
    if (SmartDrive.isSmartDriveDevice(peripheral)) {
      const sd = this.getOrMakeSmartDrive(peripheral);
    } else if (BlueFruit.isBlueFruitDevice(peripheral)) {
      const bf = this.getOrMakeBlueFruit(peripheral);
    }
  }

  private onDeviceNameChange(args: any): void {
    // console.log(`name change!`);
    const argdata = args.data;
    const dev = argdata.device;
    const name = argdata.name;
    console.log(`${dev.address} - name change - ${name || 'None'}`);
  }

  private onDeviceUuidChange(args: any): void {
    console.log(`uuid change!`);
    // TODO: This function doesn't work (android BT impl returns null)
    // console.log('finished uuid change');
  }

  private onDeviceAclDisconnected(args: any): void {
    // console.log(`acl disconnect!`);
    // TODO: should be only of type Peripheral
    const argdata = args.data;
    const device = argdata.device;
    console.log(`${device.name}::${device.address} - disconnected`);
    if (SmartDrive.isSmartDriveDevice(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleDisconnect();
    } else if (BlueFruit.isBlueFruitDevice(peripheral)) {
      const bf = this.getOrMakeBlueFruit(peripheral);
      bf.handleDisconnect();
    }
    // console.log('finished acl disconnect');
  }

  private onServerConnectionStateChanged(args: any): void {
    // console.log(`server connection state change`);
    const argdata = args.data;
    const connection_state = argdata.connection_state;
    const device = argdata.device;
    console.log(
      `state change - ${device.name}::${device.address} - ${connection_state}`
    );
    switch (connection_state) {
      case ConnectionState.connected:
        if (SmartDrive.isSmartDriveDevice(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleConnect();
        } else if (BlueFruit.isBlueFruitDevice(device)) {
          const bf = this.getOrMakeBlueFruit(device);
          bf.handleConnect();
        }
        break;
      case ConnectionState.disconnected:
        if (SmartDrive.isSmartDriveDevice(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleDisconnect();
        } else if (BlueFruit.isBlueFruitDevice(device)) {
          const bf = this.getOrMakeBlueFruit(device);
          bf.handleDisconnect();
        }
        break;
      default:
        break;
    }
    // console.log(`finished server connection state change!`);
  }

  private onPeripheralConnected(args: any): void {
    // console.log('peripheral connected!');
    const argdata = args.data;
    const device = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    console.log(`peripheral connected - ${device.name}::${device.address}`);
    if (SmartDrive.isSmartDriveDevice(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleConnect();
    } else if (BlueFruit.isBlueFruitDevice(device)) {
      const bf = this.getOrMakeBlueFruit(device);
      bf.handleConnect();
    }
    // TODO: this event is not emitted by the android part of the bluetooth library
    // console.log('finished peripheral connected!');
  }

  private onPeripheralDisconnected(args: any): void {
    // console.log('peripheral disconnected!');
    const argdata = args.data;
    const device = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    console.log(`peripheral disconnected - ${device.name}::${device.address}`);
    if (SmartDrive.isSmartDriveDevice(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleDisconnect();
    } else if (BlueFruit.isBlueFruitDevice(device)) {
      const bf = this.getOrMakeBlueFruit(device);
      bf.handleDisconnect();
    }
    // TODO: this event is not emitted by the android part of the bluetooth library
    // console.log('finished peripheral disconnected!');
  }

  private getOrMakeSmartDrive(device: any): SmartDrive {
    let sd = BluetoothService.SmartDrives.filter(
      (x: SmartDrive) => x.address === device.address
    )[0];
    if (sd === null || sd === undefined) {
      sd = new SmartDrive(this, { address: device.address });
      BluetoothService.SmartDrives.push(sd);
    }
    if (device.device) {
      sd.device = device.device;
    }
    if (device.rssi) {
      sd.rssi = device.rssi;
    }
    return sd;
  }

  private getOrMakeBlueFruit(device: any): BlueFruit {
    let bf = BluetoothService.BlueFruits.filter(
      (x: BlueFruit) => x.address === device.address
    )[0];

    console.log('Found bluefruit ' + bf);
    if (!bf) {
      bf = new BlueFruit(this, { address: device.address });
      console.log('pushing new Bluefruit to the array...');
      BluetoothService.BlueFruits.push(bf);
    }

    if (device.device) {
      bf.device = device.device;
    }

    return bf;
  }

  public getSmartDrive(address: string) {
    return BluetoothService.SmartDrives.filter(sd => sd.address === address)[0];
  }

  public getBlueFruit(address: string) {
    return BluetoothService.BlueFruits.filter(bf => bf.address === address)[0];
  }
}
