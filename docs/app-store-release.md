# App Store & Google Play Release Runbook

This is an Expo / React Native app (SDK 54, **managed/CNG workflow**) shipped as
standalone store binaries via **EAS Build + EAS Submit**. The goal is for users to
install from the Apple App Store and Google Play — not Expo Go.

> **Workflow note:** There is intentionally **no `ios/` or `android/` folder in the
> repo.** EAS runs `expo prebuild` in the cloud and generates native projects from
> `app.json` on every build. `app.json` is the single source of truth — put native
> config (permissions, plugins, icons) there, never in hand-edited native files.

## App Identity

| Field | Value |
|---|---|
| App name | Volunteer Hours |
| EAS project | `@bostonjos-organization/swcpc-volunteer-hours` |
| EAS project ID | `080139ed-e339-4675-a999-79f5fafada86` |
| iOS bundle ID | `org.swcpc.volunteerhours` |
| Android package | `org.swcpc.volunteerhours` |
| Version | `1.0.0` (build numbers/versionCodes auto-managed remotely by EAS) |
| OTA updates | EAS Update, `runtimeVersion` policy `appVersion`, channel `production` |

## Build & submit commands (run from `VolunteerHoursApp`)

```sh
npm run typecheck            # tsc --noEmit
npm run doctor               # expo-doctor
npm run build:ios:store      # eas build --platform ios --profile production
npm run build:android:store  # eas build --platform android --profile production
npm run submit:ios           # eas submit --platform ios --latest
npm run submit:android       # eas submit --platform android --latest (NOT for the FIRST Android release — see below)
```

---

## Prerequisites — do these FIRST (some have a 24–48h clock)

### Apple (the long pole — start immediately)
1. **Accept the Apple Developer Program License Agreement** at developer.apple.com.
2. **Accept the "Free Apps" agreement** in App Store Connect → *Agreements, Tax, and
   Banking*. Required even for a free app. **Must show "Active"** before any iOS
   submission — new accounts can take 24–48h to propagate. Tax/banking is only needed
   if charging money (we are not).
3. **Generate an App Store Connect API key** (App Store Connect → Users and Access →
   Integrations → App Store Connect API):
   - Role: **App Manager** (Developer role cannot submit).
   - Download the `.p8` **immediately** (shown once). Note the **Key ID** and **Issuer ID**.
   - Store the `.p8` **outside the repo** (e.g. `~/.secrets/swcpc/`). It is gitignored, but don't risk it.
4. **Create the App Store Connect app record** (App Store Connect → Apps → "+" → New App):
   name, primary language, bundle ID `org.swcpc.volunteerhours`, SKU. EAS does **not**
   create this for you.

### Google (Play Console)
1. Confirm Play Console account is active and the **Developer Distribution Agreement**
   is accepted.
2. **First Android release must be uploaded MANUALLY** (Google API blocks the very
   first upload for a brand-new app — see the Android section). For *subsequent*
   releases you need a service account:
   - A Google Cloud project (the Play-linked one is fine) with the **Google Play
     Android Developer API** enabled.
   - A **service account** + JSON key. In Play Console → *Setup → API access*, link the
     project and grant the service account **Release manager** (or ≥ Release apps).
   - Store the JSON key **outside the repo**. (Gitignored via `*service-account*.json`.)

### Both stores
- **Privacy policy URL** — must be live & public before submission. The app has
  sign-in and accesses camera/photos, so this is mandatory, not optional.
- **Screenshots** per device class, **app description / keywords**, **support URL**,
  **content/age rating** questionnaire, and **data safety** (Google) / **privacy
  nutrition labels** (Apple).

---

## iOS release steps

1. `npm run typecheck && npm run doctor`
2. `npm run build:ios:store` — EAS authenticates you with Apple (Apple ID + 2FA),
   registers the bundle ID if needed, and **fully manages signing** (distribution
   cert + provisioning profile). Builds in the cloud (~15–25 min).
3. Confirm the bundle ID appears under Apple Developer → Identifiers.
4. `npm run submit:ios` — enter Key ID / Issuer ID / path to `.p8` when prompted
   (EAS stores them after first use). Uploads to App Store Connect.
5. In App Store Connect: attach the build, complete listing metadata, screenshots,
   privacy labels, export-compliance answer, then submit for review.

## Android release steps

> **The first release is special.** `eas submit` cannot perform the first upload for
> an app with zero releases — Google's API rejects it. Do the first one by hand:

1. `npm run build:android:store` — EAS generates the keystore and builds the AAB.
2. Download the `.aab` from the EAS dashboard.
3. In Play Console: **create the app record**, go to **Internal testing**, and
   **upload the AAB manually**. Complete content rating, data safety, store listing,
   and privacy policy. Roll it out to internal testing.
4. Set up the service account (see prerequisites) and link it in Play Console.
5. **From the second release onward**, use `npm run submit:android`.

---

## Release blockers / known issues

- **Backend auth (pre-public hardening):** reimbursement approval/completion currently
  trusts an email-only sign-in and a client-supplied `x-mobile-email` header. Before a
  broad public release, the backend should enforce authenticated roles server-side
  rather than trusting the mobile client. Not a store blocker; track separately.
- **Local duplicate React (local-only):** `expo-doctor` reports `react@19.2.0` from
  `/Users/jcb/Projects/node_modules` (a stray `node_modules` above this app). It does
  **not** affect EAS cloud builds (clean git checkout). Optionally delete that stray
  folder if it belongs to nothing.
- **`npm audit`** reports Expo-transitive advisories. Do **not** run `npm audit fix
  --force` — it wants a breaking Expo SDK upgrade.

## Decommission Expo Go (do LAST, after store apps are live)

- Replace the Expo Go redirect in `docs/index.html` with App Store / Play Store links
  (or an interim "coming soon"). Store listing URLs aren't public until published.
- During the transition window, volunteers keep using the existing Expo Go build.
  Avoid publishing OTA updates to the old Expo Go runtime — it no longer matches the
  `appVersion` runtime policy used by store builds.

## Post-build smoke test (on real devices)

Sign-in, hour logging, reimbursement submission, receipt attachment (camera + photo
library + document picker), and reimbursement-review permissions.
