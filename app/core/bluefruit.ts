import { Observable } from 'tns-core-modules/data/observable';
import { BluetoothService } from '../services';

export class Neopixel {
  name: string;
  width: any;
  height: any;
  components: any;
  stride: any;
  is400Hz: boolean;
  componentCode: number = 210;
  constructor(name: string, width, height, components, stride, is400Hz) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.components = components;
    this.stride = stride;
    this.is400Hz = is400Hz;
  }

  clamp(x: number): number {
    return Math.max(0, Math.min(255, x));
  }

  setupData() {
    return Uint8Array.from([
      0x53, // 'S'
      this.width,
      this.height,
      this.stride,
      this.componentCode,
      this.is400Hz
    ]);
  }

  setPixelColorData(
    x: number,
    y: number,
    red: number,
    green: number,
    blue: number,
    white: number
  ) {
    return Uint8Array.from([
      0x50, // 'P'
      x,
      y,
      this.clamp(red),
      this.clamp(green),
      this.clamp(blue),
      this.clamp(white)
    ]);
  }

  clearColorData(red: number, green: number, blue: number, white: number) {
    return Uint8Array.from([
      0x43, // 'C'
      this.clamp(red),
      this.clamp(green),
      this.clamp(blue),
      this.clamp(white)
    ]);
  }

  brightnessData(brightness: any) {
    return Uint8Array.from([
      0x42, // 'B'
      this.clamp(brightness)
    ]);
  }
}

export class BlueFruit extends Observable {
  // STATIC:
  static UART_Service = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  static DFU_Service = '00001530-1212-EFDE-1523-785FEABCD123';
  static MODEL_NUMBER = '00002A24-0000-1000-8000-00805F9B34FB';
  static DFU_CONTROL_POINT = '00001531-1212-EFDE-1523-785FEABCD123';
  static DFU_PACKET = '00001532-1212-EFDE-1523-785FEABCD123';
  static DFU_VERSION = '00001534-1212-EFDE-1523-785FEABCD123';

  public static Characteristics = [
    '6E400003-B5A3-F393-E0A9-E50E24DCCA9E',
    '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'
  ];
  public static TXDCharacteristic = BlueFruit.Characteristics[1];
  public static RXDCharacteristic = BlueFruit.Characteristics[0];

  static kUartTxMaxBytes = 20;
  static kUartReplyDefaultTimeout = 2000;

  static isBlueFruitDevice(dev: any): boolean {
    if (dev.name && dev.name.includes('Bluefruit')) {
      return true;
    } else {
      return false;
    }
  }

  // Event names
  public static connect_event = 'connect_event';
  public static disconnect_event = 'disconnect_event';

  // NON STATIC:
  address: string = ''; // MAC Address
  device: any = null; // the actual device (ios:CBPeripheral, android:BluetoothDevice)
  connected = false;

  neopixel: Neopixel = null;

  private _bluetoothService: BluetoothService;

  constructor(btService: BluetoothService, obj?: any) {
    super();
    this._bluetoothService = btService;
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }

    this.neopixel = new Neopixel('1x8', 8, 1, 4, 8, false);
  }

  public setup(): Promise<any> {
    console.log('setting up neopixel', this.address);
    const data = this.neopixel.setupData();
    return this.sendData(data);
  }

  public setPixel(
    x: number,
    y: number,
    red: number,
    green: number,
    blue: number,
    white: number
  ): Promise<any> {
    const data = this.neopixel.setPixelColorData(x, y, red, green, blue, white);
    return this.sendData(data);
  }

  public clearColor(
    red: number = 0,
    green: number = 0,
    blue: number = 0,
    white: number = 0
  ): Promise<any> {
    const data = this.neopixel.clearColorData(red, green, blue, white);
    return this.sendData(data);
  }

  public setBrightness(brightness: number): Promise<any> {
    const data = this.neopixel.brightnessData(brightness);
    return this.sendData(data);
  }

  public sendData(data: any): Promise<any> {
    if (this.connected) {
      return this._bluetoothService.write({
        peripheralUUID: this.address,
        serviceUUID: BlueFruit.UART_Service,
        characteristicUUID: BlueFruit.TXDCharacteristic.toUpperCase(),
        value: data
      });
    } else {
      return Promise.reject('BlueFruit is unable to send!');
    }
  }

  public connect() {
    console.log(`Connecting to ${this.address}`);
    try {
      this._bluetoothService.connect(
        this.address,
        this.handleConnect.bind(this),
        this.handleDisconnect.bind(this)
      );
    } catch (err) {
      console.log(`Couldn't connect to ${this.address}: ${err}`);
    }
  }

  public disconnect() {
    return this._bluetoothService.disconnect({
      UUID: this.address
    });
  }

  handleConnect(data?: any) {
    // update state
    this.connected = true;
    console.log(`connected to bluefruit!`);
    // now that we're connected, subscribe to the characteristics
    this.startNotifyCharacteristics(BlueFruit.Characteristics)
      .then(() => {
        // setup neopixel board
        this.setup();
        this.sendEvent(BlueFruit.connect_event);
      })
      .catch(err => {});
  }

  public handleDisconnect() {
    // update state
    this.connected = false;
    console.log(`disconnected from bluefruit!`);
    // now that we're disconnected - make sure we unsubscribe to the characteristics
    this.stopNotifyCharacteristics(BlueFruit.Characteristics).then(() => {
      this.sendEvent(BlueFruit.disconnect_event);
    });
  }

  public handleNotify(args: any) {
    // Notify is called when the BlueFruit sends us data, args.value is the data
    // now that we're receiving data we can definitly send data
    this.connected = true;
    // handle the packet here
    const value = args.value;
    const uArray = new Uint8Array(value);
    console.log(`received bluefruit data: ${uArray}`);
  }

  private stoppingNotify = false;
  private stopNotifyCharacteristics(
    characteristics: Array<string>
  ): Promise<any> {
    if (this.stoppingNotify)
      return Promise.resolve('Already stopping notifying!');
    else this.stoppingNotify = true;
    console.log(`StopNotifying`);
    const retry = (maxRetries, fn) => {
      return fn().catch(err => {
        if (maxRetries <= 0) {
          throw err;
        } else {
          console.log(`RETRYING: ${err}, ${maxRetries}`);
          return retry(maxRetries - 1, fn);
        }
      });
    };
    const retries = 3;
    return characteristics
      .reduce((p, characteristic) => {
        return p.then(() => {
          return retry(retries, () => {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                console.log(`Stop Notifying ${characteristic}`);
                this._bluetoothService
                  .stopNotifying({
                    peripheralUUID: this.address,
                    serviceUUID: BlueFruit.UART_Service,
                    characteristicUUID: characteristic.toUpperCase(),
                    onNotify: this.handleNotify.bind(this)
                  })
                  .then(() => {
                    resolve();
                  })
                  .catch(err => {
                    // if we failed we probably stopped anyway
                    resolve(err);
                  });
              }, 250);
            });
          });
        });
      }, Promise.resolve())
      .then(() => {
        this.stoppingNotify = false;
      });
  }

  private startingNotify = false;
  private startNotifyCharacteristics(
    characteristics: Array<string>
  ): Promise<any> {
    if (this.startingNotify)
      return Promise.reject('Already started notifying!');
    else this.startingNotify = true;
    console.log(`StartNotifying`);
    const retry = (maxRetries, fn) => {
      return fn().catch(err => {
        if (err.includes('peripheral is disconnected')) {
          // can't notify a disconnected peripheral
          throw err;
        } else {
          if (maxRetries <= 0) {
            throw err;
          } else {
            console.log(`RETRYING: ${err}, ${maxRetries}`);
            return retry(maxRetries - 1, fn);
          }
        }
      });
    };
    return characteristics
      .reduce((p, characteristic) => {
        return p.then(() => {
          return retry(3, () => {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                console.log(`Start Notifying ${characteristic}`);
                this._bluetoothService
                  .startNotifying({
                    peripheralUUID: this.address,
                    serviceUUID: BlueFruit.UART_Service,
                    characteristicUUID: characteristic.toUpperCase(),
                    onNotify: this.handleNotify.bind(this)
                  })
                  .then(() => {
                    resolve();
                  })
                  .catch(err => {
                    reject(err);
                  });
              }, 250);
            });
          });
        });
      }, Promise.resolve())
      .then(() => {
        this.startingNotify = false;
      })
      .catch(() => {
        this.startingNotify = false;
      });
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

/**
 * All of the events for BlueFruit that can be emitted and listened to.
 */
export interface IBlueFruitEvents {
  disconnect_event: string;
  connect_event: string;
}
