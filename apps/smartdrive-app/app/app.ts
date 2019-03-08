import './utils/async-await';
import * as application from 'tns-core-modules/application';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { Sentry } from 'nativescript-sentry';
import { APP_KEY, APP_SECRET, SERVICES, SentryService } from '@permobil/core';
import { ReflectiveInjector } from 'injection-js';

// initialize Kinvey
Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });

// init sentry - DNS key for permobil-wear Sentry project
Sentry.init(
  'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
);

// setup injection-js for dependency injection of services
export const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
const sentryService: SentryService = injector.get(SentryService);

// setup application level events
application.on(
  application.uncaughtErrorEvent,
  (args: application.UnhandledErrorEventData) => {
    sentryService.logError(args.error);
  }
);

application.on(
  application.discardedErrorEvent,
  (args: application.DiscardedErrorEventData) => {
    sentryService.logError(args.error);
  }
);

// start the app
application.run({ moduleName: 'app-root' });
