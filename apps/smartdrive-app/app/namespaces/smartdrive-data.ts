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
    export const Fields = [
      DateName,
      BatteryName,
      DriveDistanceName,
      CoastDistanceName,
      UuidName
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
        [SmartDriveData.Info.UuidName]: java.util.UUID.randomUUID().toString()
      };
    }

    export function loadInfo(
      id: number,
      date: any,
      battery: number,
      drive: number,
      coast: number,
      uuid: string
    ) {
      return {
        [SmartDriveData.Info.IdName]: id,
        [SmartDriveData.Info.DateName]: SmartDriveData.Info.getDateValue(date),
        [SmartDriveData.Info.BatteryName]: +battery,
        [SmartDriveData.Info.DriveDistanceName]: +drive,
        [SmartDriveData.Info.CoastDistanceName]: +coast,
        [SmartDriveData.Info.UuidName]: uuid
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
    export const Fields = [TimestampName, ErrorCodeName, ErrorIdName, UuidName];

    export function getTimestamp() {
      // 'x' is Milliseconds timetsamp format
      return format(new Date(), 'x');
    }

    export function loadError(
      timestamp: any,
      errorType: number,
      errorId: number,
      uuid: string
    ) {
      return {
        [SmartDriveData.Errors.TimestampName]: timestamp,
        [SmartDriveData.Errors.ErrorCodeName]: errorType,
        [SmartDriveData.Errors.ErrorIdName]: errorId,
        [SmartDriveData.Errors.UuidName]: uuid
      };
    }

    export function newError(errorType: number, errorId: number) {
      return {
        [SmartDriveData.Errors
          .TimestampName]: SmartDriveData.Errors.getTimestamp(),
        [SmartDriveData.Errors.ErrorCodeName]: errorType,
        [SmartDriveData.Errors.ErrorIdName]: errorId,
        [SmartDriveData.Errors.UuidName]: java.util.UUID.randomUUID().toString()
      };
    }
  }
}
