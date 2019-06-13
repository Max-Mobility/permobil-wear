const prompt = require('prompt');
const { exec } = require('child_process');

let keyPassword = Array.prototype.slice.call(process.argv, 2)[0];

function askKeystorePassword() {
  return new Promise((resolve, reject) => {
    // if password entered with npm run then just resolve it
    if (keyPassword) {
      resolve(keyPassword);
      return;
    }
    prompt.start();
    prompt.get(
      {
        name: 'keystore_password',
        description: 'What is the PushTracker WearOS keystore password?'
      },
      (err, result) => {
        if (err) {
          reject(err);
          return console.log(err);
        }
        if (!result.keystore_password) {
          return console.log(
            'The keystore password is required to produce a signed release AAB for Android.'
          );
        }
        keyPassword = result.keystore_password;
        resolve(keyPassword);
      }
    );
  });
}

askKeystorePassword().then(result => {
  console.log(
    'Executing the android release build process. This could take a minute as the entire project is built from scratch. Go get a cup ☕️  or  🍺.'
  );
  // execute the android release build cmd with the result as password
  exec(
    // `cd apps/smartdrive-app && tns build android --release --bundle --env.uglify --key-store-path ./tools/smartdrive-wearos.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./tools/smartdrive-app.aab`,
    `tns build android --release --bundle --env.uglify --key-store-path ./pushtracker-wearos.jks --key-store-password ${result} --key-store-alias upload --key-store-alias-password ${result} --aab --copy-to ./pushtracker-app.aab`,
    (err, stdout, stderr) => {
      if (err) {
        console.error('Error executing the android-release command.', err);
        return;
      }

      console.log(
        'Android release build finished. A new release .aab (Android App Bundle) should be located in the apps/pushtracker-app/tools/ directory.'
      );
    }
  );
});
