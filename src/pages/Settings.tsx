import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, type SettingsPatch } from "../lib/api";
import { formatDate, formatMoney, isValidCurrency } from "../lib/format";
import { displayShortcut, eventToAccelerator } from "../lib/shortcut";
import { usePrefs, useSettingsValue } from "../lib/queries";
import { checkForUpdate } from "../lib/updates";
import { t } from "../strings";
import { CurrencyInput, MoneyInput } from "../components/inputs";
import { Button, Card, Field, Input, PageHeader, Select, Textarea, Toggle, cx, useUi } from "../components/ui";

const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD.MM.YYYY", "D MMM YYYY", "MMM D, YYYY"];
const LOCALES = ["", "en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "it-IT", "nl-NL", "pt-BR", "sv-SE", "pl-PL", "ja-JP", "en-IN", "ur-PK", "ar-SA"];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4">{children}</div>
    </Card>
  );
}

function useSave() {
  const ui = useUi();
  return async (patch: SettingsPatch) => {
    try {
      await api.updateSettings(patch);
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    }
  };
}

/** Text setting that saves on blur. */
function TextSetting({
  id,
  value,
  onSave,
  multiline,
  type,
  placeholder,
}: {
  id: string;
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    if (v !== value) onSave(v);
  };
  return multiline ? (
    <Textarea id={id} rows={3} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />
  ) : (
    <Input
      id={id}
      type={type}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

function NumberSetting({ id, value, onSave, min, max, step = 1 }: { id: string; value: number; onSave: (v: number) => void; min: number; max: number; step?: number }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) return setV(String(value));
    if (n !== value) onSave(n);
  };
  return (
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="tabular"
    />
  );
}

function ShortcutRecorder({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") return setRecording(false);
      const acc = eventToAccelerator(e);
      if (acc) {
        setRecording(false);
        onSave(acc);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, onSave]);
  return (
    <div className="flex items-center gap-2">
      <kbd
        className={cx(
          "inline-flex h-8 min-w-[110px] items-center justify-center rounded-lg border border-border bg-surface-2 px-3 font-mono text-sm",
          recording && "ring-2 ring-accent",
        )}
      >
        {recording ? t.settings.recording : displayShortcut(value) || "—"}
      </kbd>
      <Button size="sm" onClick={() => setRecording((r) => !r)}>
        {recording ? t.common.cancel : t.settings.recordShortcut}
      </Button>
      {value && !recording && (
        <Button size="sm" variant="ghost" onClick={() => onSave("")}>
          {t.settings.clearShortcut}
        </Button>
      )}
    </div>
  );
}

function Logo() {
  const settings = useSettingsValue();
  const ui = useUi();
  const { data: src } = useQuery({
    queryKey: ["logo", settings.logoPath],
    queryFn: () => (settings.logoPath ? api.readLogo(settings.logoPath) : Promise.resolve(null)),
  });
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-white">
        {src ? <img src={src} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-neutral-400">—</span>}
      </div>
      <Button size="sm" onClick={() => api.pickLogo().catch((e) => ui.toast(errorMessage(e), "error"))}>
        {t.settings.chooseLogo}
      </Button>
      {settings.logoPath && (
        <Button size="sm" variant="ghost" onClick={() => api.clearLogo()}>
          {t.settings.removeLogo}
        </Button>
      )}
    </div>
  );
}

function DataSection() {
  const ui = useUi();
  const prefs = usePrefs();
  const { data: info, refetch } = useQuery({ queryKey: ["dataInfo"], queryFn: api.dataInfo });

  const run = async (fn: () => Promise<string | null | boolean | void>, done?: (r: string) => string) => {
    try {
      const r = await fn();
      if (typeof r === "string" && done) ui.toast(done(r));
      refetch();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    }
  };

  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  const checkUpdates = async () => {
    setChecking(true);
    try {
      // Fills the shared ["update"] query, so the sidebar card appears when one exists.
      const update = await qc.fetchQuery({ queryKey: ["update"], queryFn: checkForUpdate, staleTime: 0, retry: false });
      if (!update) ui.toast(t.settings.upToDate);
    } catch {
      ui.toast(t.settings.updateFailed, "error");
    } finally {
      setChecking(false);
    }
  };

  const restore = async (path: string | null) => {
    if (!(await ui.confirm({ title: t.settings.restore, body: t.settings.restoreConfirm, confirmLabel: t.settings.restoreThis, danger: true }))) return;
    try {
      if (await api.restoreBackup(path)) {
        ui.toast(t.settings.restored);
        refetch();
      }
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">{t.settings.data}</h2>
      <p className="mt-0.5 text-xs text-muted">{t.settings.privacy}</p>
      <div className="mt-4 flex flex-col gap-4">
        <Field label={t.settings.dbLocation}>
          <div className="flex items-center gap-2">
            <code className="selectable min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs">{info?.dbPath}</code>
            <Button size="sm" onClick={() => info && api.revealPath(info.dbPath)}>
              {t.settings.reveal}
            </Button>
          </div>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(api.backupNow, (p) => p)}>{t.settings.backupNow}</Button>
          <Button onClick={() => run(api.backupToFile, (p) => p)}>{t.settings.backupToFile}</Button>
          <Button onClick={() => restore(null)}>{t.settings.restore}</Button>
          <span className="mx-1 w-px bg-border" />
          <Button onClick={() => run(() => api.exportAll("json"), (p) => p)}>{t.settings.exportJson}</Button>
          <Button onClick={() => run(() => api.exportAll("csv"), (p) => p)}>{t.settings.exportCsv}</Button>
        </div>
        <div>
          <p className="text-[13px] font-medium">{t.settings.autoBackups}</p>
          <p className="mb-2 text-xs text-muted">{t.settings.autoBackupsHint}</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(info?.backups ?? []).slice(0, 12).map((b) => (
              <li key={b.path} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono">{b.name}</span>
                <span className="text-muted tabular">{b.modified ? formatDate(new Date(b.modified), prefs.dateFormat) : ""}</span>
                <span className="w-16 text-right text-muted tabular">{(b.size / 1024).toFixed(0)} KB</span>
                <Button size="sm" variant="ghost" onClick={() => restore(b.path)}>
                  {t.settings.restoreThis}
                </Button>
              </li>
            ))}
            {info && info.backups.length === 0 && <li className="px-3 py-2 text-xs text-muted">—</li>}
          </ul>
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => info && api.revealPath(info.backupDir)}>
            {t.settings.reveal}
          </Button>
        </div>
        {info && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted">{t.settings.version(info.appVersion)}</p>
            <Button size="sm" variant="ghost" disabled={checking} onClick={checkUpdates}>
              {checking ? t.settings.checking : t.settings.checkUpdates}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const s = useSettingsValue();
  const prefs = usePrefs();
  const save = useSave();
  const [currency, setCurrency] = useState(s.defaultCurrency);
  useEffect(() => setCurrency(s.defaultCurrency), [s.defaultCurrency]);
  const { data: nextNumber } = useQuery({
    queryKey: ["nextNumber", "settings", s.invoiceNumberPattern, s.nextInvoiceSeq],
    queryFn: () => api.nextInvoiceNumber(new Date().toISOString().slice(0, 10)),
  });
  const days = s.reminderDays.split(",").filter(Boolean);
  const toggleDay = (d: number) => {
    const k = String(d === 0 ? 7 : d);
    const next = days.includes(k) ? days.filter((x) => x !== k) : [...days, k];
    save({ reminderDays: next.sort().join(",") });
  };

  return (
    <>
      <PageHeader title={t.settings.title} />
      <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
        <Section title={t.settings.profile} hint={t.settings.profileHint}>
          <Field label={t.settings.businessName} htmlFor="s-bn" className="col-span-2">
            <TextSetting id="s-bn" value={s.businessName} onSave={(v) => save({ businessName: v })} />
          </Field>
          <Field label={t.settings.address} htmlFor="s-addr" className="col-span-2">
            <TextSetting id="s-addr" multiline value={s.address} onSave={(v) => save({ address: v })} />
          </Field>
          <Field label={t.settings.email} htmlFor="s-email">
            <TextSetting id="s-email" type="email" value={s.email} onSave={(v) => save({ email: v })} />
          </Field>
          <Field label={t.settings.phone} htmlFor="s-phone">
            <TextSetting id="s-phone" value={s.phone} onSave={(v) => save({ phone: v })} />
          </Field>
          <Field label={t.settings.taxId} htmlFor="s-taxid">
            <TextSetting id="s-taxid" value={s.taxId} onSave={(v) => save({ taxId: v })} />
          </Field>
          <Field label={t.settings.logo}>
            <Logo />
          </Field>
        </Section>

        <Section title={t.settings.defaults}>
          <Field label={t.settings.defaultCurrency} htmlFor="s-cur" error={currency.length === 3 && !isValidCurrency(currency) ? t.errors.invalidCurrency : null}>
            <CurrencyInput
              id="s-cur"
              value={currency}
              onChange={(c) => {
                setCurrency(c);
                if (isValidCurrency(c)) save({ defaultCurrency: c });
              }}
            />
          </Field>
          <Field label={t.settings.defaultRate} htmlFor="s-rate">
            <MoneyInput id="s-rate" value={s.defaultRate} currency={s.defaultCurrency} onChange={(v) => save({ defaultRate: v ?? 0 })} />
          </Field>
          <Field label={t.settings.paymentTerms} htmlFor="s-terms">
            <NumberSetting id="s-terms" value={s.paymentTermsDays} min={0} max={365} onSave={(v) => save({ paymentTermsDays: v })} />
          </Field>
          <Field label={t.settings.rounding} htmlFor="s-round">
            <Select id="s-round" value={s.roundingMinutes} onChange={(e) => save({ roundingMinutes: Number(e.target.value) })}>
              {[0, 5, 6, 15, 30].map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? t.invoices.roundingNone : t.invoices.roundingUp(r)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.settings.taxLabel} htmlFor="s-taxl">
            <TextSetting id="s-taxl" value={s.taxLabel} placeholder="VAT" onSave={(v) => save({ taxLabel: v })} />
          </Field>
          <Field label={t.settings.taxRate} htmlFor="s-taxr">
            <NumberSetting id="s-taxr" value={s.taxRate} min={0} max={100} step={0.01} onSave={(v) => save({ taxRate: v })} />
          </Field>
          <Field label={t.settings.numberPattern} htmlFor="s-pat" hint={nextNumber ? t.settings.patternPreview(nextNumber) : t.settings.numberPatternHint}>
            <TextSetting id="s-pat" value={s.invoiceNumberPattern} onSave={(v) => save({ invoiceNumberPattern: v })} />
          </Field>
          <Field label={t.settings.nextSeq} htmlFor="s-seq" hint={t.settings.numberPatternHint}>
            <NumberSetting id="s-seq" value={s.nextInvoiceSeq} min={1} max={99999999} onSave={(v) => save({ nextInvoiceSeq: v })} />
          </Field>
          <Field label={t.settings.invoiceNotes} htmlFor="s-notes" className="col-span-2">
            <TextSetting id="s-notes" multiline value={s.defaultInvoiceNotes} onSave={(v) => save({ defaultInvoiceNotes: v })} />
          </Field>
        </Section>

        <Section title={t.settings.display}>
          <Field label={t.settings.dateFormat} htmlFor="s-df">
            <Select id="s-df" value={s.dateFormat} onChange={(e) => save({ dateFormat: e.target.value })}>
              {DATE_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {formatDate(new Date(), f)} ({f})
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.settings.numberLocale} htmlFor="s-nl" hint={formatMoney(123456789, s.defaultCurrency, prefs)}>
            <Select id="s-nl" value={s.numberLocale} onChange={(e) => save({ numberLocale: e.target.value })}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l === "" ? t.settings.systemLocale : `${l} — ${new Intl.NumberFormat(l).format(1234.5)}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.settings.timeFormat} htmlFor="s-tf">
            <Select id="s-tf" value={s.timeFormat} onChange={(e) => save({ timeFormat: e.target.value as "12h" | "24h" })}>
              <option value="24h">{t.settings.h24}</option>
              <option value="12h">{t.settings.h12}</option>
            </Select>
          </Field>
          <Field label={t.settings.weekStart} htmlFor="s-ws">
            <Select id="s-ws" value={s.weekStart} onChange={(e) => save({ weekStart: Number(e.target.value) })}>
              {t.settings.weekdaysLong.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.settings.theme} htmlFor="s-theme">
            <Select id="s-theme" value={s.theme} onChange={(e) => save({ theme: e.target.value as "light" | "dark" | "system" })}>
              {(["system", "light", "dark"] as const).map((th) => (
                <option key={th} value={th}>
                  {t.settings.themes[th]}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section title={t.settings.timer}>
          <Field label={t.settings.idle} htmlFor="s-idle" hint={t.settings.idleHint}>
            <NumberSetting id="s-idle" value={s.idleThresholdMinutes} min={0} max={240} onSave={(v) => save({ idleThresholdMinutes: v })} />
          </Field>
          <Field label={t.settings.longTimer} htmlFor="s-long" hint={t.settings.longTimerHint}>
            <NumberSetting id="s-long" value={s.longTimerHours} min={0} max={48} step={0.5} onSave={(v) => save({ longTimerHours: v })} />
          </Field>
          <Field label={t.settings.shortcut} hint={t.settings.shortcutHint} className="col-span-2">
            <ShortcutRecorder value={s.globalShortcut} onSave={(v) => save({ globalShortcut: v })} />
          </Field>
          <div className="col-span-2 flex items-center justify-between">
            <label htmlFor="s-login" className="text-[13px] font-medium">
              {t.settings.launchAtLogin}
            </label>
            <Toggle id="s-login" label={t.settings.launchAtLogin} checked={s.launchAtLogin} onChange={(v) => save({ launchAtLogin: v })} />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="s-rem" className="text-[13px] font-medium">
                  {t.settings.reminder}
                </label>
                <p className="text-xs text-muted">{t.settings.reminderHint}</p>
              </div>
              <Toggle id="s-rem" label={t.settings.reminder} checked={s.reminderEnabled} onChange={(v) => save({ reminderEnabled: v })} />
            </div>
            {s.reminderEnabled && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="time"
                  aria-label={t.settings.reminder}
                  className="w-28"
                  value={s.reminderTime}
                  onChange={(e) => e.target.value && save({ reminderTime: e.target.value })}
                />
                <span className="text-xs text-muted">{t.settings.reminderDays}</span>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const on = days.includes(String(d === 0 ? 7 : d));
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDay(d)}
                      className={cx(
                        "h-7 rounded-md border px-2 text-xs font-medium",
                        on ? "border-accent bg-accent/15 text-text" : "border-border text-muted hover:text-text",
                      )}
                    >
                      {t.settings.weekdays[d]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Section>

        <DataSection />
      </div>
    </>
  );
}
