const PacketBinding = require('./packet_bindings');
const Buffer = require('buffer').Buffer;

export function bindingTypeToString(bindingType, bindingValue) {
  let valueName = null;
  if (bindingType === null || bindingType === undefined || bindingValue === null || bindingValue === undefined) {
    return valueName;
  }
  const names = Object.keys(PacketBinding[bindingType]).filter(key => {
    if (PacketBinding[bindingType][key] === bindingValue) {
      return true;
    }
  });
  if (names.length === 1) {
    valueName = names[0];
  }

  return valueName;
}

export class Packet {
  // static
  public static makeBoundData(bindingType: string, data: string) {
    return PacketBinding[bindingType][data];
  }

  public static maxSize = 18;

  // private members
  private instance: any;
  private _bytes: any;

  // lifecycle
  constructor(bytes?: any) {
    this.initialize(bytes);
  }

  public initialize(bytes?: any) {
    this.destroy();
    this.instance = new PacketBinding.Packet();
    this.instance.newPacket();

    this._bytes = bytes;

    if (bytes) {
      this.instance.processPacket(bytes);
    }
  }

  public destroy() {
    if (this.instance) {
      this.instance.delete();
    }
  }

  public toBuffer() {
    let output = null;
    if (this.instance) {
      output = bufferToHex(this.writableBuffer());
    }

    return output;
  }

  public toString() {
    return toString(this.toBuffer());
  }

  public toUint8Array() {
    return toUint8Array(this.writableBuffer());
  }

  // BINDING WRAPPING

  public makePacket(_type, subType, key, data) {
    try {
      if (this.instance === undefined || this.instance === null) {
        this.initialize();
      }
      this.instance.Type = PacketBinding.PacketType[_type];
      this.instance[_type] = PacketBinding[`Packet${_type}Type`][subType];
      if (key && data) {
        this.instance[key] = data;
      }
    } catch (err) {
      console.log(`Couldn't make packet: ${_type}::${subType}::${key} - ${err}`);
    }
  }

  public makeOTAPacket(device: string, startIndex: number, firmware: any) {
    let length = Math.min(firmware.length - startIndex, 16);
    let bytes = new PacketBinding.VectorInt();
    for (let i = 0; i < length; i++) {
      bytes.push_back(firmware[startIndex + i]);
    }
    this.data('length', length);
    this.makePacket('OTA', device, 'bytes', bytes);
  }

  public writableBuffer() {
    let output = null;

    if (this.instance) {
      let vectorOut = new PacketBinding.VectorInt();
      vectorOut = this.instance.format();
      const len = vectorOut.size();
      output = Buffer.alloc(len);
      for (let i = 0; i < vectorOut.size(); i++) {
        output[i] = vectorOut.get(i);
      }
      vectorOut.delete();
    }

    return output;
  }

  // ACCESSING FUNCTIONS

  public Type(newType?: any) {
    if (this.instance !== null && this.instance !== undefined) {
      if (newType) {
        this.instance.Type = PacketBinding.PacketType[newType];
      } else {
        return bindingTypeToString('PacketType', this.instance.Type);
      }
    } else {
      return null;
    }
  }

  public SubType(newSubType?: any) {
    if (this.instance !== null && this.instance !== undefined) {
      const _type = this.Type();
      const bindingKey = `Packet${_type}Type`;
      if (_type && bindingKey && newSubType) {
        this.instance[_type] = PacketBinding[bindingKey][newSubType];
      } else if (bindingKey && _type) {
        return bindingTypeToString(bindingKey, this.instance[_type]);
      }
    } else {
      return null;
    }
  }

  public data(key: string, value?: any) {
    if (this.instance) {
      try {
        if (value) {
          this.instance[key] = value;
        } else {
          return this.instance[key];
        }
      } catch (err) {
        console.log(`Couldn't get/set data: ${key} - ${err}`);
      }
    }

    return null;
  }

  public getPayload() {}

  public parse() {}

  public parseData(data) {}

  public parseCommand(command) {}

  public parseError(error) {}

  public parseOTA(ota) {}
}

// Utility functions:

export function decimalToHex(d) {
  const hex = Number(d).toString(16);
  const hexStr = '00'.substring(0, 2 - hex.length) + hex;

  return hexStr.toUpperCase();
}

export function toString(data) {
  let dataStr = '';
  data.map(d => {
    dataStr += ` ${decimalToHex(d)}`;
  });
  const str = `${dataStr.trim()}`;

  return str;
}

export function toUint8Array(data) {
  return Uint8Array.from(data);
}

export function makePacketData(_type, subtype, key, data) {
  const p = new Packet();
  p.makePacket(_type, subtype, key, data);
  const dataBuffer = p.writableBuffer();
  p.destroy();

  return bufferToHex(dataBuffer);
}

export function bufferToHex(dataArray) {
  const str = dataArray.map(d => {
    return `0x${d.toString(16).toUpperCase()}`;
  });

  return str;
}
