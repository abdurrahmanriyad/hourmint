# Security policy

## Supported versions

Only the latest release gets security fixes. Hourmint updates itself from inside the app, so please update before reporting.

## Reporting a vulnerability

Please don't open a public issue for security problems.

Report it privately through GitHub instead: go to the [Security tab](https://github.com/abdurrahmanriyad/hourmint/security) and click **Report a vulnerability**. Include what you found, how to reproduce it and which version you tested.

You'll get a reply within a week. Once a fix is released, you'll be credited in the release notes unless you'd rather not be.

## Scope

Hourmint keeps all data on your Mac and makes one network request: the update check against GitHub Releases. Things we especially want to hear about:

- anything that could make the updater install code that isn't signed by the Hourmint release key
- ways for another app or website to read or change Hourmint's data
- data leaving the Mac in any way
