# Releasing Hourmint (direct download, macOS)

Releases are built by GitHub Actions (`.github/workflows/release.yml`) as a universal app (Apple Silicon and Intel) and published to [GitHub Releases](https://github.com/abdurrahmanriyad/hourmint/releases). The app checks `releases/latest/download/latest.json` on launch and every 12 hours, and Settings has a "Check for updates" button.

## One-time setup

1. Add repository secrets (Settings > Secrets and variables > Actions):
   - `TAURI_SIGNING_PRIVATE_KEY`: the contents of `~/.tauri/hourmint.key` (the updater signing key; its public half is in `tauri.conf.json`). **Back this file up.** If it's lost, installed copies can't verify future updates.
     `gh secret set TAURI_SIGNING_PRIVATE_KEY --repo abdurrahmanriyad/hourmint --body "$(cat ~/.tauri/hourmint.key)"`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is only needed if you regenerate the key with a password. A missing secret counts as empty.
2. The repository must be public for the updater and download links to work without a token.
3. To publish the landing page, enable GitHub Pages with source "GitHub Actions" and custom domain `hourmint.abdur.tech` (DNS: CNAME `hourmint` pointing to `abdurrahmanriyad.github.io`).

## Cutting a release

```sh
npm version patch          # bumps package.json (the app version) and creates tag vX.Y.Z
git push --follow-tags     # CI builds, tests and drafts the release
```

Then open the draft on GitHub and publish it. Installed apps see the update once it's published.

## Signing

Until there is an Apple Developer ID, builds are ad-hoc signed (`signingIdentity: "-"`). macOS asks users to confirm the first launch: System Settings > Privacy & Security > Open Anyway. To sign and notarize later, add the `APPLE_*` secrets and uncomment them in the release workflow.
