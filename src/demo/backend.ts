import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import type { Entry, EntryFilter } from "../lib/api";

const DAY = 86_400_000;
const now = Date.now();
const today = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
const at = (dayOffset: number, h: number, m = 0) => today - dayOffset * DAY + (h * 60 + m) * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();
const dateStr = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const settings = {
  businessName: "Northwind Studio", address: "14 Harbour Street\nLisbon 1100-001\nPortugal", email: "hello@northwind.studio",
  phone: "", taxId: "PT 509 123 456", logoPath: null, defaultCurrency: "USD", defaultRate: 9500, paymentTermsDays: 14,
  taxLabel: "VAT", taxRate: 0, roundingMinutes: 0, invoiceNumberPattern: "INV-{YYYY}-{0001}", nextInvoiceSeq: 4,
  defaultInvoiceNotes: "Thank you for your business.", dateFormat: "D MMM YYYY", numberLocale: "", timeFormat: "24h",
  weekStart: 1, theme: "system", idleThresholdMinutes: 10, longTimerHours: 8, globalShortcut: "", launchAtLogin: true,
  reminderEnabled: true, reminderTime: "09:30", reminderDays: "1,2,3,4,5", timesheetShowSource: true, onboarded: true,
};

const clients = [
  { id: "c1", name: "Acme Robotics", contactName: "Dana Whitfield", email: "dana@acme.test", billingAddress: "200 Market St\nSan Francisco, CA", currency: "USD", defaultRate: 9500 },
  { id: "c2", name: "Brightline GmbH", contactName: "Jonas Keller", email: "jonas@brightline.test", billingAddress: "Torstraße 1\nBerlin", currency: "EUR", defaultRate: 8000 },
  { id: "c3", name: "Kestrel Labs", contactName: "Priya Nair", email: "priya@kestrel.test", billingAddress: "1 King's Road\nLondon", currency: "GBP", defaultRate: 7000 },
];
const projects = [
  { id: "p1", clientId: "c1", name: "Mobile app", color: "#10b981", rateOverride: null },
  { id: "p2", clientId: "c1", name: "Design system", color: "#6366f1", rateOverride: 11000 },
  { id: "p3", clientId: "c2", name: "Website redesign", color: "#f59e0b", rateOverride: null },
  { id: "p4", clientId: "c3", name: "Research prototype", color: "#ec4899", rateOverride: null },
];
const clientOf = (pid: string) => clients.find((c) => c.id === projects.find((p) => p.id === pid)!.clientId)!;
const rateOf = (pid: string) => projects.find((p) => p.id === pid)!.rateOverride ?? clientOf(pid).defaultRate;

const DESCRIPTIONS: Record<string, string[]> = {
  p1: ["Onboarding flow", "Push notifications", "Bug fixes from QA", "Release 2.4 build"],
  p2: ["Button and input tokens", "Docs for colour scales", "Review with Dana"],
  p3: ["Homepage layout", "CMS migration", "Pricing page copy"],
  p4: ["User interviews synthesis", "Prototype v2", "Weekly sync"],
};

let seq = 0;
function makeEntry(pid: string, start: number, end: number | null, extra: Partial<Entry> = {}): Entry {
  const p = projects.find((x) => x.id === pid)!;
  const c = clientOf(pid);
  const descs = DESCRIPTIONS[pid];
  return {
    id: `e${++seq}`, projectId: pid, projectName: p.name, projectColor: p.color, clientId: c.id, clientName: c.name,
    currency: c.currency, description: descs[seq % descs.length], startedAt: iso(start), endedAt: end === null ? null : iso(end),
    durationSeconds: end === null ? 0 : Math.round((end - start) / 1000), billable: true, source: "timer", invoiceId: null,
    invoiceNumber: null, invoiceStatus: null, rate: rateOf(pid), ...extra,
  } as Entry;
}

const entries: Entry[] = [];
const PLAN: [string, number, number, number, number][] = [
  ["p1", 9, 5, 11, 20], ["p2", 11, 35, 12, 50], ["p3", 13, 40, 15, 55], ["p4", 16, 5, 17, 30],
];
for (let d = 1; d <= 24; d++) {
  const dow = new Date(today - d * DAY).getDay();
  if (dow === 0 || dow === 6) continue;
  PLAN.forEach(([pid, sh, sm, eh, em], i) => {
    if ((d + i) % 5 === 0) return;
    const jitter = ((d * 7 + i * 13) % 25) - 10;
    const extra: Partial<Entry> = {};
    if ((d + i) % 7 === 0) extra.source = "manual";
    if ((d + i) % 11 === 0) extra.source = "timer_edited";
    if (pid === "p4" && d % 3 === 0) extra.billable = false;
    if (d > 13 && pid !== "p4") Object.assign(extra, { invoiceId: pid === "p3" ? "i2" : "i1", invoiceNumber: pid === "p3" ? "INV-2026-0002" : "INV-2026-0001", invoiceStatus: pid === "p3" ? "paid" : "sent" });
    entries.push(makeEntry(pid, at(d, sh, sm + jitter), at(d, eh, em + jitter), extra));
  });
}
entries.push(makeEntry("p1", at(0, 9, 10), at(0, 10, 45), { description: "Standup and planning" }));
entries.push(makeEntry("p2", at(0, 10, 55), at(0, 12, 30), { description: "Component audit" }));
const running = makeEntry("p1", now - 47 * 60_000 - 12_000, null, { description: "Offline sync" });
entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

function filterEntries(f: EntryFilter = {}) {
  return entries.filter(
    (e) =>
      (!f.from || e.startedAt >= f.from) && (!f.to || e.startedAt < f.to) && (!f.clientId || e.clientId === f.clientId) &&
      (!f.projectId || e.projectId === f.projectId) && (f.billable === undefined || f.billable === null || e.billable === f.billable) &&
      (f.billed === undefined || f.billed === null || !!e.invoiceId === f.billed) &&
      (!f.search || e.description.toLowerCase().includes(f.search.toLowerCase())),
  );
}
const amount = (e: Entry) => (e.billable ? Math.round((e.durationSeconds * e.rate) / 3600) : 0);

function summary(f: EntryFilter) {
  const list = filterEntries(f);
  const group = (key: (e: Entry) => string, row: (e: Entry) => object) => {
    const m = new Map<string, any>();
    for (const e of list) {
      const k = key(e);
      const r = m.get(k) ?? { ...row(e), clientId: e.clientId, clientName: e.clientName, currency: e.currency, seconds: 0, billableSeconds: 0, amount: 0, entryCount: 0 };
      r.seconds += e.durationSeconds;
      if (e.billable) r.billableSeconds += e.durationSeconds;
      r.amount += amount(e);
      r.entryCount++;
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => b.seconds - a.seconds);
  };
  const byClient = group((e) => e.clientId, (e) => ({ id: e.clientId, name: e.clientName, color: null }));
  const byProject = group((e) => e.projectId, (e) => ({ id: e.projectId, name: e.projectName, color: e.projectColor }));
  const amounts = new Map<string, number>();
  byClient.forEach((r) => amounts.set(r.currency, (amounts.get(r.currency) ?? 0) + r.amount));
  return {
    totalSeconds: list.reduce((s, e) => s + e.durationSeconds, 0),
    billableSeconds: list.reduce((s, e) => s + (e.billable ? e.durationSeconds : 0), 0),
    entryCount: list.length, amounts: [...amounts].map(([currency, amount]) => ({ currency, amount })), byClient, byProject,
  };
}

function clientRow(c: (typeof clients)[number]) {
  const unbilled = entries.filter((e) => e.clientId === c.id && !e.invoiceId && e.billable);
  return {
    ...c, notes: "", archivedAt: null, createdAt: iso(now - 90 * DAY),
    unbilledSeconds: unbilled.reduce((s, e) => s + e.durationSeconds, 0), unbilledAmount: unbilled.reduce((s, e) => s + amount(e), 0),
    entryCount: entries.filter((e) => e.clientId === c.id).length, projectCount: projects.filter((p) => p.clientId === c.id).length,
  };
}
function projectRow(p: (typeof projects)[number]) {
  const c = clientOf(p.id);
  const list = entries.filter((e) => e.projectId === p.id);
  return {
    ...p, clientName: c.name, clientArchived: false, currency: c.currency, effectiveRate: rateOf(p.id), archivedAt: null,
    entryCount: list.length, totalSeconds: list.reduce((s, e) => s + e.durationSeconds, 0),
  };
}

function invoice(id: string, number: string, clientId: string, status: string, issueOffset: number) {
  const list = entries.filter((e) => e.invoiceId === id);
  const c = clients.find((x) => x.id === clientId)!;
  const subtotal = list.reduce((s, e) => s + amount(e), 0);
  const issue = today - issueOffset * DAY;
  return {
    id, clientId, clientName: c.name, number, status, issueDate: dateStr(issue), dueDate: dateStr(issue + 14 * DAY),
    periodStart: list.length ? dateStr(Date.parse(list[list.length - 1].startedAt)) : null,
    periodEnd: list.length ? dateStr(Date.parse(list[0].startedAt)) : null, currency: c.currency, grouping: "project",
    roundingMinutes: 0, subtotal, discountType: "none", discountValue: 0, discountAmount: 0, taxLabel: "", taxRate: 0, taxAmount: 0,
    total: subtotal, notes: settings.defaultInvoiceNotes, includeTimesheet: true,
    senderSnapshot: { businessName: settings.businessName, address: settings.address, email: settings.email, phone: "", taxId: settings.taxId, logoPath: null },
    clientSnapshot: { name: c.name, contactName: c.contactName, email: c.email, billingAddress: c.billingAddress },
    sentAt: status === "draft" ? null : iso(issue), paidAt: status === "paid" ? iso(issue + 6 * DAY) : null,
    createdAt: iso(issue), updatedAt: iso(issue), totalSeconds: list.reduce((s, e) => s + e.durationSeconds, 0),
  };
}
const invoices = [
  invoice("i2", "INV-2026-0002", "c2", "paid", 9),
  invoice("i1", "INV-2026-0001", "c1", "sent", 9),
  invoice("i3", "INV-2026-0003", "c3", "draft", 0),
];
invoices[1].dueDate = dateStr(today - 2 * DAY); // overdue
function lines(id: string) {
  const byProject = new Map<string, { secs: number; rate: number; name: string }>();
  entries.filter((e) => e.invoiceId === id).forEach((e) => {
    const k = `${e.projectId}:${e.rate}`;
    const r = byProject.get(k) ?? { secs: 0, rate: e.rate, name: e.projectName };
    r.secs += e.durationSeconds;
    byProject.set(k, r);
  });
  return [...byProject.values()].map((r, i) => ({
    id: `l${id}${i}`, position: i + 1, description: r.name, quantitySeconds: r.secs, rate: r.rate, amount: Math.round((r.secs * r.rate) / 3600),
  }));
}

function preview(input: { entryIds: string[] }) {
  const list = entries.filter((e) => input.entryIds.includes(e.id));
  const ls = (() => {
    const m = new Map<string, any>();
    list.forEach((e) => {
      const r = m.get(e.projectId) ?? { id: e.projectId, position: m.size + 1, description: e.projectName, quantitySeconds: 0, rate: e.rate, amount: 0 };
      r.quantitySeconds += e.durationSeconds;
      r.amount += amount(e);
      m.set(e.projectId, r);
    });
    return [...m.values()];
  })();
  const subtotal = ls.reduce((s, l) => s + l.amount, 0);
  return { lines: ls, subtotal, discountAmount: 0, taxAmount: 0, total: subtotal, totalSeconds: list.reduce((s, e) => s + e.durationSeconds, 0) };
}

export function installDemoBackend(label: string, theme: string | null, onboarded = true) {
  if (theme) settings.theme = theme;
  settings.onboarded = onboarded;
  mockWindows(label);
  mockIPC((cmd, args: any) => {
    switch (cmd) {
      case "get_settings": return settings;
      case "update_settings": return Object.assign(settings, args.patch);
      case "list_clients": return clients.map(clientRow);
      case "get_client": return clientRow(clients.find((c) => c.id === args.id)!);
      case "list_projects": return projects.filter((p) => !args.clientId || p.clientId === args.clientId).map(projectRow);
      case "get_running": return running;
      case "list_entries": {
        const list = filterEntries(args.filter);
        return list.slice(args.filter.offset ?? 0, (args.filter.offset ?? 0) + (args.filter.limit ?? 500));
      }
      case "recent_combos":
        return projects.map((p, i) => ({ projectId: p.id, projectName: p.name, projectColor: p.color, clientId: p.clientId, clientName: clientOf(p.id).name, description: DESCRIPTIONS[p.id][0], lastUsed: iso(now - i * DAY) }));
      case "get_summary": return summary(args.filter);
      case "list_invoices": return invoices.filter((i) => (!args.filter.clientId || i.clientId === args.filter.clientId) && (!args.filter.status || i.status === args.filter.status));
      case "invoice_totals": return [{ currency: "USD", outstanding: invoices[1].total, paid: 0, draft: 0, overdue: invoices[1].total }, { currency: "EUR", outstanding: 0, paid: invoices[0].total, draft: 0, overdue: 0 }];
      case "get_invoice": {
        const inv = invoices.find((i) => i.id === args.id)!;
        return { invoice: inv, lines: lines(inv.id), entries: entries.filter((e) => e.invoiceId === inv.id) };
      }
      case "invoice_candidates":
        return entries.filter(
          (e) => e.clientId === args.clientId && (!e.invoiceId || (args.invoiceId && e.invoiceId === args.invoiceId)) &&
            (!args.from || dateStr(Date.parse(e.startedAt)) >= args.from) && (!args.to || dateStr(Date.parse(e.startedAt)) <= args.to),
        );
      case "preview_invoice": return preview(args.input);
      case "next_invoice_number": return "INV-2026-0004";
      case "find_overlaps": return [];
      case "timesheet_entries": return entries.filter((e) => e.clientId === args.clientId);
      case "read_logo": return null;
      case "data_info":
        return { dbPath: "~/Library/Application Support/app.hourmint.desktop/hourmint.sqlite", backupDir: "~/Library/Application Support/app.hourmint.desktop/backups", backups: [0, 1, 2].map((d) => ({ name: `hourmint-daily-${dateStr(today - d * DAY)}.sqlite`, path: `/b${d}`, size: 412_000 - d * 3000, modified: iso(today - d * DAY + 9 * 3600_000) })), schemaVersion: 2, appVersion: "0.1.0" };
      case "get_idle_state": return { idleSince: iso(now - 14 * 60_000), entry: running };
      default:
        console.warn("demo: unhandled command", cmd, args);
        return null;
    }
  }, { shouldMockEvents: true });
}
