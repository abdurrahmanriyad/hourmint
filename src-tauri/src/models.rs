//! Types shared between the database layer and the frontend (camelCase JSON).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub business_name: String,
    pub address: String,
    pub email: String,
    pub phone: String,
    pub tax_id: String,
    pub logo_path: Option<String>,
    pub default_currency: String,
    pub default_rate: i64,
    pub payment_terms_days: i64,
    pub tax_label: String,
    pub tax_rate: f64,
    pub rounding_minutes: i64,
    pub invoice_number_pattern: String,
    pub next_invoice_seq: i64,
    pub default_invoice_notes: String,
    pub date_format: String,
    pub number_locale: String,
    pub time_format: String,
    pub week_start: i64,
    pub theme: String,
    pub idle_threshold_minutes: i64,
    pub long_timer_hours: f64,
    pub global_shortcut: String,
    pub launch_at_login: bool,
    pub reminder_enabled: bool,
    pub reminder_time: String,
    pub reminder_days: String,
    pub timesheet_show_source: bool,
    pub onboarded: bool,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    pub business_name: Option<String>,
    pub address: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub tax_id: Option<String>,
    pub default_currency: Option<String>,
    pub default_rate: Option<i64>,
    pub payment_terms_days: Option<i64>,
    pub tax_label: Option<String>,
    pub tax_rate: Option<f64>,
    pub rounding_minutes: Option<i64>,
    pub invoice_number_pattern: Option<String>,
    pub next_invoice_seq: Option<i64>,
    pub default_invoice_notes: Option<String>,
    pub date_format: Option<String>,
    pub number_locale: Option<String>,
    pub time_format: Option<String>,
    pub week_start: Option<i64>,
    pub theme: Option<String>,
    pub idle_threshold_minutes: Option<i64>,
    pub long_timer_hours: Option<f64>,
    pub global_shortcut: Option<String>,
    pub launch_at_login: Option<bool>,
    pub reminder_enabled: Option<bool>,
    pub reminder_time: Option<String>,
    pub reminder_days: Option<String>,
    pub timesheet_show_source: Option<bool>,
    pub onboarded: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    pub id: String,
    pub name: String,
    pub contact_name: String,
    pub email: String,
    pub billing_address: String,
    pub currency: String,
    pub default_rate: i64,
    pub notes: String,
    pub archived_at: Option<String>,
    pub created_at: String,
    /// Seconds of finished, billable entries not on any invoice.
    pub unbilled_seconds: i64,
    /// Value of those entries in the client's currency (minor units).
    pub unbilled_amount: i64,
    pub entry_count: i64,
    pub project_count: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientInput {
    pub name: String,
    #[serde(default)]
    pub contact_name: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub billing_address: String,
    pub currency: String,
    pub default_rate: i64,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub client_archived: bool,
    pub currency: String,
    pub name: String,
    pub rate_override: Option<i64>,
    /// The rate that applies: project override or the client's default.
    pub effective_rate: i64,
    pub color: Option<String>,
    pub archived_at: Option<String>,
    pub entry_count: i64,
    pub total_seconds: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub client_id: String,
    pub name: String,
    pub rate_override: Option<i64>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub project_id: String,
    pub project_name: String,
    pub project_color: Option<String>,
    pub client_id: String,
    pub client_name: String,
    pub currency: String,
    pub description: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_seconds: i64,
    pub billable: bool,
    pub source: String,
    pub invoice_id: Option<String>,
    pub invoice_number: Option<String>,
    pub invoice_status: Option<String>,
    /// Rate copied at invoicing time if invoiced, otherwise the current effective rate.
    pub rate: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInput {
    pub project_id: String,
    #[serde(default)]
    pub description: String,
    pub started_at: String,
    pub ended_at: String,
    #[serde(default = "default_true")]
    pub billable: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveEntryResult {
    pub entry: Entry,
    /// Other entries that overlap the saved one (a warning, not an error).
    pub overlaps: Vec<Entry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTimerInput {
    pub project_id: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_true")]
    pub billable: bool,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningPatch {
    pub project_id: Option<String>,
    pub description: Option<String>,
    pub billable: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryFilter {
    /// Inclusive lower bound on `started_at` (UTC ISO).
    pub from: Option<String>,
    /// Exclusive upper bound on `started_at` (UTC ISO).
    pub to: Option<String>,
    pub client_id: Option<String>,
    pub project_id: Option<String>,
    pub billable: Option<bool>,
    /// true = on an invoice, false = not on an invoice.
    pub billed: Option<bool>,
    pub search: Option<String>,
    pub include_running: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentCombo {
    pub project_id: String,
    pub project_name: String,
    pub project_color: Option<String>,
    pub client_id: String,
    pub client_name: String,
    pub description: String,
    pub last_used: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryRow {
    pub id: String,
    pub name: String,
    pub client_id: String,
    pub client_name: String,
    pub color: Option<String>,
    pub currency: String,
    pub seconds: i64,
    pub billable_seconds: i64,
    pub amount: i64,
    pub entry_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrencyTotal {
    pub currency: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub total_seconds: i64,
    pub billable_seconds: i64,
    pub entry_count: i64,
    pub amounts: Vec<CurrencyTotal>,
    pub by_client: Vec<SummaryRow>,
    pub by_project: Vec<SummaryRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceLine {
    pub id: String,
    pub position: i64,
    pub description: String,
    pub quantity_seconds: i64,
    pub rate: i64,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub number: String,
    pub status: String,
    pub issue_date: String,
    pub due_date: String,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub currency: String,
    pub grouping: String,
    pub rounding_minutes: i64,
    pub subtotal: i64,
    pub discount_type: String,
    pub discount_value: f64,
    pub discount_amount: i64,
    pub tax_label: String,
    pub tax_rate: f64,
    pub tax_amount: i64,
    pub total: i64,
    pub notes: String,
    pub include_timesheet: bool,
    pub sender_snapshot: serde_json::Value,
    pub client_snapshot: serde_json::Value,
    pub sent_at: Option<String>,
    pub paid_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub total_seconds: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceDetail {
    pub invoice: Invoice,
    pub lines: Vec<InvoiceLine>,
    pub entries: Vec<Entry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceInput {
    /// Existing draft to update; None creates a new draft.
    pub id: Option<String>,
    pub client_id: String,
    /// None or empty = generate from the pattern.
    pub number: Option<String>,
    pub issue_date: String,
    pub due_date: String,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub grouping: String,
    pub rounding_minutes: i64,
    pub discount_type: String,
    pub discount_value: f64,
    pub tax_label: String,
    pub tax_rate: f64,
    #[serde(default)]
    pub notes: String,
    pub include_timesheet: bool,
    pub entry_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceComputation {
    pub lines: Vec<InvoiceLine>,
    pub subtotal: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
    pub total: i64,
    pub total_seconds: i64,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceFilter {
    pub client_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceTotals {
    pub currency: String,
    pub outstanding: i64,
    pub paid: i64,
    pub draft: i64,
    pub overdue: i64,
}
