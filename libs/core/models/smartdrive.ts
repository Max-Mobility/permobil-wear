import { Observable } from 'tns-core-modules/data/observable';
import { Color } from 'tns-core-modules/color';
import * as timer from 'tns-core-modules/timer/timer';
import { BluetoothService } from '../services/bluetooth.service';
import { DeviceBase } from './device-base';
import { SD_OTA_State } from '../enums';
import { ISmartDriveEvents } from '../interfaces';
import { bindingTypeToString, Packet } from '../packet';
import { mod } from '../utils';

export class SmartDrive extends DeviceBase {
  // STATIC:
  static readonly OTAState = SD_OTA_State;
  readonly OTAState = SmartDrive.OTAState;

  // bluetooth info
  public static ServiceUUID = '0cd51666-e7cb-469b-8e4d-2742f1ba7723';
  public static Characteristics = [
    'e7add780-b042-4876-aae1-112855353cc1',
    'e8add780-b042-4876-aae1-112855353cc1',
    'e9add780-b042-4876-aae1-112855353cc1',
    // 'eaadd780-b042-4876-aae1-112855353cc1',
    'ebadd780-b042-4876-aae1-112855353cc1'
  ];
  public static BLEOTADataCharacteristic = SmartDrive.Characteristics[0];
  public static DataCharacteristic = SmartDrive.Characteristics[1];
  public static ControlCharacteristic = SmartDrive.Characteristics[2];
  public static BLEOTAControlCharacteristic = SmartDrive.Characteristics[3];
  // public static BLEOTADongleCharacteristic = SmartDrive.Characteristics[3];

  // Event names
  public static smartdrive_connect_event = 'smartdrive_connect_event';
  public static smartdrive_disconnect_event = 'smartdrive_disconnect_event';
  public static smartdrive_service_discovered_event =
    'smartdrive_service_discovered_event';
  public static smartdrive_characteristic_discovered_event =
    'smartdrive_characteristic_discovered_event';
  public static smartdrive_ble_version_event = 'smartdrive_ble_version_event';
  public static smartdrive_mcu_version_event = 'smartdrive_mcu_version_event';
  public static smartdrive_distance_event = 'smartdrive_distance_event';
  public static smartdrive_motor_info_event = 'smartdrive_motor_info_event';
  public static smartdrive_error_event = 'smartdrive_error_event';
  public static smartdrive_ota_ready_event = 'smartdrive_ota_ready_event';
  public static smartdrive_ota_ready_ble_event =
    'smartdrive_ota_ready_ble_event';
  public static smartdrive_ota_ready_mcu_event =
    'smartdrive_ota_ready_mcu_event';

  // NON STATIC:
  public events: ISmartDriveEvents;

  // public members
  public driveDistance: number = 0; // cumulative total distance the smartDrive has driven
  public coastDistance: number = 0; // cumulative total distance the smartDrive has gone
  public settings = new SmartDrive.Settings();

  // not serialized
  public rssi: number = null; // the received signal strength indicator (how close is it?)
  public otaState: SD_OTA_State = SD_OTA_State.not_started;
  public bleOTAProgress: number = 0;
  public mcuOTAProgress: number = 0;
  public notifying: boolean = false;
  public driving: boolean = false;

  // private members
  private doBLEUpdate: boolean = false;
  private doMCUUpdate: boolean = false;

  // functions
  constructor(btService: BluetoothService, obj?: any) {
    super(btService);
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  public toString(): string {
    return `${this.data()}`;
  }

  public data(): any {
    return {
      mcu_version: this.mcu_version,
      ble_version: this.ble_version,
      battery: this.battery,
      driveDistance: this.driveDistance,
      coastDistance: this.coastDistance,
      address: this.address,
      connected: this.connected
    };
  }

  public fromObject(obj: any): void {
    this.mcu_version = (obj && obj.mcu_version) || 0xff;
    this.ble_version = (obj && obj.ble_version) || 0xff;
    this.battery = (obj && obj.battery) || 0;
    this.driveDistance = (obj && obj.driveDistance) || 0;
    this.coastDistance = (obj && obj.coastDistance) || 0;
    this.address = (obj && obj.address) || '';
    this.connected = (obj && obj.connected) || false;
  }

  // regular methods

  get mcu_version_string(): string {
    return SmartDrive.versionByteToString(this.mcu_version);
  }

  get ble_version_string(): string {
    return SmartDrive.versionByteToString(this.ble_version);
  }

  public isMcuUpToDate(version: string): boolean {
    const v = SmartDrive.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.mcu_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  public isBleUpToDate(version: string): boolean {
    const v = SmartDrive.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.ble_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  public isUpToDate(version: string): boolean {
    const v = SmartDrive.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.mcu_version, this.ble_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  get otaProgress(): number {
    if (this.doBLEUpdate && this.doMCUUpdate) {
      return (this.mcuOTAProgress + this.bleOTAProgress) / 2;
    } else if (this.doBLEUpdate) {
      return this.bleOTAProgress;
    } else if (this.doMCUUpdate) {
      return this.mcuOTAProgress;
    } else {
      return 0;
    }
  }

  public otaProgressToString(): string {
    return `${this.otaProgress.toFixed(1)} %`;
  }

  public otaStateToString(): string {
    /*
          if (this.otaState == SmartDrive.OTAState.updating_mcu ||
          this.otaState == SmartDrive.OTAState.updating_ble) {
          const time = timeToString(this.otaCurrentTime.getTime() - this.otaStartTime.getTime());
          return `${this.otaState} ${time}`;
          } else if (this.otaState == SmartDrive.OTAState.complete) {
          const time = timeToString(this.otaEndTime.getTime() - this.otaStartTime.getTime());
          return `${this.otaState} ${time}`;
          }
        */
    return this.otaState;
  }

  public onOTAActionTap(action: string) {
    console.log(`OTA Action: ${action}`);
    switch (action) {
      case 'ota.action.start':
        this.sendEvent(SmartDrive.ota_start_event);
        break;
      case 'ota.action.pause':
        this.sendEvent(SmartDrive.ota_pause_event);
        break;
      case 'ota.action.resume':
        this.sendEvent(SmartDrive.ota_resume_event);
        break;
      case 'ota.action.cancel':
        this.sendEvent(SmartDrive.ota_cancel_event);
        break;
      case 'ota.action.force':
        this.sendEvent(SmartDrive.ota_force_event);
        break;
      case 'ota.action.retry':
        this.sendEvent(SmartDrive.ota_retry_event);
        break;
      default:
        break;
    }
  }

  public cancelOTA() {
    this.sendEvent(SmartDrive.ota_cancel_event);
  }

  public performOTA(
    bleFirmware: any,
    mcuFirmware: any,
    bleFWVersion: number,
    mcuFWVersion: number,
    timeout: number
  ): Promise<any> {
    // send start ota for MCU
    //   - wait for reconnection (try to reconnect)
    //   - keep sending periodically (check connection state)
    //   - stop sending once we get ota ready from mcu
    // send firmware data for MCU
    // send start ota for BLE
    //   - keep sending periodically (check connection state)
    //   - stop sending once we get ota ready from mcu
    // send firmware data for BLE
    // send '3' to ble control characteristic
    //   - wait for reconnection (try to reconnect)
    // send stop OTA to MCU
    //   - wait for reconnection (try to reconnect)
    // wait to get ble version
    // wait to get mcu version
    // check versions
    return new Promise((resolve, reject) => {
      if (!bleFirmware || !mcuFirmware || !bleFWVersion || !mcuFWVersion) {
        const msg = `Bad version (${bleFWVersion}, ${mcuFWVersion}), or firmware (${bleFirmware}, ${mcuFirmware})!`;
        console.log(msg);
        reject(msg);
      } else {
        // set up variables to keep track of the ota
        let otaIntervalID = null;

        let mcuVersion = 0xff;
        let bleVersion = 0xff;
        let haveMCUVersion = false;
        let haveBLEVersion = false;

        this.doBLEUpdate = false;
        this.doMCUUpdate = false;

        let hasRebooted = false;
        let startedOTA = false;
        let cancelOTA = false;
        let paused = false;

        let index = 0; // tracking the pointer into the firmware
        const payloadSize = 16; // how many firmware bytes to send each time

        // timer ids
        let connectionIntervalID = null;
        let otaTimeoutID = null;
        const otaTimeout = timeout;
        const smartDriveConnectionInterval = 5000;

        // define our functions here
        const unregister = () => {
          // unregister for events
          this.off(SmartDrive.smartdrive_connect_event, connectHandler);
          this.off(SmartDrive.smartdrive_disconnect_event, disconnectHandler);
          this.off(SmartDrive.smartdrive_ble_version_event, bleVersionHandler);
          this.off(SmartDrive.smartdrive_mcu_version_event, mcuVersionHandler);
          this.off(SmartDrive.smartdrive_ota_ready_event, otaReadyHandler);
          this.off(
            SmartDrive.smartdrive_ota_ready_mcu_event,
            otaMCUReadyHandler
          );
          this.off(
            SmartDrive.smartdrive_ota_ready_ble_event,
            otaBLEReadyHandler
          );
          this.off(SmartDrive.ota_start_event, otaStartHandler);
          this.off(SmartDrive.ota_retry_event, otaRetryHandler);
          this.off(SmartDrive.ota_force_event, otaForceHandler);
          this.off(SmartDrive.ota_pause_event, otaPauseHandler);
          this.off(SmartDrive.ota_resume_event, otaResumeHandler);
          this.off(SmartDrive.ota_cancel_event, otaCancelHandler);
          this.off(SmartDrive.ota_timeout_event, otaTimeoutHandler);
        };
        const register = () => {
          unregister();
          // register for connection events
          this.on(SmartDrive.smartdrive_connect_event, connectHandler);
          this.on(SmartDrive.smartdrive_disconnect_event, disconnectHandler);
          this.on(SmartDrive.smartdrive_ble_version_event, bleVersionHandler);
          this.on(SmartDrive.smartdrive_mcu_version_event, mcuVersionHandler);
          this.on(
            SmartDrive.smartdrive_ota_ready_mcu_event,
            otaMCUReadyHandler
          );
          this.on(
            SmartDrive.smartdrive_ota_ready_ble_event,
            otaBLEReadyHandler
          );
          this.on(SmartDrive.smartdrive_ota_ready_event, otaReadyHandler);
          this.on(SmartDrive.ota_start_event, otaStartHandler);
          this.on(SmartDrive.ota_retry_event, otaRetryHandler);
          this.on(SmartDrive.ota_pause_event, otaPauseHandler);
          this.on(SmartDrive.ota_resume_event, otaResumeHandler);
          this.on(SmartDrive.ota_force_event, otaForceHandler);
          this.on(SmartDrive.ota_cancel_event, otaCancelHandler);
          this.on(SmartDrive.ota_timeout_event, otaTimeoutHandler);
        };
        const begin = () => {
          console.log(`Beginning OTA for SmartDrive: ${this.address}`);
          paused = false;
          cancelOTA = false;
          startedOTA = false;
          hasRebooted = false;

          mcuVersion = 0xff;
          bleVersion = 0xff;
          haveMCUVersion = false;
          haveBLEVersion = false;

          this.doBLEUpdate = false;
          this.doMCUUpdate = false;

          index = 0;
          // set the action
          this.otaActions = ['ota.action.start'];
          // now that we're starting the OTA, we are awaiting the versions
          this.otaState = SmartDrive.OTAState.not_started;

          register();
          // stop the timer
          if (otaIntervalID) {
            timer.clearInterval(otaIntervalID);
          }
          // now actually start the ota
          otaIntervalID = timer.setInterval(runOTA, 250);
        };
        const otaStartHandler = () => {
          // set the progresses
          this.bleOTAProgress = 0;
          this.mcuOTAProgress = 0;
          this.otaActions = ['ota.action.cancel'];
          // connect to the smartdrive
          this.connect();
          this.otaStartTime = new Date();
          this.otaState = SmartDrive.OTAState.awaiting_versions;
          // start the timeout timer
          if (otaTimeoutID) {
            timer.clearTimeout(otaTimeoutID);
          }
          otaTimeoutID = timer.setTimeout(() => {
            this.sendEvent(SmartDrive.ota_timeout_event);
          }, otaTimeout);
        };
        const otaForceHandler = () => {
          startedOTA = true;
          this.doMCUUpdate = true;
          this.doBLEUpdate = true;
          this.otaState = SmartDrive.OTAState.awaiting_mcu_ready;
          this.otaActions = ['ota.action.cancel'];
        };
        const otaPauseHandler = () => {
          this.otaActions = ['ota.action.resume', 'ota.action.cancel'];
          paused = true;
        };
        const otaResumeHandler = () => {
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
          paused = false;
        };
        const otaCancelHandler = () => {
          this.otaState = SmartDrive.OTAState.canceling;
        };
        const otaTimeoutHandler = () => {
          startedOTA = false;
          stopOTA('OTA Timeout', false, true);
          this.otaState = SmartDrive.OTAState.timeout;
        };
        const otaRetryHandler = () => {
          begin();
        };
        const connectHandler = () => {
          this.ableToSend = false;
          // clear out the connection interval
          timer.clearInterval(connectionIntervalID);
        };
        const disconnectHandler = () => {
          this.ableToSend = false;
          hasRebooted = true;
          if (connectionIntervalID) {
            timer.clearInterval(connectionIntervalID);
          }
          if (!cancelOTA) {
            // try to connect to it again
            connectionIntervalID = timer.setInterval(() => {
              console.log(`Disconnected - reconnecting to ${this.address}`);
              this.connect();
            }, smartDriveConnectionInterval);
          }
        };
        const bleVersionHandler = data => {
          bleVersion = data.data.ble;
          haveBLEVersion = true;
          if (bleVersion < bleFWVersion) {
            this.doBLEUpdate = true;
          }
        };
        const mcuVersionHandler = data => {
          mcuVersion = data.data.mcu;
          haveMCUVersion = true;
          if (mcuVersion < mcuFWVersion) {
            this.doMCUUpdate = true;
          }
        };
        const otaMCUReadyHandler = data => {
          startedOTA = true;
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
          console.log(`Got MCU OTAReady from ${this.address}`);
          this.otaState = SmartDrive.OTAState.updating_mcu;
        };
        const otaBLEReadyHandler = data => {
          startedOTA = true;
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
          console.log(`Got BLE OTAReady from ${this.address}`);
          this.otaState = SmartDrive.OTAState.updating_ble;
        };
        const otaReadyHandler = data => {
          startedOTA = true;
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
          console.log(`Got OTAReady from ${this.address}`);
          if (this.otaState === SmartDrive.OTAState.awaiting_mcu_ready) {
            console.log('CHANGING SD OTA STATE TO UPDATING MCU');
            this.otaState = SmartDrive.OTAState.updating_mcu;
          } else if (this.otaState === SmartDrive.OTAState.awaiting_ble_ready) {
            console.log('CHANGING SD OTA STATE TO UPDATING BLE');
            this.otaState = SmartDrive.OTAState.updating_ble;
          }
        };
        let writeFirmwareTimeoutID = null;
        const writeFirmwareSector = (
          device: string,
          fw: any,
          characteristic: any,
          nextState: any
        ) => {
          if (writeFirmwareTimeoutID) {
            timer.clearTimeout(writeFirmwareTimeoutID);
          }
          writeFirmwareTimeoutID = null;
          if (index < 0) {
            console.log(
              'writing firmware to ' + device + ' at ' + characteristic
            );
            index = 0;
          }
          const fileSize = fw.length;
          try {
            if (cancelOTA) {
              return;
            } else if (
              paused ||
              !this.connected ||
              !this.ableToSend ||
              !this.notifying
            ) {
              // console.log('NOT WRITING TO SD!');
              writeFirmwareTimeoutID = timer.setTimeout(() => {
                // console.log('trying now!');
                writeFirmwareSector(device, fw, characteristic, nextState);
              }, 500);
            } else if (index < fileSize) {
              // console.log(`Writing ${index} / ${fileSize} of ota to ${device}`);
              let data = null;
              if (device === 'SmartDrive') {
                const p = new Packet();
                p.makeOTAPacket(device, index, fw);
                data = p.toUint8Array();
                p.destroy();
              } else if (device === 'SmartDriveBluetooth') {
                const length = Math.min(fw.length - index, 16);
                data = Uint8Array.from(fw.subarray(index, index + length));
              } else {
                throw `ERROR: ${device} should be either 'SmartDrive' or 'SmartDriveBluetooth'`;
              }
              // TODO: add write timeout here in case of disconnect or other error
              this._bluetoothService
                .write({
                  peripheralUUID: this.address,
                  serviceUUID: SmartDrive.ServiceUUID,
                  characteristicUUID: characteristic,
                  value: data
                })
                .then(() => {
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    this.ableToSend = true;
                    index += payloadSize;
                    writeFirmwareSector(device, fw, characteristic, nextState);
                  }, 0);
                })
                .catch(err => {
                  console.log(`Couldn't send fw to ${device}: ${err}`);
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    console.log('Retrying');
                    writeFirmwareSector(device, fw, characteristic, nextState);
                  }, 500);
                });
            } else {
              // we are done with the sending change
              // state to the next state
              this.otaState = nextState;
            }
          } catch (err) {
            console.log(`WriteFirmwareSector error: ${err}`);
            writeFirmwareTimeoutID = timer.setTimeout(() => {
              writeFirmwareSector(device, fw, characteristic, nextState);
            }, 500);
          }
        };
        const stopOTA = (
          reason: string,
          success: boolean = false,
          doRetry: boolean = false
        ) => {
          startedOTA = false;
          cancelOTA = true;
          this.otaActions = [];
          // stop timers
          if (connectionIntervalID) {
            timer.clearInterval(connectionIntervalID);
          }
          if (otaIntervalID) {
            timer.clearInterval(otaIntervalID);
          }
          if (otaTimeoutID) {
            timer.clearInterval(otaTimeoutID);
          }
          // unregister from all events
          unregister();

          // if we are supposed to retry
          const retry = () => {
            cancelOTA = false;
            this.on(SmartDrive.ota_retry_event, otaRetryHandler);
            this.on(SmartDrive.ota_cancel_event, otaCancelHandler);
            this.otaActions = ['ota.action.retry'];
            otaIntervalID = timer.setInterval(runOTA, 250);
          };

          const finish = () => {
            if (success) {
              resolve(reason);
            } else if (doRetry) {
              retry();
            } else {
              resolve(reason);
            }
          };
          return this.stopNotifyCharacteristics(SmartDrive.Characteristics)
            .then(() => {
              console.log(`Disconnecting from ${this.address}`);
              return this._bluetoothService.disconnect({
                UUID: this.address
              });
            })
            .then(finish)
            .catch(finish);
        };
        const runOTA = () => {
          switch (this.otaState) {
            case SmartDrive.OTAState.not_started:
              this.otaActions = ['ota.action.start'];
              break;
            case SmartDrive.OTAState.awaiting_versions:
              if (haveBLEVersion && haveMCUVersion) {
                if (
                  bleVersion === bleFWVersion &&
                  mcuVersion === mcuFWVersion
                ) {
                  this.otaActions = ['ota.action.force', 'ota.action.cancel'];
                } else {
                  this.otaState = SmartDrive.OTAState.awaiting_mcu_ready;
                }
              } else if (haveMCUVersion && !haveBLEVersion) {
                this.otaState = SmartDrive.OTAState.comm_failure;
                timer.setTimeout(() => {
                  stopOTA('Communications Failed', false, false);
                }, 2500);
              }
              break;
            case SmartDrive.OTAState.awaiting_mcu_ready:
              startedOTA = true;
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.otaActions = ['ota.action.cancel'];
              // make sure the index is set to -1 to start next OTA
              index = -1;
              if (this.connected && this.ableToSend) {
                // send start OTA
                this.sendPacket(
                  'Command',
                  'StartOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'SmartDrive'
                ).catch(err => {});
              }
              break;
            case SmartDrive.OTAState.updating_mcu:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              // now that we've successfully gotten the
              // SD connected - don't timeout
              if (otaTimeoutID) {
                timer.clearTimeout(otaTimeoutID);
              }

              // what state do we go to next?
              const nextState = this.doBLEUpdate
                ? SmartDrive.OTAState.awaiting_ble_ready
                : this.doMCUUpdate
                ? SmartDrive.OTAState.rebooting_mcu
                : SmartDrive.OTAState.complete;

              if (this.doMCUUpdate) {
                // we need to reboot after the OTA
                hasRebooted = false;
                // make sure we clear out the version info that we get
                haveMCUVersion = false;
                // now send data to SD MCU - probably want
                // to send all the data here and cancel
                // the interval for now? - shouldn't need
                // to
                if (index === -1) {
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    writeFirmwareSector(
                      'SmartDrive',
                      mcuFirmware,
                      SmartDrive.ControlCharacteristic.toUpperCase(),
                      nextState
                    );
                  }, 0);
                }
              } else {
                // go to next state
                this.otaState = nextState;
              }
              // update the progress bar
              this.mcuOTAProgress = ((index + 16) * 100) / mcuFirmware.length;
              break;
            case SmartDrive.OTAState.awaiting_ble_ready:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.otaActions = ['ota.action.cancel'];
              // make sure the index is set to -1 to start next OTA
              index = -1;
              // now send StartOTA to BLE
              if (this.connected && this.ableToSend) {
                // send start OTA
                console.log(`Sending StartOTA::BLE to ${this.address}`);
                const data = Uint8Array.from([0x06]); // this is the start command
                this._bluetoothService
                  .write({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
                    characteristicUUID: SmartDrive.BLEOTAControlCharacteristic.toUpperCase(),
                    value: data
                  })
                  .then(() => {
                    this.ableToSend = true;
                  })
                  .catch(err => {});
              }
              break;
            case SmartDrive.OTAState.updating_ble:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              // now that we've successfully gotten the
              // SD connected - don't timeout
              if (otaTimeoutID) {
                timer.clearTimeout(otaTimeoutID);
              }
              if (this.doBLEUpdate) {
                // we need to reboot after the OTA
                hasRebooted = false;
                // make sure we clear out the version info that we get
                haveBLEVersion = false;
                // now send data to SD BLE
                if (index === -1) {
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    writeFirmwareSector(
                      'SmartDriveBluetooth',
                      bleFirmware,
                      SmartDrive.BLEOTADataCharacteristic.toUpperCase(),
                      SmartDrive.OTAState.rebooting_ble
                    );
                  }, 0);
                }
              } else {
                this.otaState = this.doMCUUpdate
                  ? SmartDrive.OTAState.rebooting_mcu
                  : SmartDrive.OTAState.complete;
              }
              // update the progress bar
              this.bleOTAProgress = ((index + 16) * 100) / bleFirmware.length;
              break;
            case SmartDrive.OTAState.rebooting_ble:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.otaActions = [];
              // if we have gotten the version, it has
              // rebooted so now we should reboot the
              // MCU
              if (haveBLEVersion) {
                this.otaState = SmartDrive.OTAState.rebooting_mcu;
                hasRebooted = false;
              } else if (this.connected && !hasRebooted) {
                // send BLE stop ota command
                console.log(`Sending StopOTA::BLE to ${this.address}`);
                const data = Uint8Array.from([0x03]); // this is the stop command
                this._bluetoothService
                  .write({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
                    characteristicUUID: SmartDrive.BLEOTAControlCharacteristic.toUpperCase(),
                    value: data
                  })
                  .then(() => {
                    this.ableToSend = true;
                  })
                  .catch(err => {});
              }
              break;
            case SmartDrive.OTAState.rebooting_mcu:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.otaActions = [];
              // if we have gotten the version, it has
              // rebooted so now we should reboot the
              // MCU
              if (haveMCUVersion) {
                this.otaState = SmartDrive.OTAState.verifying_update;
                hasRebooted = false;
              } else if (this.connected && !hasRebooted) {
                // send MCU stop ota command
                // send stop OTA
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'SmartDrive'
                ).catch(() => {});
              }
              break;
            case SmartDrive.OTAState.verifying_update:
              this.otaActions = [];
              // check the versions here and notify the
              // user of the success / failure of each
              // of t he updates!
              // - probably add buttons so they can retry?
              this.otaEndTime = new Date();
              let msg = '';
              if (mcuVersion === mcuFWVersion && bleVersion === bleFWVersion) {
                msg = `SmartDrive OTA Succeeded! ${mcuVersion.toString(
                  16
                )}, ${bleVersion.toString(16)}`;
                console.log(msg);
                this.otaState = SmartDrive.OTAState.complete;
              } else {
                msg = `SmartDrive OTA FAILED! ${mcuVersion.toString(
                  16
                )}, ${bleVersion.toString(16)}`;
                console.log(msg);
                this.otaState = SmartDrive.OTAState.failed;
                stopOTA('OTA Failed', false, true);
              }
              break;
            case SmartDrive.OTAState.complete:
              stopOTA('OTA Complete', true);
              break;
            case SmartDrive.OTAState.canceling:
              cancelOTA = true;
              this.otaActions = [];
              this.mcuOTAProgress = 0;
              this.bleOTAProgress = 0;
              if (!startedOTA) {
                this.otaState = SmartDrive.OTAState.canceled;
              } else if (this.connected && this.ableToSend) {
                // send stop OTA command
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'SmartDrive'
                )
                  .then(() => {
                    // now set state to cancelled
                    this.otaState = SmartDrive.OTAState.canceled;
                  })
                  .catch(err => {
                    console.log(`Couldn't cancel ota, retrying: ${err}`);
                  });
              } else {
                // now set state to cancelled
                this.otaState = SmartDrive.OTAState.canceled;
              }
              break;
            case SmartDrive.OTAState.canceled:
              stopOTA('OTA Canceled', false);
              break;
            case SmartDrive.OTAState.failed:
              break;
            case SmartDrive.OTAState.comm_failure:
              break;
            case SmartDrive.OTAState.timeout:
              break;
            default:
              break;
          }
        };
        // now actually start
        begin();
      }
    });
  }

  // TODO: abstract sendPacket to the DeviceBase class
  public sendSettings(
    mode: string,
    units: string,
    flags: number,
    tap_sensitivity: number,
    acceleration: number,
    max_speed: number
  ): Promise<any> {
    const settings = super.sendSettings(
      mode,
      units,
      flags,
      tap_sensitivity,
      acceleration,
      max_speed
    );
    return this.sendPacket(
      'Command',
      'SetSettings',
      'settings',
      null,
      settings
    );
  }

  public sendSettingsObject(settings: SmartDrive.Settings): Promise<any> {
    const _settings = super.sendSettings(
      settings.controlMode,
      settings.units,
      0,
      settings.tapSensitivity / 100.0,
      settings.acceleration / 100.0,
      settings.maxSpeed / 100.0
    );
    return this.sendPacket(
      'Command',
      'SetSettings',
      'settings',
      null,
      _settings
    );
  }

  public sendPacket(
    Type: string,
    SubType: string,
    dataKey?: string,
    dataType?: string,
    data?: any
  ): Promise<any> {
    if (this.ableToSend) {
      console.log(`Sending ${Type}::${SubType}::${data} to ${this.address}`);
      const p = new Packet();
      p.Type(Type);
      p.SubType(SubType);
      // if dataType is non-null and not '', then we need to transform the data
      let boundData = data;
      if (dataType && dataType.length) {
        boundData = Packet.makeBoundData(dataType, data);
      }
      p.data(dataKey, boundData);
      const transmitData = p.toUint8Array();
      p.destroy();
      // console.log(`sending ${transmitData}`);

      return this._bluetoothService.write({
        peripheralUUID: this.address,
        serviceUUID: SmartDrive.ServiceUUID,
        characteristicUUID: SmartDrive.ControlCharacteristic.toUpperCase(),
        value: transmitData
      });
    } else {
      return Promise.reject('Smartdrive is unable to send');
    }
  }

  public sendTap() {
    return this.sendPacket('Command', 'Tap');
  }

  public stopMotor() {
    return this.sendPacket('Command', 'TurnOffMotor');
  }

  // handlers

  private stoppingNotify = false;
  private stopNotifyCharacteristics(
    characteristics: Array<string>
  ): Promise<any> {
    if (this.stoppingNotify)
      return Promise.resolve('Already stopping notifying!');
    else this.stoppingNotify = true;
    //console.log(`StopNotifying`);
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
              timer.setTimeout(() => {
                //console.log(`Stop Notifying ${characteristic}`);
                this._bluetoothService
                  .stopNotifying({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
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
    //console.log(`StartNotifying`);
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
              timer.setTimeout(() => {
                //console.log(`Start Notifying ${characteristic}`);
                this._bluetoothService
                  .startNotifying({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
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

  public connect() {
    return this._bluetoothService.connect(
      this.address,
      this.handleConnect.bind(this),
      this.handleDisconnect.bind(this)
    );
  }

  public disconnect() {
    // TODO: THIS IS A HACK TO FORCE THE BLE CHIP TO REBOOT AND CLOSE THE CONNECTION
    const data = Uint8Array.from([0x03]); // this is the OTA stop command
    return this._bluetoothService
      .write({
        peripheralUUID: this.address,
        serviceUUID: SmartDrive.ServiceUUID,
        characteristicUUID: SmartDrive.BLEOTAControlCharacteristic.toUpperCase(),
        value: data
      })
      .then(() => {
        return this._bluetoothService.disconnect({
          UUID: this.address
        });
      })
      .catch(err => {
        console.log('DISCONNECT ERR:', err);
      });
  }

  public handleConnect(data?: any) {
    // update state
    this.connected = true;
    this.notifying = false;
    this.ableToSend = false;
    // now that we're connected, subscribe to the characteristics
    this.startNotifyCharacteristics(SmartDrive.Characteristics)
      .then(() => {
        this.sendEvent(SmartDrive.smartdrive_connect_event);
      })
      .catch(err => {});
  }

  public handleDisconnect() {
    // update state
    this.notifying = false;
    this.connected = false;
    this.ableToSend = false;
    // now that we're disconnected - make sure we unsubscribe to the characteristics
    this.stopNotifyCharacteristics(SmartDrive.Characteristics).then(() => {
      this.sendEvent(SmartDrive.smartdrive_disconnect_event);
    });
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
          this._handleDeviceInfo(p);
          break;
        case 'MotorInfo':
          this._handleMotorInfo(p);
          break;
        case 'MotorDistance':
          this._handleDistanceInfo(p);
          break;
        default:
          break;
      }
    } else if (packetType === 'Command') {
      switch (subType) {
        case 'OTAReady':
          this._handleOTAReady(p);
          break;
        default:
          break;
      }
    } else if (packetType === 'Error') {
      this._handleError(p);
    }
  }

  public getBleDisconnectError() {
    /*
	  const boundError = Packet.makeBoundData('PacketErrorType', 'BLEDisconnect');
	  return bindingTypeToString('PacketErrorType', boundError);
	  */
    return 'BLEDisconnect';
  }

  // private functions
  private _handleError(p: Packet) {
    // This is sent by the smartdrive whenever it encounters an error
    const errorType = p.SubType();
    const errorId = p.data('errorId');
    this.sendEvent(SmartDrive.smartdrive_error_event, {
      errorType: errorType,
      errorId: errorId
    });
  }

  private _handleDeviceInfo(p: Packet) {
    // This is sent by the SmartDrive Bluetooth Chip when it
    // connects
    const devInfo = p.data('deviceInfo');
    // so they get updated
    /* Device Info
           struct {
           Device     device;     // Which Device is this about?
           uint8_t    version;    // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           }            deviceInfo;
        */
    this.ble_version = devInfo.version;
    this.sendEvent(SmartDrive.smartdrive_ble_version_event, {
      ble: this.ble_version
    });
  }

  private _handleMotorInfo(p: Packet) {
    // This is sent by the SmartDrive microcontroller every 200ms
    // (5 hz) while connected
    const motorInfo = p.data('motorInfo');
    /* Motor Info
           struct {
           Motor::State state;
           uint8_t      batteryLevel; // [0,100] integer percent.
           uint8_t      version;      // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           uint8_t      padding;
           float        distance;
           float        speed;
           float        driveTime;
           }            motorInfo;
        */
    this.mcu_version = motorInfo.version;
    this.battery = motorInfo.batteryLevel;
    const motorOnState = Packet.makeBoundData('MotorState', 'On');
    this.driving = motorInfo.state === motorOnState;
    // send events to subscribers
    this.sendEvent(SmartDrive.smartdrive_mcu_version_event, {
      mcu: this.mcu_version
    });
    this.sendEvent(SmartDrive.smartdrive_motor_info_event, {
      motorInfo: motorInfo
    });
  }

  private _handleDistanceInfo(p: Packet) {
    // This is sent by the SmartDrive microcontroller every 1000
    // ms (1 hz) while connected and the motor is off
    const motorTicks = p.data('motorDistance');
    const caseTicks = p.data('caseDistance');
    const motorMiles = SmartDrive.motorTicksToMiles(motorTicks);
    const caseMiles = SmartDrive.caseTicksToMiles(caseTicks);
    /* Distance Info
           struct {
           uint64_t   motorDistance;  // Cumulative Drive distance in ticks.
           uint64_t   caseDistance;   // Cumulative Case distance in ticks.
           }            distanceInfo;
        */
    this.driveDistance = motorTicks;
    this.coastDistance = caseTicks;
    /*
		  console.log(`Got distance info: ${motorTicks}, ${caseTicks}`);
		  console.log(`                 : ${motorMiles}, ${caseMiles}`);
		*/
    this.sendEvent(SmartDrive.smartdrive_distance_event, {
      driveDistance: motorTicks,
      coastDistance: caseTicks
    });
  }

  private _handleOTAReady(p: Packet) {
    // this is sent by both the MCU and the BLE chip in response
    // to a Command::StartOTA
    const otaDevice = bindingTypeToString('PacketOTAType', p.data('OTADevice'));
    switch (otaDevice) {
      case 'SmartDrive':
        this.sendEvent(SmartDrive.smartdrive_ota_ready_mcu_event);
        break;
      case 'SmartDriveBluetooth':
        this.sendEvent(SmartDrive.smartdrive_ota_ready_ble_event);
        break;
      default:
        this.sendEvent(SmartDrive.smartdrive_ota_ready_event);
        break;
    }
  }
}

export namespace SmartDrive {
  export class Settings extends Observable {
    // settings classes
    static ControlMode = class {
      static Options: string[] = ['MX1', 'MX2', 'MX2+'];

      static Off = 'Off';

      static Beginner = 'MX1';
      static Intermediate = 'MX2';
      static Advanced = 'MX2+';

      static MX1 = 'MX1';
      static MX2 = 'MX2';
      static MX2plus = 'MX2+';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('SmartDriveControlMode', s.ControlMode);
        return SmartDrive.Settings.ControlMode[o];
      }
    };

    static Units = class {
      static Options: string[] = ['English', 'Metric'];
      static Translations: string[] = [
        'smartdrive.settings.units.english',
        'smartdrive.settings.units.metric'
      ];

      static English = 'English';
      static Metric = 'Metric';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('Units', s.Units);
        return SmartDrive.Settings.Units[o];
      }
    };

    // public members
    controlMode: string = SmartDrive.Settings.ControlMode.MX2plus;
    ezOn = false;
    units: string = SmartDrive.Settings.Units.English;
    acceleration = 30;
    maxSpeed = 70;
    tapSensitivity = 100;

    ledColor: Color = new Color('#3c8aba');

    constructor() {
      super();
    }

    static getBoolSetting(flags: number, settingBit: number): boolean {
      return ((flags >> settingBit) & 0x01) > 0;
    }

    increase(key: string, increment: number = 10): void {
      let index;
      switch (key) {
        case 'Max Speed':
          this.maxSpeed = Math.min(this.maxSpeed + increment, 100);
          break;
        case 'Acceleration':
          this.acceleration = Math.min(this.acceleration + increment, 100);
          break;
        case 'Tap Sensitivity':
          this.tapSensitivity = Math.min(this.tapSensitivity + increment, 100);
          break;
        case 'Control Mode':
          index = SmartDrive.Settings.ControlMode.Options.indexOf(
            this.controlMode
          );
          index = mod(
            index + 1,
            SmartDrive.Settings.ControlMode.Options.length
          );
          this.controlMode = SmartDrive.Settings.ControlMode.Options[index];
          break;
        case 'Units':
          index = SmartDrive.Settings.Units.Options.indexOf(this.units);
          index = mod(index + 1, SmartDrive.Settings.Units.Options.length);
          this.units = SmartDrive.Settings.Units.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 10): void {
      let index;
      switch (key) {
        case 'Max Speed':
          this.maxSpeed = Math.max(this.maxSpeed - increment, 10);
          break;
        case 'Acceleration':
          this.acceleration = Math.max(this.acceleration - increment, 10);
          break;
        case 'Tap Sensitivity':
          this.tapSensitivity = Math.max(this.tapSensitivity - increment, 10);
          break;
        case 'Control Mode':
          index = SmartDrive.Settings.ControlMode.Options.indexOf(
            this.controlMode
          );
          index = mod(
            index - 1,
            SmartDrive.Settings.ControlMode.Options.length
          );
          this.controlMode = SmartDrive.Settings.ControlMode.Options[index];
          break;
        case 'Units':
          index = SmartDrive.Settings.Units.Options.indexOf(this.units);
          index = mod(index - 1, SmartDrive.Settings.Units.Options.length);
          this.units = SmartDrive.Settings.Units.Options[index];
          break;
      }
    }

    fromSettings(s: any): void {
      // from c++ settings bound array to c++ class
      this.controlMode = SmartDrive.Settings.ControlMode.fromSettings(s);
      this.units = SmartDrive.Settings.Units.fromSettings(s);
      this.ezOn = SmartDrive.Settings.getBoolSetting(s.Flags, 0);
      // these floats are [0,1] on pushtracker
      this.acceleration = Math.round(s.Acceleration * 100.0);
      this.maxSpeed = Math.round(s.MaxSpeed * 100.0);
      this.tapSensitivity = Math.round(s.TapSensitivity * 100.0);
    }

    copy(s: any) {
      // from a settings class exactly like this
      this.controlMode = s.controlMode;
      this.units = s.units;
      this.ezOn = s.ezOn;
      this.acceleration = s.acceleration;
      this.maxSpeed = s.maxSpeed;
      this.tapSensitivity = s.tapSensitivity;
    }

    diff(s: any): boolean {
      return (
        this.controlMode !== s.controlMode ||
        this.units !== s.units ||
        this.ezOn !== s.ezOn ||
        this.acceleration !== s.acceleration ||
        this.maxSpeed !== s.maxSpeed ||
        this.tapSensitivity !== s.tapSensitivity
      );
    }
  }
}
