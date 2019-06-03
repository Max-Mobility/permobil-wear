import { Log } from '@permobil/core';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import * as application from 'tns-core-modules/application';
import { currentSystemTime } from './utils';
import './utils/async-await';

console.time('App_Start_Time');

// handle ambient mode callbacks
application.on('enterAmbient', args => {
  themes.applyTheme('ambient.css');
});

// handle ambient mode callbacks
application.on('exitAmbient', args => {
  themes.applyTheme('app.css');
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
});

application.on(application.suspendEvent, args => {
  Log.D('App suspend event...');
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
  // themes.applyTheme('default.css');
});

console.timeEnd('App_Start_Time');

// start the app
application.run({ moduleName: 'app-root' });
