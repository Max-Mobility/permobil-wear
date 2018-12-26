import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { HelloWorldModel } from './home-view-model';

// Event handler for Page "navigatingTo" event attached in main-page.xml
export function navigatingTo(args: EventData) {
  const page = args.object as Page;
  page.bindingContext = new HelloWorldModel(page);

  // Kinvey.init({
  //   appKey: 'kid_SyIIDJjdM',
  //   appSecret: '3cfe36e6ac8f4d80b04014cc980a4d47'
  // });
}
