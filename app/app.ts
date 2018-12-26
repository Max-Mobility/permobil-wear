import { Kinvey } from 'kinvey-nativescript-sdk';
import * as application from 'tns-core-modules/application';
import './async-await';

Kinvey.init({
  appKey: 'kid_SyIIDJjdM',
  appSecret: '3cfe36e6ac8f4d80b04014cc980a4d47'
});

application.run({ moduleName: 'app-root' });
