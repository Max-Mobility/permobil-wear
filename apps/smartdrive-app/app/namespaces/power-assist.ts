import { Color } from 'tns-core-modules/color';

export namespace PowerAssist {
  export const InactiveRingColor = new Color('#000000');
  export const InactiveButtonColor = new Color('#2fa52f');
  export const InactiveButtonText = 'Activate Power Assist';

  export const ActiveRingColor = new Color('#006ea4');
  export const ActiveButtonColor = new Color('#a52f2f');
  export const ActiveButtonText = 'Deactivate Power Assist';

  export const TrainingRingColor = new Color('#2fa52f');
  export const TrainingButtonColor = new Color('#2fa52f');
  export const TrainingButtonText = 'Exit Training Mode';

  export const TappedRingColor = new Color('#a52f2f');
  export const ConnectedRingColor = new Color('#006ea4');
  export const DisconnectedRingColor = new Color('#a52f2f');

  export enum State {
    Inactive,
    Disconnected,
    Connected,
    Training
  }
}
