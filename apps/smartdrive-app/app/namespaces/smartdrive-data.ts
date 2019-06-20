import { knownFolders, path } from 'tns-core-modules/file-system';
import { eachDay, format, subDays } from 'date-fns';

export namespace SmartDriveData {
  export namespace Info {
    export const TableName = 'SmartDriveInfo';
    export const IdName = 'id';
    export const DateName = 'date';
    export const BatteryName = 'battery';
    export const DriveDistanceName = 'drive_distance';
    export const CoastDistanceName = 'coast_distance';
    export const UuidName = 'uuid';
    export const HasBeenSentName = 'has_been_sent';
    export const Fields = [
      { name: DateName, type: 'TEXT' },
      { name: BatteryName, type: 'smallint' },
      { name: DriveDistanceName, type: 'bigint' },
      { name: CoastDistanceName, type: 'bigint' },
      { name: UuidName, type: 'TEXT' },
      { name: HasBeenSentName, type: 'bit' }
    ];

    export function getDateValue(date: any) {
      return format(date, 'YYYY/MM/DD');
    }

    export function getPastDates(numDates: number) {
      const now = new Date();
      return eachDay(subDays(now, numDates), now);
    }

    export function newInfo(
      id: number,
      date: any,
      battery: number,
      drive: number,
      coast: number
    ) {
      return {
        [SmartDriveData.Info.IdName]: id,
        [SmartDriveData.Info.DateName]: SmartDriveData.Info.getDateValue(date),
        [SmartDriveData.Info.BatteryName]: +battery,
        [SmartDriveData.Info.DriveDistanceName]: +drive,
        [SmartDriveData.Info.CoastDistanceName]: +coast,
        [SmartDriveData.Info.UuidName]: java.util.UUID.randomUUID().toString(),
        [SmartDriveData.Info.HasBeenSentName]: 0
      };
    }

    export function loadInfo(
      id: number,
      date: any,
      battery: number,
      drive: number,
      coast: number,
      uuid: string,
      has_been_sent: number
    ) {
      return {
        [SmartDriveData.Info.IdName]: id,
        [SmartDriveData.Info.DateName]: SmartDriveData.Info.getDateValue(date),
        [SmartDriveData.Info.BatteryName]: +battery,
        [SmartDriveData.Info.DriveDistanceName]: +drive,
        [SmartDriveData.Info.CoastDistanceName]: +coast,
        [SmartDriveData.Info.UuidName]: uuid,
        [SmartDriveData.Info.HasBeenSentName]: +has_been_sent
      };
    }
  }

  export namespace Errors {
    export const TableName = 'SmartDriveErrors';
    export const IdName = 'id';
    export const TimestampName = 'timestamp';
    export const ErrorCodeName = 'error_code';
    export const ErrorIdName = 'error_id';
    export const UuidName = 'uuid';
    export const HasBeenSentName = 'has_been_sent';
    export const Fields = [
      { name: TimestampName, type: 'TEXT' },
      { name: ErrorCodeName, type: 'TEXT' },
      { name: ErrorIdName, type: 'int' },
      { name: UuidName, type: 'TEXT' },
      { name: HasBeenSentName, type: 'bit' }
    ];

    export function getTimestamp() {
      // 'x' is Milliseconds timetsamp format
      return format(new Date(), 'x');
    }

    export function loadError(
      id: any,
      timestamp: any,
      errorType: string,
      errorId: number,
      uuid: string,
      has_been_sent: number
    ) {
      return {
        [SmartDriveData.Errors.IdName]: id,
        [SmartDriveData.Errors.TimestampName]: timestamp,
        [SmartDriveData.Errors.ErrorCodeName]: errorType,
        [SmartDriveData.Errors.ErrorIdName]: errorId,
        [SmartDriveData.Errors.UuidName]: uuid,
        [SmartDriveData.Errors.HasBeenSentName]: +has_been_sent
      };
    }

    export function newError(errorType: string, errorId: number) {
      return {
        [SmartDriveData.Errors
          .TimestampName]: SmartDriveData.Errors.getTimestamp(),
        [SmartDriveData.Errors.ErrorCodeName]: errorType,
        [SmartDriveData.Errors.ErrorIdName]: errorId,
        [SmartDriveData.Errors
          .UuidName]: java.util.UUID.randomUUID().toString(),
        [SmartDriveData.Errors.HasBeenSentName]: 0
      };
    }
  }

  export namespace Firmwares {
    export const TableName = 'SmartDriveFirmwares';
    export const IdName = 'id';
    export const VersionName = 'version';
    export const FirmwareName = 'firmware';
    export const FileName = 'filename';
    export const ChangesName = 'changes';
    export const Fields = [
      { name: VersionName, type: 'int' },
      { name: FirmwareName, type: 'TEXT' },
      { name: FileName, type: 'TEXT' },
      { name: ChangesName, type: 'TEXT' }
    ];

    export const FilePath = '/assets/firmwares/';

    export function versionByteToString(version: number): string {
      if (version === 0xff || version === 0x00) {
        return 'unknown';
      } else {
        return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
      }
    }

    export function versionStringToByte(version: string): number {
      const [major, minor] = version.split('.');
      return (parseInt(major) << 4) | parseInt(minor);
    }

    export function getFileName(firmware: string): string {
      return path.join(
        knownFolders.currentApp().path,
        SmartDriveData.Firmwares.FilePath + firmware
      );
    }

    export function loadFirmware(
      id: any,
      version: number,
      firmwareName: string,
      fileName: string,
      changes: string
    ) {
      return {
        [SmartDriveData.Firmwares.IdName]: id,
        [SmartDriveData.Firmwares.VersionName]: version,
        [SmartDriveData.Firmwares.FirmwareName]: firmwareName,
        [SmartDriveData.Firmwares.FileName]: fileName,
        [SmartDriveData.Firmwares.ChangesName]: changes
          ? JSON.parse(changes)
          : []
      };
    }

    export function newFirmware(
      version: number,
      firmwareName: string,
      fileName?: string,
      changes?: string[]
    ) {
      const fname =
        fileName || SmartDriveData.Firmwares.getFileName(firmwareName);
      return {
        [SmartDriveData.Firmwares.VersionName]: version,
        [SmartDriveData.Firmwares.FirmwareName]: firmwareName,
        [SmartDriveData.Firmwares.FileName]: fname,
        [SmartDriveData.Firmwares.ChangesName]: changes
          ? JSON.stringify(changes)
          : '[]'
      };
    }
  }
}
