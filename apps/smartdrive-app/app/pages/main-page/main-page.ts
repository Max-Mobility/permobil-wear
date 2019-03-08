import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';
import { Kinvey } from 'kinvey-nativescript-sdk';

// Event handler for Page "navigatingTo" event attached in main-page.xml
export function navigatingTo(args: EventData) {
  const page = args.object as Page;
  page.bindingContext = new MainViewModel(page);

  Kinvey.ping().then(() => {
    console.log('kinvey active');
  });
}