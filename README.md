# Permobil Wear

This repo will serve as a monorepo for all Permobil WearOS projects.
New apps will be created in the `apps` directory. Anything not specific to one app
should be abstracted into `libs/core` so the other WearOS apps can reuse the same code
under the `@permobil/core` package.

# Getting Started

**Prerequisite:** Have node and NativeScript setup on the development machine.
Setup [docs HERE](https://docs.nativescript.org/start/quick-setup).

After you have installed node, you will need to install [rimraf](https://www.npmjs.com/package/rimraf):

```bash
sudo npm i -g rimraf
```

Once the development machine is configured for android/nativescript development.
You can clone and setup the repo and run the SmartDrive WearOS app with the following commands (copy and paste into terminal and 🏎):

```bash
git clone https://github.com/Max-Mobility/permobil-wear.git &&
cd permobil-wear &&
npm run setup &&
npm run smartdrive.start.android
```

**Make sure you have a WearOS device connected or a WearOS AVD (emulator) running.**

## Layouts for WearOS Notes

#### Lists

When presenting a listview of items use the [WearOsListView plugin](https://github.com/bradmartin/nativescript-wear-os).

#### Scrolling Sections

Use the NS `ScrollView` on circle watch faces you'll have the circular scrollbars.
