# App Store listing

Copy these into App Store Connect. The limits Apple enforces are noted in brackets.

## App information

- **Name** [30]: `Hourmint`. If the name is taken, use `Hourmint: Time & Invoices`.
- **Subtitle** [30]: `Time tracking and invoices`
- **Bundle ID**: `app.hourmint.desktop`
- **SKU**: `hourmint-mac`
- **Primary category**: Productivity
- **Secondary category**: Business
- **Content rights**: does not contain, show or access third-party content
- **Age rating**: answer "None" to every question (gives 4+)
- **Price**: Free (tier 0), all territories

## Version information

**Promotional text** [170]:

> Track hours from your menu bar and turn them into professional PDF invoices with a detailed timesheet. No account, no cloud: your data stays on your Mac.

**Description** [4000]:

> Hourmint is a time tracker for freelancers and contractors who bill clients by the hour.
>
> Start a timer from the menu bar when work begins and stop it when you're done. Hourmint keeps an honest log of what you worked on, and at the end of the month it turns the hours you choose into a clean PDF invoice, with a detailed timesheet attached so your client can see exactly what they're paying for.
>
> TRACK
> • Menu bar timer with the elapsed time next to your clock
> • Start, stop and switch projects from a small popover
> • Quick start for the tasks you did recently
> • Idle detection asks whether to keep or discard time when you step away
> • Reminders if you forget to start, and a warning when a timer runs for hours
> • The timer survives quitting, restarting and sleep
>
> LOG
> • Day, week and custom-range views with totals per client and project
> • Add time manually, edit entries, split an entry in two
> • Manual and edited entries are clearly labelled
> • Filter by client, project, billable and billed
> • Export to CSV
>
> INVOICE
> • Pick the hours to bill, in your client's currency
> • One line per entry, per day or per project
> • Rounding, tax and discounts calculated exactly
> • Your own invoice numbering, for example INV-2026-0001
> • PDF export with your logo and an optional detailed timesheet
> • Draft, sent, paid and overdue at a glance
> • Hours on an invoice are locked, so you never bill them twice
>
> PRIVATE BY DESIGN
> • No account and no sign-up
> • Everything is stored on your Mac. Hourmint never sends your data anywhere.
> • Automatic daily backups, plus export of all your data to CSV or JSON
>
> Light and dark mode. Works fully offline.

**Keywords** [100, comma-separated, no spaces needed] (96 characters):

```
time tracker,timesheet,invoice,freelance,hours,billing,timer,menu bar,work log,contractor,client
```

**Support URL** (required): `https://github.com/abdurrahmanriyad/hourmint/issues`

**Marketing URL** (optional): `https://hourmint.abdur.tech`

**Privacy Policy URL** (required): `https://hourmint.abdur.tech/privacy.html`

**What's New**: `First release.`

**Copyright**: `2026 <your name or company>`

## Screenshots

Use `appstore/screenshots/` (2880 × 1800, Apple's 16:10 Mac size). Upload them in this order:

1. `1-today.png`: menu bar timer and today's work
2. `2-worklog.png`: the work log
3. `3-invoice-preview.png`: an invoice
4. `4-invoices.png`: invoices and what you're owed
5. `5-clients.png`: clients and rates
6. `6-dark.png`: dark mode

The data in them is fictional (demo mode, `npm run demo`).

## App Privacy

In App Store Connect → App Privacy → Get Started, choose **"No, we do not collect data from this app"**. This shows as **Data Not Collected**.

## Export compliance

This is answered automatically: `ITSAppUsesNonExemptEncryption = NO` is set in `src-tauri/Info.plist`.

## App Review information

- **Sign-in required**: No
- **Contact**: your name, phone and email
- **Notes**:

> Hourmint is a time tracker that lives in the menu bar (clock icon) and also has a main window. No account or network connection is needed.
>
> To try it: complete the short welcome steps (add any client name), then press Start on the Today screen. The elapsed time appears next to the clock icon in the menu bar. Click the icon for the quick-access popover. Stop the timer, then go to Invoices → New invoice, select the client, and click Export PDF.
>
> Entitlements: com.apple.security.network.client is present only because WKWebView, which renders the app's bundled interface, needs it inside the sandbox. Without it the windows stay blank. The app itself makes no network requests. com.apple.security.files.user-selected.read-write is used to save PDF and CSV exports, choose a logo image and restore a backup file the user picks.
>
> Launch at login is off by default and only turned on by the user in Settings (it uses SMAppService).
