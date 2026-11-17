// @vitest-environment jsdom
// Renders every screen against a fake backend to catch runtime errors.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const now = new Date();
const iso = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60_000).toISOString();

const settings = {
  businessName: "Riverside Studio", address: "1 Main St", email: "a@b.c", phone: "", taxId: "", logoPath: null,
  defaultCurrency: "USD", defaultRate: 10000, paymentTermsDays: 14, taxLabel: "VAT", taxRate: 0, roundingMinutes: 0,
  invoiceNumberPattern: "INV-{YYYY}-{0001}", nextInvoiceSeq: 1, defaultInvoiceNotes: "", dateFormat: "YYYY-MM-DD",
  numberLocale: "", timeFormat: "24h", weekStart: 1, theme: "system", idleThresholdMinutes: 10, longTimerHours: 8,
  globalShortcut: "", launchAtLogin: false, reminderEnabled: true, reminderTime: "09:30",
  reminderDays: "1,2,3,4,5", timesheetShowSource: true, onboarded: true,
};
const client = {
  id: "c1", name: "Acme", contactName: "Jo", email: "jo@acme.test", billingAddress: "2 Road", currency: "USD",
  defaultRate: 10000, notes: "", archivedAt: null, createdAt: iso(9999), unbilledSeconds: 5400, unbilledAmount: 15000,
  entryCount: 2, projectCount: 1,
};
const project = {
  id: "p1", clientId: "c1", clientName: "Acme", clientArchived: false, currency: "USD", name: "Website", rateOverride: null,
  effectiveRate: 10000, color: "#10b981", archivedAt: null, entryCount: 2, totalSeconds: 5400,
};
const entry = (id: string, start: number, end: number | null, extra = {}) => ({
  id, projectId: "p1", projectName: "Website", projectColor: "#10b981", clientId: "c1", clientName: "Acme", currency: "USD",
  description: `Work ${id}`, startedAt: iso(start), endedAt: end === null ? null : iso(end),
  durationSeconds: end === null ? 0 : (start - end) * 60, billable: true, source: "timer", invoiceId: null,
  invoiceNumber: null, invoiceStatus: null, rate: 10000, ...extra,
});
const entries = [entry("e1", 120, 60), entry("e2", 50, 20, { source: "manual" })];
const running = entry("r1", 5, null);
const invoice = {
  id: "i1", clientId: "c1", clientName: "Acme", number: "INV-2026-0001", status: "sent", issueDate: "2026-11-01",
  dueDate: "2026-11-15", periodStart: "2026-10-01", periodEnd: "2026-10-31", currency: "USD", grouping: "entry",
  roundingMinutes: 0, subtotal: 15000, discountType: "none", discountValue: 0, discountAmount: 0, taxLabel: "", taxRate: 0,
  taxAmount: 0, total: 15000, notes: "Thanks", includeTimesheet: true,
  senderSnapshot: { businessName: "Riverside Studio", address: "", email: "", phone: "", taxId: "", logoPath: null },
  clientSnapshot: { name: "Acme", contactName: "Jo", email: "", billingAddress: "" }, sentAt: iso(10), paidAt: null,
  createdAt: iso(100), updatedAt: iso(10), totalSeconds: 5400,
};
const lines = [{ id: "l1", position: 1, description: "Website", quantitySeconds: 5400, rate: 10000, amount: 15000 }];
const summaryRow = { id: "c1", name: "Acme", clientId: "c1", clientName: "Acme", color: null, currency: "USD", seconds: 5400, billableSeconds: 5400, amount: 15000, entryCount: 2 };

const responses: Record<string, unknown> = {
  get_settings: settings,
  list_clients: [client],
  get_client: client,
  list_projects: [project],
  get_running: running,
  list_entries: entries,
  recent_combos: [{ projectId: "p1", projectName: "Website", projectColor: null, clientId: "c1", clientName: "Acme", description: "Design", lastUsed: iso(5) }],
  get_summary: { totalSeconds: 5400, billableSeconds: 5400, entryCount: 2, amounts: [{ currency: "USD", amount: 15000 }], byClient: [summaryRow], byProject: [{ ...summaryRow, id: "p1", name: "Website" }] },
  list_invoices: [invoice],
  invoice_totals: [{ currency: "USD", outstanding: 15000, paid: 0, draft: 0, overdue: 15000 }],
  get_invoice: { invoice, lines, entries },
  invoice_candidates: entries,
  preview_invoice: { lines, subtotal: 15000, discountAmount: 0, taxAmount: 0, total: 15000, totalSeconds: 5400 },
  next_invoice_number: "INV-2026-0002",
  find_overlaps: [],
  data_info: { dbPath: "/tmp/hourmint.sqlite", backupDir: "/tmp/backups", backups: [], schemaVersion: 1, appVersion: "0.1.0" },
  app_info: { distribution: "direct", updates: true },
  get_idle_state: { idleSince: iso(15), entry: running },
};

let label = "main";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string) => {
    if (!(cmd in responses)) throw new Error(`unmocked command ${cmd}`);
    return structuredClone(responses[cmd]);
  }),
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ label, close: vi.fn() }) }));

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {}, onchange: null,
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.resetModules();
});

async function renderAt(hash: string, windowLabel = "main") {
  label = windowLabel;
  window.location.hash = hash;
  const { App } = await import("../App");
  const errors: unknown[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...a) => errors.push(a));
  render(<App />);
  return { errors, restore: () => spy.mockRestore() };
}

describe("smoke", () => {
  const routes: [string, string][] = [
    ["#/", "Quick start"],
    ["#/log", "By project"],
    ["#/clients/c1", "Projects"],
    ["#/invoices", "Outstanding"],
    ["#/invoices/i1", "Total due"],
    ["#/invoices/new?client=c1", "Line items"],
    ["#/settings", "Business profile"],
  ];
  for (const [hash, text] of routes) {
    it(`renders ${hash}`, async () => {
      const r = await renderAt(hash);
      expect((await screen.findAllByText(text, {}, { timeout: 3000 })).length).toBeGreaterThan(0);
      r.restore();
      expect(r.errors).toEqual([]);
    });
  }

  it("renders the popover", async () => {
    const r = await renderAt("#/", "popover");
    expect(await screen.findByText("Open Hourmint")).toBeTruthy();
    r.restore();
    expect(r.errors).toEqual([]);
  });

  it("renders the idle prompt", async () => {
    const r = await renderAt("#/", "idle");
    expect(await screen.findByText("Discard idle time")).toBeTruthy();
    r.restore();
    expect(r.errors).toEqual([]);
  });

  it("renders onboarding on first run", async () => {
    responses.get_settings = { ...settings, onboarded: false };
    const r = await renderAt("#/");
    expect(await screen.findByText("Welcome to Hourmint")).toBeTruthy();
    responses.get_settings = settings;
    r.restore();
    expect(r.errors).toEqual([]);
  });
});
