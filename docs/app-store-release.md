# App Store and Google Play Release

This project is an Expo/React Native app that should ship as standalone store binaries through EAS Build. Users should install the final app from the Apple App Store or Google Play, not from Expo Go.

## Current App Identity

- App name: Volunteer Hours
- EAS project: `@bostonjos-organization/swcpc-volunteer-hours`
- EAS project ID: `080139ed-e339-4675-a999-79f5fafada86`
- iOS bundle ID: `org.swcpc.volunteerhours`
- Android package: `org.swcpc.volunteerhours`
- Version: `1.0.0`
- Store build numbers/version codes: managed remotely by EAS

## Build Commands

Run these from `VolunteerHoursApp`.

```sh
npm run typecheck
npm run doctor
npm run build:ios:store
npm run build:android:store
```

Submit the most recent successful builds:

```sh
npm run submit:ios
npm run submit:android
```

## Required Store Work

1. Confirm Apple Developer and Google Play Console access for `communications@corridorpark.org`.
2. Create or confirm the App Store Connect app with bundle ID `org.swcpc.volunteerhours`.
3. Create or confirm the Google Play app with package `org.swcpc.volunteerhours`.
4. Let EAS manage signing credentials during the first production build, unless existing credentials must be reused.
5. Upload screenshots, app descriptions, support/contact URLs, privacy details, and review notes.
6. Replace the Expo Go landing page in `docs/index.html` with store links after both listings exist.

## Release Blockers To Resolve

- Reimbursement approval/completion currently relies on email-only sign-in and a client-supplied `x-mobile-email` header. Before broad public release, the backend should enforce authenticated roles instead of trusting the mobile client.
- `expo-doctor` reports duplicate React because `/Users/jcb/Projects/node_modules` is visible above this app. That is a local machine layout issue; EAS cloud builds should only use this app checkout.
- `expo-doctor` reports non-CNG config drift because `ios/` is checked in. Keep iOS store-critical settings synced directly in `ios/VolunteerHours/Info.plist`, or remove native folders and switch fully to managed prebuild.
- First EAS pre-build inspection now reaches credential validation. Finish Apple/Google signing setup before expecting production builds to complete.
- `npm audit` reports Expo-transitive vulnerabilities. Avoid `npm audit fix --force` unless intentionally upgrading Expo SDK, because it currently wants to install a breaking Expo version.

## Recommended Next Step

Run a first internal production build before submitting to stores:

```sh
npm run build:ios:store
npm run build:android:store
```

After the builds succeed, install them on real devices and smoke-test sign-in, hour logging, reimbursement submission, receipt attachment, and reimbursement review permissions.
