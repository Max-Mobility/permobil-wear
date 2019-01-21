import './core/async-await';
import * as application from 'tns-core-modules/application';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { Sentry } from 'nativescript-sentry';
import { APP_KEY, APP_SECRET } from './core/kinvey-keys';

// initialize Kinvey
Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });

// init sentry - DNS key for permobil-wear Sentry project
Sentry.init(
  'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
);

// setup injection-js for dependency injection of services
import { ReflectiveInjector } from 'injection-js';
import { SERVICES } from './services';
export const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);

// start the app
application.run({ moduleName: 'app-root' });
