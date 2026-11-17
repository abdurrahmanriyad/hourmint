# Hourmint — Requirements (v1)

Working name: **Hourmint** ("turn your hours into money"). Easy to rename later; it appears in the bundle ID, window titles, and landing page.

## 1. Overview

Hourmint is a desktop time tracker for freelancers who bill clients by the hour outside of platforms like Upwork. The user starts a timer when work begins and stops it when done. The app keeps a clear work log and turns selected hours into a downloadable PDF invoice with a detailed timesheet, so the client can see exactly what was worked on.

- **Primary user:** a solo freelancer or contractor with several clients.
- **Platform:** macOS first. Windows second. Linux only on demand.
- **Model:** local-first. All data lives on the user's machine. No account, no server.

## 2. Goals and non-goals

### Goals
- Start or stop tracking in one click or one keystroke, without opening the main window.
- Make it easy to see what was worked on, for whom, and for how long.
- Produce a clean invoice and timesheet from selected entries in under a minute.
- Never bill the same hours twice.
- Be honest by design: manual or edited entries are marked as such.

### Non-goals for v1
- No screenshots, screen recording, or activity monitoring.
- No payment processing. Invoices are documents only; paid status is set by hand.
- No accounts, cloud sync, or mobile app.
- No client-facing share link (needs a server).
- No team or multi-user features.
- No expenses or fixed-price items on invoices.

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Shell | Tauri 2 | Small binary, cross-platform, official plugins for tray, shortcuts, autostart, updater |
| UI | React + TypeScript + Vite | Tailwind CSS for styling |
| Native side | Rust | Tray, idle detection, DB access, PDF file writing |
| Database | SQLite (WAL mode) | Single file in the app data directory |
| PDF | Generated on device | Render an HTML invoice template to PDF |
| Updates | Tauri updater | Signed releases hosted on GitHub Releases or own site |
| Distribution | Signed and notarized DMG | Direct download; no Mac App Store in v1 |

## 4. Functional requirements

Priority: **M** = must have in v1, **S** = should have in v1 if time allows.

### 4.1 Clients and projects
- **CL-1 (M)** Create, edit, and archive a client: name, contact person, email, billing address, currency, default hourly rate, notes.
- **CL-2 (M)** Create, edit, and archive a project under a client: name, optional hourly rate override, optional colour.
- **CL-3 (M)** Archived clients and projects are hidden from pickers but their entries and invoices remain.
- **CL-4 (M)** A client or project with entries cannot be hard-deleted, only archived.

### 4.2 Timer
- **TM-1 (M)** Start a timer by choosing client and project, with an optional description.
- **TM-2 (M)** Stop the timer; this saves a time entry.
- **TM-3 (M)** Only one timer runs at a time. Starting a new one stops and saves the current one.
- **TM-4 (M)** The running timer is stored as a start timestamp in the database, so it survives app quit, crash, sleep, and restart.
- **TM-5 (M)** The description, client, and project can be changed while the timer runs.
- **TM-6 (M)** "Continue" on any past entry starts a new timer with the same client, project, and description.
- **TM-7 (M)** Idle detection: after N minutes without keyboard or mouse input (default 10, configurable, can be turned off), on return the app asks: keep the idle time, discard it, or discard it and stop the timer.
- **TM-8 (S)** Warn when a timer has been running longer than a configurable limit (default 8 hours).
- **TM-9 (S)** Optional reminder notification if no timer has started by a set time on chosen weekdays.

### 4.3 Menu bar
- **MB-1 (M)** A menu bar icon is always present while the app runs. When a timer is running it shows elapsed time.
- **MB-2 (M)** Clicking it opens a popover with: current timer and stop button, quick start (recent client/project/description combinations), today's total, and a button to open the main window.
- **MB-3 (M)** A global keyboard shortcut starts or stops the timer (configurable). Starting via shortcut reuses the last client and project.
- **MB-4 (M)** Closing the main window keeps the app alive in the menu bar.
- **MB-5 (S)** Launch at login (off by default, toggle in settings).

### 4.4 Time entries
- **TE-1 (M)** Add an entry manually: client, project, date, start and end time (or duration), description.
- **TE-2 (M)** Edit or delete an unbilled entry.
- **TE-3 (M)** Each entry records its source: `timer`, `manual`, or `timer_edited` (a timer entry whose times were changed). The source is shown in the log and can be shown on the timesheet.
- **TE-4 (M)** An entry can be marked non-billable. Non-billable entries appear in the log but never on invoices.
- **TE-5 (M)** Entries that are on an invoice are locked. They unlock only if the invoice is deleted or the entry is removed from a draft invoice.
- **TE-6 (M)** Validation: end must be after start; an entry cannot overlap the running timer; warn (do not block) on overlap with other entries.
- **TE-7 (S)** Split an entry into two at a chosen time.

### 4.5 Work log and reports
- **WL-1 (M)** Day view and week view listing entries with per-day and per-week totals.
- **WL-2 (M)** Filter by client, project, date range, billable or non-billable, and billed or unbilled.
- **WL-3 (M)** Summary for any period: hours and amount per client and per project.
- **WL-4 (M)** Unbilled total per client is visible at a glance.
- **WL-5 (M)** Export the filtered entries to CSV.

### 4.6 Invoices
- **IN-1 (M)** Create an invoice by choosing a client and date range. The app lists that client's unbilled, billable entries with checkboxes, all selected by default.
- **IN-2 (M)** Choose how line items are grouped: one line per entry, per day, or per project.
- **IN-3 (M)** Amount per line is hours × rate. The rate is copied onto the invoice at creation, so later rate changes do not alter old invoices.
- **IN-4 (M)** Rounding option per invoice: none (exact minutes), or round each line up to the nearest 5, 6, 15, or 30 minutes. Default comes from settings.
- **IN-5 (M)** Optional discount (percentage or fixed amount) and tax (label and percentage).
- **IN-6 (M)** Invoice number is generated from a configurable pattern (default `INV-{YYYY}-{0001}`) and can be overridden. Numbers must be unique.
- **IN-7 (M)** Fields: issue date, due date (default from payment terms in settings), sender details, client details, notes or payment instructions.
- **IN-8 (M)** Statuses: draft, sent, paid. Set by hand. A draft can be edited; sent and paid invoices are read-only unless moved back to draft.
- **IN-9 (M)** Export as PDF. Option to attach a detailed timesheet: date, start, end, duration, project, description, and entry source.
- **IN-10 (M)** Finalising an invoice marks its entries as billed and locks them. Deleting an invoice releases them.
- **IN-11 (M)** Invoice list with filters by client and status, and totals for outstanding and paid.
- **IN-12 (S)** Export a standalone timesheet PDF for a client and period without creating an invoice.
- **IN-13 (S)** Duplicate an invoice's settings (grouping, rounding, tax, notes) for the next one.

### 4.7 Settings
- **ST-1 (M)** Business profile: name, address, email, phone, tax or registration ID, logo.
- **ST-2 (M)** Defaults: currency, hourly rate, payment terms in days, tax label and rate, rounding, invoice number pattern, invoice notes.
- **ST-3 (M)** Display: date format, 12 or 24 hour clock, first day of week, light or dark or system theme.
- **ST-4 (M)** Timer: idle threshold, long-running warning, global shortcut, launch at login.
- **ST-5 (M)** Data: show database location, back up to a file, restore from a file, export everything to CSV or JSON.

### 4.8 Onboarding
- **OB-1 (M)** First run: enter business name and default currency and rate, add the first client and project, then land on a screen with a start button. Every step except the client can be skipped.
- **OB-2 (S)** A short hint pointing at the menu bar icon and the global shortcut.

## 5. Data model

Conventions for every table:
- Primary key `id` is a UUID stored as text.
- `created_at`, `updated_at`, `deleted_at` on every table. Rows are soft-deleted.
- All timestamps are UTC, ISO 8601. Convert to local time only for display.
- Money is an integer in minor units (cents). Durations are integers in seconds.
- Foreign keys enforced. WAL mode on.

### settings (single row)
`business_name, address, email, phone, tax_id, logo_path, default_currency, default_rate, payment_terms_days, tax_label, tax_rate, rounding_minutes, invoice_number_pattern, next_invoice_seq, default_invoice_notes, date_format, time_format, week_start, theme, idle_threshold_minutes, long_timer_hours, global_shortcut, launch_at_login`

### clients
`id, name, contact_name, email, billing_address, currency, default_rate, notes, archived_at`

### projects
`id, client_id → clients, name, rate_override (nullable), color, archived_at`

### time_entries
`id, project_id → projects, description, started_at, ended_at (null while running), duration_seconds, billable (bool), source ('timer' | 'manual' | 'timer_edited'), invoice_id → invoices (nullable)`

- At most one row may have `ended_at IS NULL` (the running timer).
- Indexes: `started_at`, `project_id`, `invoice_id`.

### invoices
`id, client_id → clients, number (unique), status ('draft' | 'sent' | 'paid'), issue_date, due_date, currency, grouping ('entry' | 'day' | 'project'), rounding_minutes, subtotal, discount_type, discount_value, tax_label, tax_rate, tax_amount, total, notes, include_timesheet (bool), sender_snapshot (JSON), client_snapshot (JSON), sent_at, paid_at`

- Sender and client details are copied onto the invoice so old invoices do not change when profiles are edited.

### invoice_lines
`id, invoice_id → invoices, position, description, quantity_seconds, rate, amount`

Entry-to-invoice linkage is `time_entries.invoice_id`. Lines are derived from the linked entries according to `grouping` and regenerated while the invoice is a draft.

## 6. Screens

1. **Menu bar popover** — running timer, stop, quick start list, today's total, open app.
2. **Timer / Today** (main window home) — start form, running timer, today's entries.
3. **Work log** — day and week views, filters, summary, CSV export.
4. **Clients and projects** — list, detail, add and edit, archive.
5. **Invoices** — list with status filters and totals.
6. **Invoice builder** — pick client and range, select entries, grouping, rounding, tax, discount, live preview, export PDF.
7. **Settings** — profile, defaults, display, timer, data.
8. **Onboarding** — first-run steps.
9. **Idle prompt** — small dialog on return from idle.

## 7. Non-functional requirements

- **Performance:** cold start under 2 seconds; start or stop responds in under 100 ms; work log stays smooth with 100,000 entries.
- **Reliability:** no tracked time is lost on crash, force quit, sleep, or power loss. Timer accuracy comes from timestamps, never from a counting loop.
- **Privacy:** no network calls except the update check. No analytics in v1.
- **Data safety:** automatic local backup of the database daily, keeping the last 7 copies; schema migrations run on startup and back up first.
- **Compatibility:** macOS 13 or later, Apple Silicon and Intel (universal build).
- **Accessibility:** full keyboard navigation, visible focus states, readable in light and dark themes.
- **Internationalisation:** any ISO currency, configurable date and number formats. UI text in English only, but kept in one strings file so translation is possible later.

## 8. Release requirements

- Apple Developer account, code signing, and notarization.
- Signed DMG and in-app auto-update.
- Landing page with download link, screenshots, and a privacy note.
- Licence and pricing: v1 is free.

## 9. Milestones

1. **Foundation** — Tauri project, SQLite schema and migrations, settings, clients and projects.
2. **Timer core** — start, stop, persistence, manual entries, Today screen.
3. **Menu bar** — tray icon with elapsed time, popover, global shortcut, idle detection.
4. **Work log** — day and week views, filters, summaries, CSV export.
5. **Invoices** — builder, line grouping, rounding, tax, PDF with timesheet, locking, statuses.
6. **Polish** — onboarding, backup and restore, themes, empty states, error handling.
7. **Release** — signing, notarization, auto-update, landing page.

## 10. After v1

- Windows build.
- Optional sync and accounts (Postgres on a server; SQLite stays as the local store).
- Client share link with a live read-only timesheet.
- Dashboard with earnings trends.
- Tags, project budgets and hour caps, expenses and fixed-price lines.
- Recurring invoices and weekly summary emails.
- Mobile companion app.

## 11. Open decisions

| Decision | Default assumed here |
|---|---|
| Final product name | Hourmint (check domain and trademark before launch) |
| Rounding default | None (exact minutes), adjustable per invoice |
| Pricing | Free for v1 |
| Source licence | Closed source for now; decide before launch |
| Analytics and crash reporting | None in v1 |
