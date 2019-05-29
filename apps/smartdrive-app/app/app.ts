import { Log } from '@permobil/core';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import * as application from 'tns-core-modules/application';
import { currentSystemTime } from './utils';
import './utils/async-await';

console.time('App_Start_Time');

Log.D('Setting the default theme for the app styles');
// apply our default theme for the app
themes.applyTheme(themes.getAppliedTheme('./scss/theme-default.css'));

// handle ambient mode callbacks
application.on('enterAmbient', args => {
  themes.applyTheme('./scss/theme-ambient.css');
});

// handle ambient mode callbacks
application.on('exitAmbient', args => {
  themes.applyTheme('./scss/theme-default.css');
});

// handle ambient mode callbacks
application.on('updateAmbient', args => {
  Log.D('updateAmbient', args.data, currentSystemTime());
});

// setup application level events
application.on(
  application.uncaughtErrorEvent,
  (args: application.UnhandledErrorEventData) => {
    Sentry.captureException(args.error);
  }
);

application.on(
  application.discardedErrorEvent,
  (args: application.DiscardedErrorEventData) => {
    Sentry.captureException(args.error);
  }
);

application.on(application.launchEvent, args => {
  Log.D('App launch event...');
  themes.applyTheme('./scss/theme-default.css');
});

application.on(application.displayedEvent, args => {
  // Log.D('app displayed event');
  // this fires often, especially during swiping to close, just FYI to avoid cluttering logs
});

application.on(application.suspendEvent, args => {
  Log.D('App suspend event...');
  themes.applyTheme('./scss/theme-ambient.css');
});

application.on(application.exitEvent, args => {
  Log.D('App exit event');
});

application.on(application.lowMemoryEvent, args => {
  Log.D('app low memory event');
});

application.on(application.resumeEvent, args => {
  const processId = android.os.Process.myPid();
  Log.D(`App resume event -- process ID: ${processId}`);
  themes.applyTheme('./scss/theme-default.css');
});

console.timeEnd('App_Start_Time');

// start the app
application.run({ moduleName: 'app-root' });
