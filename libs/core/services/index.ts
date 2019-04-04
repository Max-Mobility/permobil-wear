import { BluetoothService } from './bluetooth.service';
import { SensorDataService } from './sensor-data.service';
import { SentryService } from './sentry.service';

// exporting an array of any service that will be used for dependency injection on app.ts during start up
export const SERVICES = [BluetoothService, SensorDataService, SentryService];

// export all services so they're able to be imported for types when used
export * from './bluetooth.service';
export * from './sensor-data.service';
export * from './sentry.service';
