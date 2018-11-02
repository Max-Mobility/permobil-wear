import { Observable } from 'tns-core-modules/data/observable';
import { BluetoothService } from '../services';
import { Packet } from './';

export class BlueFruit extends Observable {
  static UART_Service = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  static DFU_Service = '00001530-1212-EFDE-1523-785FEABCD123';
  static TXD = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
  static RXD = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';
  static MODEL_NUMBER = '00002A24-0000-1000-8000-00805F9B34FB';
  static DFU_CONTROL_POINT = '00001531-1212-EFDE-1523-785FEABCD123';
  static DFU_PACKET = '00001532-1212-EFDE-1523-785FEABCD123';
  static DFU_VERSION = '00001534-1212-EFDE-1523-785FEABCD123';

  static kUartTxMaxBytes = 20;
  static kUartReplyDefaultTimeout = 2000;

  address: string = ''; // MAC Address
  device: any = null; // the actual device (ios:CBPeripheral, android:BluetoothDevice)
  connected = false;
  notifying = false;
  ableToSend = false;

  private _bluetoothService: BluetoothService;

  constructor(btService: BluetoothService, obj?: any) {
    super();
    this._bluetoothService = btService;
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  static isBlueFruitDevice(dev: any): boolean {
    if (dev.name && dev.name.includes('Bluefruit')) {
      console.log('Bluefruit device', dev);
      return true;
    } else {
      return false;
    }
  }

  handleConnect(data?: any) {
    // update state
    this.connected = true;
    this.notifying = false;
    this.ableToSend = false;
    console.log(`connected to smartdrive!`);
    // now that we're connected, subscribe to the characteristics
    // this.startNotifyCharacteristics(SmartDrive.Characteristics)
    //   .then(() => {
    //     this.sendEvent(SmartDrive.smartdrive_connect_event);
    //   })
    //   .catch(err => {});
  }

  public handleNotify(args: any) {
    // Notify is called when the SmartDrive sends us data, args.value is the data
    // now that we're receiving data we can definitly send data
    this.notifying = true;
    this.ableToSend = true;
    this.connected = true;
    // handle the packet here
    const value = args.value;
    const uArray = new Uint8Array(value);
    const p = new Packet();
    p.initialize(uArray);
    // console.log(`${p.Type()}::${p.SubType()} ${p.toString()}`);
    this.handlePacket(p);
    p.destroy();
  }

  public handlePacket(p: Packet) {
    const packetType = p.Type();
    const subType = p.SubType();
    if (!packetType || !subType) {
      return;
    } else if (packetType === 'Data') {
      switch (subType) {
        case 'DeviceInfo':
          this.handleDeviceInfo(p);
          break;
        case 'MotorInfo':
        default:
          break;
      }
    }
  }

  /**
   * Notify events by name and optionally pass data
   */
  public sendEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }

  fromObject(obj: any): void {
    this.address = (obj && obj.address) || '';
  }
}
