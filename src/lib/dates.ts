// Local calendar helpers. Ranges are [start, end) in local time, sent to the
// backend as UTC ISO strings.

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** weekStart: 0 = Sunday … 6 = Saturday. */
export function startOfWeek(d: Date, weekStart: number): Date {
  const day = startOfDay(d);
  const diff = (day.getDay() - weekStart + 7) % 7;
  return addDays(day, -diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Local date → "YYYY-MM-DD". */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → local midnight. */
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local "YYYY-MM-DD" + "HH:MM" → Date. */
export function combine(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = fromDateStr(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayRange(d: Date): { from: string; to: string } {
  const s = startOfDay(d);
  return { from: s.toISOString(), to: addDays(s, 1).toISOString() };
}

/** Inclusive local dates → [from, to) ISO range. */
export function dateStrRange(from: string, to: string): { from: string; to: string } {
  return { from: fromDateStr(from).toISOString(), to: addDays(fromDateStr(to), 1).toISOString() };
}

export function addDaysStr(s: string, n: number): string {
  return toDateStr(addDays(fromDateStr(s), n));
}
