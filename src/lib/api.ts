// Typed wrappers around the Rust commands. Types mirror src-tauri/src/models.rs.
import { invoke } from "@tauri-apps/api/core";

export interface Settings {
  businessName: string;
  address: string;
  email: string;
  phone: string;
  taxId: string;
  logoPath: string | null;
  defaultCurrency: string;
  defaultRate: number;
  paymentTermsDays: number;
  taxLabel: string;
  taxRate: number;
  roundingMinutes: number;
  invoiceNumberPattern: string;
  nextInvoiceSeq: number;
  defaultInvoiceNotes: string;
  dateFormat: string;
  numberLocale: string;
  timeFormat: "12h" | "24h";
  weekStart: number;
  theme: "light" | "dark" | "system";
  idleThresholdMinutes: number;
  longTimerHours: number;
  globalShortcut: string;
  launchAtLogin: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderDays: string;
  timesheetShowSource: boolean;
  onboarded: boolean;
}

export type SettingsPatch = Partial<Omit<Settings, "logoPath">>;

export interface Client {
  id: string;
  name: string;
  contactName: string;
  email: string;
  billingAddress: string;
  currency: string;
  defaultRate: number;
  notes: string;
  archivedAt: string | null;
  createdAt: string;
  unbilledSeconds: number;
  unbilledAmount: number;
  entryCount: number;
  projectCount: number;
}

export interface ClientInput {
  name: string;
  contactName: string;
  email: string;
  billingAddress: string;
  currency: string;
  defaultRate: number;
  notes: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  clientArchived: boolean;
  currency: string;
  name: string;
  rateOverride: number | null;
  effectiveRate: number;
  color: string | null;
  archivedAt: string | null;
  entryCount: number;
  totalSeconds: number;
}

export interface ProjectInput {
  clientId: string;
  name: string;
  rateOverride: number | null;
  color: string | null;
}

export type EntrySource = "timer" | "manual" | "timer_edited";
export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Entry {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  clientId: string;
  clientName: string;
  currency: string;
  description: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  billable: boolean;
  source: EntrySource;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  rate: number;
}

export interface EntryInput {
  projectId: string;
  description: string;
  startedAt: string;
  endedAt: string;
  billable: boolean;
}

export interface SaveEntryResult {
  entry: Entry;
  overlaps: Entry[];
}

export interface EntryFilter {
  from?: string;
  to?: string;
  clientId?: string;
  projectId?: string;
  billable?: boolean;
  billed?: boolean;
  search?: string;
  includeRunning?: boolean;
  limit?: number;
  offset?: number;
}

export interface RecentCombo {
  projectId: string;
  projectName: string;
  projectColor: string | null;
  clientId: string;
  clientName: string;
  description: string;
  lastUsed: string;
}

export interface SummaryRow {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  color: string | null;
  currency: string;
  seconds: number;
  billableSeconds: number;
  amount: number;
  entryCount: number;
}

export interface Summary {
  totalSeconds: number;
  billableSeconds: number;
  entryCount: number;
  amounts: { currency: string; amount: number }[];
  byClient: SummaryRow[];
  byProject: SummaryRow[];
}

export interface InvoiceLine {
  id: string;
  position: number;
  description: string;
  quantitySeconds: number;
  rate: number;
  amount: number;
}

export interface SenderSnapshot {
  businessName: string;
  address: string;
  email: string;
  phone: string;
  taxId: string;
  logoPath: string | null;
}

export interface ClientSnapshot {
  name: string;
  contactName: string;
  email: string;
  billingAddress: string;
}

export type Grouping = "entry" | "day" | "project";
export type DiscountType = "none" | "percent" | "fixed";

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  grouping: Grouping;
  roundingMinutes: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxLabel: string;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  includeTimesheet: boolean;
  senderSnapshot: SenderSnapshot;
  clientSnapshot: ClientSnapshot;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalSeconds: number;
}

export interface InvoiceDetail {
  invoice: Invoice;
  lines: InvoiceLine[];
  entries: Entry[];
}

export interface InvoiceInput {
  id: string | null;
  clientId: string;
  number: string | null;
  issueDate: string;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  grouping: Grouping;
  roundingMinutes: number;
  discountType: DiscountType;
  discountValue: number;
  taxLabel: string;
  taxRate: number;
  notes: string;
  includeTimesheet: boolean;
  entryIds: string[];
}

export interface InvoiceComputation {
  lines: InvoiceLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  totalSeconds: number;
}

export interface InvoiceTotals {
  currency: string;
  outstanding: number;
  paid: number;
  draft: number;
  overdue: number;
}

export interface BackupFile {
  path: string;
  name: string;
  size: number;
  modified: string | null;
}

export interface DataInfo {
  dbPath: string;
  backupDir: string;
  backups: BackupFile[];
  schemaVersion: number;
  appVersion: string;
}

export interface IdleInfo {
  idleSince: string;
  entry: Entry | null;
}

export interface AppError {
  code: "validation" | "not_found" | "conflict" | "db" | "io" | "other";
  message: string;
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as AppError).message);
  return String(e);
}

export const api = {
  // settings
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (patch: SettingsPatch) => invoke<Settings>("update_settings", { patch }),
  pickLogo: () => invoke<Settings | null>("pick_logo"),
  clearLogo: () => invoke<Settings>("clear_logo"),
  readLogo: (path: string) => invoke<string | null>("read_logo", { path }),

  // clients & projects
  listClients: (includeArchived = false) => invoke<Client[]>("list_clients", { includeArchived }),
  getClient: (id: string) => invoke<Client>("get_client", { id }),
  createClient: (input: ClientInput) => invoke<Client>("create_client", { input }),
  updateClient: (id: string, input: ClientInput) => invoke<Client>("update_client", { id, input }),
  setClientArchived: (id: string, archived: boolean) => invoke<Client>("set_client_archived", { id, archived }),
  deleteClient: (id: string) => invoke<void>("delete_client", { id }),
  listProjects: (clientId: string | null = null, includeArchived = false) =>
    invoke<Project[]>("list_projects", { clientId, includeArchived }),
  createProject: (input: ProjectInput) => invoke<Project>("create_project", { input }),
  updateProject: (id: string, input: ProjectInput) => invoke<Project>("update_project", { id, input }),
  setProjectArchived: (id: string, archived: boolean) => invoke<Project>("set_project_archived", { id, archived }),
  deleteProject: (id: string) => invoke<void>("delete_project", { id }),

  // timer & entries
  getRunning: () => invoke<Entry | null>("get_running"),
  startTimer: (input: { projectId: string; description: string; billable?: boolean }) =>
    invoke<Entry>("start_timer", { input: { billable: true, ...input } }),
  stopTimer: () => invoke<Entry | null>("stop_timer"),
  updateRunning: (patch: { projectId?: string; description?: string; billable?: boolean }) =>
    invoke<Entry | null>("update_running", { patch }),
  continueEntry: (id: string) => invoke<Entry>("continue_entry", { id }),
  createEntry: (input: EntryInput) => invoke<SaveEntryResult>("create_entry", { input }),
  updateEntry: (id: string, input: EntryInput) => invoke<SaveEntryResult>("update_entry", { id, input }),
  setEntryBillable: (id: string, billable: boolean) => invoke<Entry>("set_entry_billable", { id, billable }),
  deleteEntry: (id: string) => invoke<void>("delete_entry", { id }),
  splitEntry: (id: string, at: string) => invoke<Entry[]>("split_entry", { id, at }),
  findOverlaps: (startedAt: string, endedAt: string, excludeId: string | null) =>
    invoke<Entry[]>("find_overlaps", { startedAt, endedAt, excludeId }),
  listEntries: (filter: EntryFilter) => invoke<Entry[]>("list_entries", { filter }),
  recentCombos: (limit = 8) => invoke<RecentCombo[]>("recent_combos", { limit }),
  getSummary: (filter: EntryFilter) => invoke<Summary>("get_summary", { filter }),

  // idle
  getIdleState: () => invoke<IdleInfo | null>("get_idle_state"),
  resolveIdle: (action: "keep" | "discard" | "discard_stop") => invoke<void>("resolve_idle", { action }),

  // invoices
  listInvoices: (filter: { clientId?: string; status?: string }) => invoke<Invoice[]>("list_invoices", { filter }),
  invoiceTotals: (clientId: string | null = null) => invoke<InvoiceTotals[]>("invoice_totals", { clientId }),
  getInvoice: (id: string) => invoke<InvoiceDetail>("get_invoice", { id }),
  invoiceCandidates: (clientId: string, from: string | null, to: string | null, invoiceId: string | null) =>
    invoke<Entry[]>("invoice_candidates", { clientId, from, to, invoiceId }),
  previewInvoice: (input: InvoiceInput) => invoke<InvoiceComputation>("preview_invoice", { input }),
  nextInvoiceNumber: (issueDate: string) => invoke<string>("next_invoice_number", { issueDate }),
  saveInvoice: (input: InvoiceInput) => invoke<InvoiceDetail>("save_invoice", { input }),
  setInvoiceStatus: (id: string, status: InvoiceStatus) => invoke<Invoice>("set_invoice_status", { id, status }),
  deleteInvoice: (id: string) => invoke<void>("delete_invoice", { id }),
  timesheetEntries: (clientId: string, from: string | null, to: string | null, includeNonBillable: boolean) =>
    invoke<Entry[]>("timesheet_entries", { clientId, from, to, includeNonBillable }),

  // files & data
  saveFile: (defaultName: string, filterName: string, extension: string, base64Data: string) =>
    invoke<string | null>("save_file", { defaultName, filterName, extension, base64Data }),
  exportEntriesCsv: (filter: EntryFilter, defaultName: string) =>
    invoke<string | null>("export_entries_csv", { filter, defaultName }),
  exportAll: (format: "json" | "csv") => invoke<string | null>("export_all", { format }),
  dataInfo: () => invoke<DataInfo>("data_info"),
  revealPath: (path: string) => invoke<void>("reveal_path", { path }),
  backupToFile: () => invoke<string | null>("backup_to_file"),
  backupNow: () => invoke<string>("backup_now"),
  restoreBackup: (path: string | null) => invoke<boolean>("restore_backup", { path }),

  // windows
  showMainWindow: (route?: string) => invoke<void>("show_main_window", { route: route ?? null }),
  hidePopover: () => invoke<void>("hide_popover"),
  quitApp: () => invoke<void>("quit_app"),
};
