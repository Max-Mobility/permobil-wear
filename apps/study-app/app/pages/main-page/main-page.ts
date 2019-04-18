import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { Log } from '@permobil/core';

// Event handler for Page "navigatingTo" event attached in main-page.xml
export function navigatingTo(args: EventData) {
  const page = args.object as Page;
  page.bindingContext = new MainViewModel();

  Kinvey.ping().then(() => {
    Log.D('Kinvey is active.');
    Kinvey.User.login('bradwaynemartin@gmail.com', 'testtest')
      .then(() => {
        Log.D(
          `Logged in brad's user, be sure to remove this after data collection work!`
        );
      })
      .catch(error => {
        Log.E(error);
      });
  });
}
