import { Log, Prop } from '@permobil/core';
import { Pager } from 'nativescript-pager';
import * as themes from 'nativescript-themes';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import * as application from 'tns-core-modules/application';
import { Observable } from 'tns-core-modules/data/observable';
import { View } from 'tns-core-modules/ui/page';

export class MainViewModel extends Observable {
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;

  /**
   * User interaction objects
   */
  private _pager: Pager;

  constructor() {
    super();

    // handle ambient mode callbacks
    application.on('enterAmbient', args => {
      Log.D('*** enterAmbient ***');
      themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');

      if (this.pager) {
        const children = this.pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i);
          child._onCssStateChange();
        }
      }
    });

    // handle ambient mode callbacks
    application.on('exitAmbient', args => {
      Log.D('*** exitAmbient ***');
      themes.applyThemeCss(defaultTheme, 'theme-default.scss');

      if (this.pager) {
        const children = this.pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i) as View;
          child._onCssStateChange();
        }
      }
    });
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap(args) {
    this.tempSettings.decrease(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this._changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button without starting the swipe behavior
    (this._changeSettingsLayout as any).swipeable = false;
    // this._changeSettingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
    //   // hide the offscreen layout when dismissed
    //   hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    //   this.isChangeSettingsLayoutEnabled = false;
    // });
  }
}
