import { BluetoothService } from '../services';
import { Observable } from 'tns-core-modules/data/observable';

export class BlueFruit extends Observable {
  static UART_Service = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  static DFU_Service = '00001530-1212-EFDE-1523-785FEABCD123';
  address: string = ''; // MAC Address
  device: any = null; // the actual device (ios:CBPeripheral, android:BluetoothDevice)
  private _bluetoothService: BluetoothService;

  constructor(btService: BluetoothService, obj?: any) {
    super();
    this._bluetoothService = btService;
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  static isBlueFruitDevice(dev: any): boolean {
    console.log('isBlueFruitDevice device', dev);
    let name = null;
    if (dev.name) {
      name = dev.name;
    }

    if (name && name.includes('Bluefruit')) {
      alert('bluefruit found');
      return dev;
    }

    try {
      const result = dev.getUuids().indexOf(BlueFruit.UART_Service) > -1;
      console.log('result', result);
    } catch (error) {
      console.log('error');
    }
    // return (
    //   dev.name.includes('Bluefruit') ||
    // );
  }

  fromObject(obj: any): void {
    this.address = (obj && obj.address) || '';
  }
}
