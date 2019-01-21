import './core/async-await';
import * as application from 'tns-core-modules/application';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { Sentry } from 'nativescript-sentry';
import { APP_KEY, APP_SECRET } from './core/kinvey-keys';

Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });

// init sentry - DNS key is in the SmartEvalKinvey package
Sentry.init(
  'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
);

application.run({ moduleName: 'app-root' });
