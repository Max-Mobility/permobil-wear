import { BluetoothService } from './bluetooth.service';
import { SensorService } from './sensor.service';
import { SentryService } from './sentry.service';

// exporting an array of any service that will be used for dependency injection on app.ts during start up
export const SERVICES = [BluetoothService, SensorService, SentryService];

// export all services so they're able to be imported for types when used
export * from './bluetooth.service';
export * from './sensor.service';
export * from './sentry.service';
