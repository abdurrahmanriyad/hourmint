# Publishing Hourmint to the Mac App Store

The App Store build is the same app compiled without the `direct` Cargo feature:

- It is sandboxed (`src-tauri/appstore/entitlements.plist`).
- It has no self-updater, because the App Store updates it.
- It has no single-instance plugin, because macOS already enforces one instance.
- It never connects to the internet.
- Its data lives in `~/Library/Containers/app.hourmint.desktop/`, separate from the direct-download build. To move data across, use Settings → Data → Back up to file in one build and Restore in the other.

Steps 1–5 are done once. Step 6 onward is repeated for every release.

## 1. Join the Apple Developer Program

Enroll at <https://developer.apple.com/programs/enroll/> ($99 per year). An individual account is fine; the App Store then shows your legal name as the seller. Approval usually takes 1–2 days.

Find your **Team ID** (10 characters) at developer.apple.com → Account → Membership details.

## 2. Create the two certificates

The easiest way is Xcode (free on the App Store):

1. Go to Xcode → Settings → Accounts, add your Apple ID, select the team and click **Manage Certificates…**.
2. Click **+** → **Apple Distribution**.
3. Click **+** → **Mac Installer Distribution**.

Check that both are in your keychain:

```sh
security find-identity -v -p codesigning   # shows "Apple Distribution: Your Name (TEAMID)"
security find-identity -v                  # also shows "3rd Party Mac Developer Installer: Your Name (TEAMID)"
```

## 3. Register the bundle ID

Go to developer.apple.com → Certificates, IDs & Profiles → Identifiers → **+** → App IDs → App:

- Description: `Hourmint`
- Bundle ID: **Explicit**, `app.hourmint.desktop`
- Capabilities: leave everything unticked

The bundle ID can never change once the app is published.

## 4. Create the provisioning profile

Go to Profiles → **+** → Distribution → **Mac App Store Connect**:

1. App ID: `app.hourmint.desktop`.
2. Certificate: your Apple Distribution certificate.
3. Name it `Hourmint App Store` and download it.
4. Save it as `src-tauri/appstore/embedded.provisionprofile`. It's git-ignored, so keep a copy somewhere safe.

The profile expires after a year. When it does, download a new one the same way.

## 5. Create the app in App Store Connect

Go to <https://appstoreconnect.apple.com> → Apps → **+** → New App:

- Platform: macOS
- Name: `Hourmint` (must be unique on the App Store)
- Primary language: English
- Bundle ID: `app.hourmint.desktop`
- SKU: `hourmint-mac`

Then fill in everything from [`appstore/metadata.md`](../appstore/metadata.md):

- description, keywords and URLs
- screenshots from `appstore/screenshots/`
- App Privacy: Data Not Collected
- price: Free
- age rating
- review notes

Apple requires a **privacy policy URL** and a **support URL**. These are `https://hourmint.abdur.tech/privacy.html` (the `site/` folder, published by GitHub Pages) and `https://github.com/abdurrahmanriyad/hourmint/issues`. Check that both open before submitting.

## 6. Build the package

```sh
APPLE_TEAM_ID=ABCDE12345 npm run build:appstore
```

The script builds a universal (Apple Silicon + Intel) sandboxed app and signs it with your Apple Distribution certificate and the provisioning profile. It then wraps it in a signed installer package at `src-tauri/target/appstore/Hourmint-<version>-<build>.pkg`.

- The build number is the current date and time, so every upload is accepted. To set it yourself, use `BUILD_NUMBER=…`.
- If you have more than one certificate of the same type, pass the full name with `APP_SIGNING_IDENTITY="Apple Distribution: Your Name (TEAMID)"` and `INSTALLER_SIGNING_IDENTITY="3rd Party Mac Developer Installer: Your Name (TEAMID)"`.
- `npm run build:appstore -- --test` builds the same sandboxed app with an ad-hoc signature and no package. Use it to try the sandbox locally without an Apple account.

## 7. Upload

1. Install **Transporter** from the Mac App Store and sign in with your Apple ID.
2. Drag the `.pkg` in and click **Deliver**. Transporter validates the package first and reports any problems.
3. After about 10–30 minutes of processing, the build appears in App Store Connect under the app's TestFlight tab.

## 8. Test with TestFlight (recommended)

In App Store Connect → TestFlight, add yourself as an internal tester. Then install the **TestFlight** app on your Mac and install Hourmint from it.

This is the real signed, sandboxed build, so click through the whole app before submitting:

- **Onboarding:** complete the first-run welcome steps.
- **Menu bar:** timer and popover.
- **Idle prompt:** step away for longer than the idle threshold.
- **Notifications:** check that reminders and warnings appear.
- **Launch at login:** turn it on in Settings, then log out and back in.
- **Exports:** save a PDF, CSV and JSON export.
- **Logo:** pick a logo image in Settings.
- **Backup:** back up to a file, then restore it.

## 9. Submit for review

Go to App Store Connect → the app → the version (for example `1.0`):

1. Select the uploaded build.
2. Check the review notes.
3. Click **Add for Review** → **Submit**.

Review usually takes 1–3 days. If Apple rejects it, the message says which guideline and why. Fix it, upload a new build (the build number increases automatically) and resubmit.

## Later releases

```sh
npm version minor --no-git-tag-version   # or patch; this sets the app version
APPLE_TEAM_ID=ABCDE12345 npm run build:appstore
```

Upload with Transporter, create the new version in App Store Connect, fill in "What's New", select the build and submit.

## Version number

`package.json` is the single source of the version shown to users. Consider releasing the App Store version as `1.0.0` rather than `0.1.0`.
