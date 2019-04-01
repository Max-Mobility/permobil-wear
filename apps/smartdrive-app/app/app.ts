import { APP_KEY, APP_SECRET, SentryService, SERVICES } from '@permobil/core';
import { ReflectiveInjector } from 'injection-js';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { Sentry } from 'nativescript-sentry';
import * as application from 'tns-core-modules/application';
import './utils/async-await';
import * as themes from 'nativescript-themes';

// apply our default theme for the app
themes.applyTheme(themes.getAppliedTheme('theme-default.css'));

const sDateFormat = new java.text.SimpleDateFormat(
  'K:mm a',
  java.util.Locale.US
);
export let currentSystemTime = sDateFormat.format(new java.util.Date());

// initialize Kinvey
Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });

// init sentry - DNS key for permobil-wear Sentry project
Sentry.init(
  'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
);

// setup injection-js for dependency injection of services
export const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
const sentryService: SentryService = injector.get(SentryService);

// handle ambient mode callbacks
application.on('enterAmbient', args => {
  console.log('enterAmbient executed...', args.data);
  currentSystemTime = sDateFormat.format(new java.util.Date());
  console.log('current system time', currentSystemTime);
  themes.applyTheme('theme-ambient.css');
});

// handle ambient mode callbacks
application.on('exitAmbient', args => {
  console.log('exitAmbient executed...', args.data);
  themes.applyTheme('theme-default.css');
});

// handle ambient mode callbacks
application.on('updateAmbient', args => {
  console.log('updateAmbient executed...', args.data);
  currentSystemTime = sDateFormat.format(new java.util.Date());
  console.log('current system time', currentSystemTime);
});

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

application.on(application.launchEvent, args => {
  console.log('app launch event');
});

application.on(application.displayedEvent, args => {
  // console.log('app displayed event');
  // this fires often, especially during swiping to close, just FYI to avoid cluttering logs
});

application.on(application.suspendEvent, args => {
  console.log('app suspend event');
});

application.on(application.exitEvent, args => {
  console.log('app exit event');
});
application.on(application.lowMemoryEvent, args => {
  console.log('app low memory event');
});

application.on(application.resumeEvent, args => {
  const processId = android.os.Process.myPid();
  console.log(`-- app resume event -- process ID: ${processId}`);
});

// start the app
application.run({ moduleName: 'app-root' });
