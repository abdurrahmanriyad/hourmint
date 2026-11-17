#!/usr/bin/env bash
# Builds the Mac App Store package: a sandboxed universal Hourmint.app (no updater),
# signed for distribution and wrapped in a signed .pkg ready for Transporter.
#
#   APPLE_TEAM_ID=ABCDE12345 npm run build:appstore
#   npm run build:appstore -- --test     # local check: ad-hoc signed, no .pkg, no Apple account needed
#
# Needs (see docs/APP_STORE.md): the "Apple Distribution" and "Mac Installer Distribution"
# certificates in your keychain, and the App Store provisioning profile saved as
# src-tauri/appstore/embedded.provisionprofile.
set -euo pipefail
cd "$(dirname "$0")/.."

TEST=0
[[ "${1:-}" == "--test" ]] && TEST=1

ID=$(node -p "require('./src-tauri/tauri.conf.json').identifier")
VERSION=$(node -p "require('./package.json').version")
# CFBundleVersion must grow with every upload, even for the same version.
BUILD_NUMBER="${BUILD_NUMBER:-$(date -u +%Y%m%d.%H%M)}"
WORK="$PWD/src-tauri/target/appstore"
PROFILE="$PWD/src-tauri/appstore/embedded.provisionprofile"
mkdir -p "$WORK"

cp src-tauri/appstore/entitlements.plist "$WORK/entitlements.plist"
if [[ $TEST == 1 ]]; then
  export APPLE_SIGNING_IDENTITY="-"
  FILES=""
else
  : "${APPLE_TEAM_ID:?Set APPLE_TEAM_ID (developer.apple.com → Account → Membership details)}"
  [[ -f "$PROFILE" ]] || { echo "Missing $PROFILE (download the Mac App Store profile, see docs/APP_STORE.md)"; exit 1; }
  export APPLE_SIGNING_IDENTITY="${APP_SIGNING_IDENTITY:-Apple Distribution}"
  INSTALLER_IDENTITY="${INSTALLER_SIGNING_IDENTITY:-3rd Party Mac Developer Installer}"
  /usr/libexec/PlistBuddy -c "Add :com.apple.application-identifier string $APPLE_TEAM_ID.$ID" "$WORK/entitlements.plist"
  /usr/libexec/PlistBuddy -c "Add :com.apple.developer.team-identifier string $APPLE_TEAM_ID" "$WORK/entitlements.plist"
  FILES=", \"files\": { \"embedded.provisionprofile\": \"$PROFILE\" }"
fi
cat > "$WORK/tauri.conf.json" <<JSON
{ "bundle": { "macOS": { "entitlements": "$WORK/entitlements.plist", "bundleVersion": "$BUILD_NUMBER"$FILES } } }
JSON

# The App Store notarizes builds itself; make sure Tauri doesn't try to.
unset APPLE_ID APPLE_PASSWORD APPLE_API_KEY APPLE_API_ISSUER APPLE_API_KEY_PATH

rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null
npx tauri build --bundles app --target universal-apple-darwin \
  --config src-tauri/tauri.appstore.conf.json --config "$WORK/tauri.conf.json" \
  -- --no-default-features

APP="$PWD/src-tauri/target/universal-apple-darwin/release/bundle/macos/Hourmint.app"
echo
echo "Built $APP ($VERSION, build $BUILD_NUMBER)"
lipo -archs "$APP/Contents/MacOS/hourmint"
codesign --verify --strict "$APP"
codesign -d --entitlements - "$APP" 2>/dev/null | grep -o 'com\.apple\.[a-z.-]*' | sed 's/^/  entitlement: /'

if [[ $TEST == 1 ]]; then
  echo "Test build only (ad-hoc signed). Open it to try the sandboxed app."
  exit 0
fi

PKG="$WORK/Hourmint-$VERSION-$BUILD_NUMBER.pkg"
xcrun productbuild --sign "$INSTALLER_IDENTITY" --component "$APP" /Applications "$PKG"
echo
echo "Ready to upload: $PKG"
echo "Open Transporter, sign in with your Apple ID, drag the .pkg in and click Deliver."
