// Display formatting. Storage is always UTC ISO / integer minor units / seconds;
// everything here converts to the user's local, configured representation.

export interface FormatPrefs {
  dateFormat: string;
  timeFormat: "12h" | "24h";
  numberLocale: string;
}

export const DEFAULT_PREFS: FormatPrefs = { dateFormat: "YYYY-MM-DD", timeFormat: "24h", numberLocale: "" };

export function locale(prefs?: Pick<FormatPrefs, "numberLocale">): string | undefined {
  return prefs?.numberLocale ? prefs.numberLocale : undefined;
}

const digitCache = new Map<string, number>();

/** Number of minor-unit digits for an ISO currency (USD 2, JPY 0, KWD 3). */
export function currencyDigits(currency: string): number {
  const cached = digitCache.get(currency);
  if (cached !== undefined) return cached;
  let d = 2;
  try {
    d = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    d = 2;
  }
  digitCache.set(currency, d);
  return d;
}

export function isValidCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

/** Minor units → major units as a number. */
export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** currencyDigits(currency);
}

/** User-typed amount ("1,234.50" or "85") → minor units. Returns null when not a number. */
export function parseMoney(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s,]/g, "").replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10 ** currencyDigits(currency));
}

/** Minor units → plain editable string ("85.50"). */
export function moneyInputValue(minor: number, currency: string): string {
  const d = currencyDigits(currency);
  return (minor / 10 ** d).toFixed(d);
}

export function formatMoney(minor: number, currency: string, prefs?: Pick<FormatPrefs, "numberLocale">): string {
  try {
    return new Intl.NumberFormat(locale(prefs), { style: "currency", currency }).format(toMajor(minor, currency));
  } catch {
    return `${toMajor(minor, currency).toFixed(2)} ${currency}`;
  }
}

/** Seconds → "1:05" (hours:minutes), rounding seconds down. */
export function formatHM(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Seconds → "1:05:09". */
export function formatHMS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Seconds → "2.50" decimal hours. */
export function formatHoursDecimal(seconds: number, prefs?: Pick<FormatPrefs, "numberLocale">): string {
  return new Intl.NumberFormat(locale(prefs), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    seconds / 3600,
  );
}

export function formatNumber(n: number, prefs?: Pick<FormatPrefs, "numberLocale">, maxDigits = 2): string {
  return new Intl.NumberFormat(locale(prefs), { maximumFractionDigits: maxDigits }).format(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A Date (local) or "YYYY-MM-DD" → formatted with the user's date pattern. */
export function formatDate(value: Date | string, pattern: string): string {
  const d = typeof value === "string" ? parseDateValue(value) : value;
  const Y = d.getFullYear();
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const MM = String(M).padStart(2, "0");
  const DD = String(D).padStart(2, "0");
  switch (pattern) {
    case "DD/MM/YYYY":
      return `${DD}/${MM}/${Y}`;
    case "MM/DD/YYYY":
      return `${MM}/${DD}/${Y}`;
    case "DD.MM.YYYY":
      return `${DD}.${MM}.${Y}`;
    case "D MMM YYYY":
      return `${D} ${MONTHS[M - 1]} ${Y}`;
    case "MMM D, YYYY":
      return `${MONTHS[M - 1]} ${D}, ${Y}`;
    default:
      return `${Y}-${MM}-${DD}`;
  }
}

/** "YYYY-MM-DD" is a local calendar date; full ISO timestamps are instants. */
function parseDateValue(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function formatTime(value: Date | string, timeFormat: "12h" | "24h"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  if (timeFormat === "12h") {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${h < 12 ? "AM" : "PM"}`;
  }
  return `${String(h).padStart(2, "0")}:${m}`;
}

export function formatWeekday(d: Date, prefs?: Pick<FormatPrefs, "numberLocale">, style: "short" | "long" = "long"): string {
  return new Intl.DateTimeFormat(locale(prefs) ?? "en", { weekday: style }).format(d);
}

export function formatPercent(value: number, prefs?: Pick<FormatPrefs, "numberLocale">): string {
  return `${formatNumber(value, prefs, 3)}%`;
}

/** Parse "1:30", "1h 30m", "90m", "1.5" (hours) into seconds. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  let m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  m = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (m && (m[1] || m[2])) return Math.round(Number(m[1] ?? 0) * 3600) + Number(m[2] ?? 0) * 60;
  m = s.match(/^(\d+(?:[.,]\d+)?)$/);
  if (m) return Math.round(Number(m[1].replace(",", ".")) * 3600);
  return null;
}

export const SOURCE_LABEL: Record<string, string> = {
  timer: "Timer",
  manual: "Manual",
  timer_edited: "Edited",
};
