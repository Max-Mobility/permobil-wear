import { Common } from './vibrate.common';
import * as app from 'tns-core-modules/application';

export class Vibrate extends Common {
  constructor() {
    super();

    this.service = app.android.context.getSystemService(
      android.content.Context.VIBRATOR_SERVICE
    );
  }

  hasVibrator(): boolean {
    return this.service.hasVibrator();
  }

  hasAmplitudeControl(): boolean {
    return this.service.hasAmplitudeControl();
  }

  vibrate(
    param: number | number[] = 300,
    repeat: number = -1,
    amplitude: number | number[] = android.os.VibrationEffect.DEFAULT_AMPLITUDE
  ) {
    if (this.hasVibrator()) {
      if (typeof param === 'number') {
        let effect = android.os.VibrationEffect.createOneShot(
          param,
          android.os.VibrationEffect.DEFAULT_AMPLITUDE
        );
        if (typeof amplitude === 'number') {
          effect = android.os.VibrationEffect.createOneShot(param, amplitude);
        }
        this.service.vibrate(effect);
      } else {
        // Define array pattern length
        const patternLength = param.length;
        // Create the pattern array
        let pattern = Array.create('long', patternLength);
        // Assign the pattern values
        param.forEach((value, index) => {
          pattern[index] = value;
        });

        /*
                // Define array pattern length
                const amplitudePatternLength = amplitude.length;
                // Create the pattern array
                let amplitudePattern = Array.create('long', amplitudePatternLength);
                // Assign the pattern values
                amplitude.forEach((value, index) => { amplitudePattern[index] = value; });
				*/

        //const effect = android.os.VibrationEffect.createWaveform(param, amplitudePattern);
        const effect = android.os.VibrationEffect.createWaveform(param, repeat);
        // Vibrate pattern
        this.service.vibrate(effect);
      }
    }
  }

  cancel() {
    this.service.cancel();
  }
}
