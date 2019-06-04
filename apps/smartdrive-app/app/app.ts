import { Log } from '@permobil/core';
import 'nativescript-dom';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import * as application from 'tns-core-modules/application';
import { currentSystemTime } from './utils';
import './utils/async-await';

console.time('App_Start_Time');

// handle ambient mode callbacks
application.on('enterAmbient', args => {
  Log.D('enterAmbient', args.data, currentSystemTime());
  themes.applyTheme('ambient.css');
});

// // handle ambient mode callbacks
// application.on('exitAmbient', args => {
//   Log.D('exitAmbient', args.data, currentSystemTime());

//   try {
//     const repeaters = getElementsByTagName('Repeater');
//     console.log('repeaters', repeaters);
//   } catch (error) {
//     console.log('fuck brad', error);
//   }

//   // setTimeout(() => {
//   console.log('applying the damn default theme');
//   themes.applyTheme('default.css');
//   console.log('default theme should be applied now...');
//   // }, 0);
// });

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
