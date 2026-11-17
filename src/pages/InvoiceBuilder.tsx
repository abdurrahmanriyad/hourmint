import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  errorMessage,
  type DiscountType,
  type Entry,
  type Grouping,
  type Invoice,
  type InvoiceComputation,
  type InvoiceDetail,
  type InvoiceInput,
  type InvoiceLine,
} from "../lib/api";
import { addDaysStr, dateStrRange, startOfMonth, toDateStr } from "../lib/dates";
import { formatDate, formatHM, formatMoney, formatNumber, formatTime } from "../lib/format";
import { exportInvoicePdf } from "../lib/pdf/export";
import { useClients, usePrefs, useSettingsValue } from "../lib/queries";
import { t } from "../strings";
import { CopyIcon, DownloadIcon, LockIcon, TrashIcon } from "../components/icons";
import { MoneyInput } from "../components/inputs";
import { SourceBadge } from "../components/entries";
import { Badge, Button, Card, Checkbox, Field, Input, PageHeader, Select, Textarea, cx, useUi } from "../components/ui";
import { StatusBadge } from "./Invoices";

const ROUNDING = [0, 5, 6, 15, 30];

interface Config {
  grouping: Grouping;
  roundingMinutes: number;
  discountType: DiscountType;
  discountValue: number;
  taxLabel: string;
  taxRate: number;
  notes: string;
  includeTimesheet: boolean;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** HTML live preview that mirrors the PDF layout. */
function Preview({
  invoice,
  lines,
  totals,
  number,
}: {
  invoice: Pick<Invoice, "currency" | "issueDate" | "dueDate" | "periodStart" | "periodEnd" | "taxLabel" | "taxRate" | "discountType" | "discountValue" | "notes"> & {
    sender: Invoice["senderSnapshot"];
    client: Invoice["clientSnapshot"];
  };
  lines: InvoiceLine[];
  totals: Pick<InvoiceComputation, "subtotal" | "discountAmount" | "taxAmount" | "total">;
  number: string;
}) {
  const prefs = usePrefs();
  const money = (n: number) => formatMoney(n, invoice.currency, prefs);
  return (
    <div className="mx-auto w-full max-w-[640px] rounded-lg bg-white p-8 text-[12px] leading-relaxed text-neutral-900 shadow-md ring-1 ring-black/5">
      <div className="mb-6 flex items-start justify-between">
        <p className="text-base font-bold">{invoice.sender.businessName || "—"}</p>
        <div className="text-right">
          <p className="text-xl font-bold tracking-wide text-mint-700">{t.invoices.invoice.toUpperCase()}</p>
          <p className="font-semibold">{number}</p>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-4">
        <div>
          <p className="mb-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{t.invoices.from}</p>
          <p className="font-semibold">{invoice.sender.businessName}</p>
          <p className="whitespace-pre-line text-neutral-700">{[invoice.sender.address, invoice.sender.email].filter(Boolean).join("\n")}</p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{t.invoices.billTo}</p>
          <p className="font-semibold">{invoice.client.name}</p>
          <p className="whitespace-pre-line text-neutral-700">
            {[invoice.client.contactName, invoice.client.billingAddress, invoice.client.email].filter(Boolean).join("\n")}
          </p>
        </div>
        <div className="text-neutral-700">
          <p className="flex justify-between">
            <span className="text-neutral-500">{t.invoices.issueDate}</span> {formatDate(invoice.issueDate, prefs.dateFormat)}
          </p>
          <p className="flex justify-between">
            <span className="text-neutral-500">{t.invoices.dueDate}</span>
            <span className="font-semibold">{formatDate(invoice.dueDate, prefs.dateFormat)}</span>
          </p>
          {invoice.periodStart && invoice.periodEnd && (
            <p className="flex justify-between gap-2">
              <span className="text-neutral-500">{t.invoices.period}</span>
              <span className="whitespace-nowrap text-right">
                {formatDate(invoice.periodStart, prefs.dateFormat)} – {formatDate(invoice.periodEnd, prefs.dateFormat)}
              </span>
            </p>
          )}
        </div>
      </div>
      <table className="w-full border-t border-neutral-900">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-[10px] uppercase tracking-wider text-neutral-500">
            <th className="py-1.5 font-semibold">{t.invoices.lineDescription}</th>
            <th className="py-1.5 text-right font-semibold">{t.invoices.qty}</th>
            <th className="py-1.5 text-right font-semibold">{t.common.rate}</th>
            <th className="py-1.5 text-right font-semibold">{t.common.amount}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-neutral-500">
                {t.invoices.noLines}
              </td>
            </tr>
          )}
          {lines.map((l) => (
            <tr key={l.position} className="border-b border-neutral-100 align-top">
              <td className="py-1.5 pr-3">{l.description}</td>
              <td className="py-1.5 text-right tabular-nums">{formatHM(l.quantitySeconds)}</td>
              <td className="py-1.5 text-right tabular-nums">{money(l.rate)}</td>
              <td className="py-1.5 text-right tabular-nums">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-3 w-64 tabular-nums">
        <p className="flex justify-between py-0.5">
          <span className="text-neutral-500">{t.invoices.subtotal}</span> {money(totals.subtotal)}
        </p>
        {totals.discountAmount > 0 && (
          <p className="flex justify-between py-0.5">
            <span className="text-neutral-500">
              {t.invoices.discount}
              {invoice.discountType === "percent" ? ` (${formatNumber(invoice.discountValue, prefs, 3)}%)` : ""}
            </span>
            −{money(totals.discountAmount)}
          </p>
        )}
        {invoice.taxRate > 0 && (
          <p className="flex justify-between py-0.5">
            <span className="text-neutral-500">
              {invoice.taxLabel || t.invoices.tax} ({formatNumber(invoice.taxRate, prefs, 3)}%)
            </span>
            {money(totals.taxAmount)}
          </p>
        )}
        <p className="mt-1 flex justify-between border-t border-neutral-900 pt-1.5 text-[14px] font-bold">
          <span>{t.invoices.totalDue}</span> {money(totals.total)}
        </p>
      </div>
      {invoice.notes.trim() && (
        <div className="mt-6 border-t border-neutral-200 pt-3">
          <p className="mb-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{t.common.notes}</p>
          <p className="whitespace-pre-line text-neutral-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}

function CandidateList({
  entries,
  selected,
  onToggle,
  onAll,
  disabled,
}: {
  entries: Entry[];
  selected: Set<string>;
  onToggle: (id: string, v: boolean) => void;
  onAll: (v: boolean) => void;
  disabled?: boolean;
}) {
  const prefs = usePrefs();
  const selSecs = entries.filter((e) => selected.has(e.id)).reduce((s, e) => s + e.durationSeconds, 0);
  return (
    <Card className="overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">{t.invoices.selectEntries}</h3>
        <span className="text-xs text-muted">
          {t.invoices.selectedCount(entries.filter((e) => selected.has(e.id)).length, entries.length)} · {formatHM(selSecs)}
        </span>
        {!disabled && entries.length > 0 && (
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onAll(true)}>
              {t.invoices.selectAll}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAll(false)}>
              {t.invoices.selectNone}
            </Button>
          </div>
        )}
      </header>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">{t.invoices.noCandidates}</p>
      ) : (
        <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id}>
              <label className={cx("flex items-center gap-3 px-4 py-2", !disabled && "hover:bg-surface-2/60")}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={selected.has(e.id)}
                  disabled={disabled}
                  onChange={(ev) => onToggle(e.id, ev.target.checked)}
                />
                <span className="w-24 shrink-0 text-xs text-muted tabular">
                  {formatDate(new Date(e.startedAt), prefs.dateFormat)}
                  <br />
                  {formatTime(e.startedAt, prefs.timeFormat)}–{e.endedAt && formatTime(e.endedAt, prefs.timeFormat)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm">{e.description || <i className="text-muted">{e.projectName}</i>}</span>
                    <SourceBadge source={e.source} />
                  </span>
                  <span className="block text-xs text-muted">{e.projectName}</span>
                </span>
                <span className="text-sm tabular">{formatHM(e.durationSeconds)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function InvoiceBuilderPage() {
  const { id: routeId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const ui = useUi();
  const prefs = usePrefs();
  const settings = useSettingsValue();
  const { data: clients = [] } = useClients(false);
  const { data: allClients = [] } = useClients(true);

  const invoiceId = routeId && routeId !== "new" ? routeId : null;
  const { data: detail } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => api.getInvoice(invoiceId!),
    enabled: !!invoiceId,
  });

  const today = toDateStr(new Date());
  const [clientId, setClientId] = useState(search.get("client") ?? "");
  const [periodFrom, setPeriodFrom] = useState(toDateStr(startOfMonth(new Date())));
  const [periodTo, setPeriodTo] = useState(today);
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDaysStr(today, settings.paymentTermsDays));
  const [config, setConfig] = useState<Config>({
    grouping: "entry",
    roundingMinutes: settings.roundingMinutes,
    discountType: "none",
    discountValue: 0,
    taxLabel: settings.taxLabel,
    taxRate: settings.taxRate,
    notes: settings.defaultInvoiceNotes,
    includeTimesheet: true,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const isDraft = !invoiceId || detail?.invoice.status === "draft";
  const readOnly = !!invoiceId && !!detail && detail.invoice.status !== "draft";
  const client = allClients.find((c) => c.id === clientId);
  const currency = client?.currency ?? settings.defaultCurrency;

  // Load an existing invoice into the form.
  useEffect(() => {
    if (!detail || loadedFor.current === detail.invoice.updatedAt) return;
    loadedFor.current = detail.invoice.updatedAt;
    const inv = detail.invoice;
    setClientId(inv.clientId);
    setNumber(inv.number);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    if (inv.periodStart) setPeriodFrom(inv.periodStart);
    if (inv.periodEnd) setPeriodTo(inv.periodEnd);
    setConfig({
      grouping: inv.grouping,
      roundingMinutes: inv.roundingMinutes,
      discountType: inv.discountType,
      discountValue: inv.discountValue,
      taxLabel: inv.taxLabel,
      taxRate: inv.taxRate,
      notes: inv.notes,
      includeTimesheet: inv.includeTimesheet,
    });
    const ids = new Set(detail.entries.map((e) => e.id));
    setSelected(ids);
    seen.current = new Set(ids);
  }, [detail]);

  // Copy settings from another invoice.
  const copyFrom = search.get("copy");
  useEffect(() => {
    if (!copyFrom || invoiceId) return;
    api.getInvoice(copyFrom).then((d) => {
      const inv = d.invoice;
      setClientId(inv.clientId);
      setConfig({
        grouping: inv.grouping,
        roundingMinutes: inv.roundingMinutes,
        discountType: inv.discountType,
        discountValue: inv.discountValue,
        taxLabel: inv.taxLabel,
        taxRate: inv.taxRate,
        notes: inv.notes,
        includeTimesheet: inv.includeTimesheet,
      });
    });
  }, [copyFrom, invoiceId]);

  // For a new invoice, default the period to start at the oldest unbilled entry.
  useEffect(() => {
    if (invoiceId || !clientId) return;
    api.invoiceCandidates(clientId, null, null, null).then((all) => {
      if (all.length) {
        const first = all.reduce((min, e) => (e.startedAt < min ? e.startedAt : min), all[0].startedAt);
        const oldest = toDateStr(new Date(first));
        setPeriodFrom(oldest);
        setPeriodTo(today);
      }
    });
  }, [clientId, invoiceId, today]);

  const range = useMemo(() => (periodFrom && periodTo ? dateStrRange(periodFrom, periodTo) : null), [periodFrom, periodTo]);
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates", clientId, range?.from, range?.to, invoiceId],
    queryFn: () => api.invoiceCandidates(clientId, range!.from, range!.to, invoiceId),
    enabled: !!clientId && !!range && isDraft,
  });
  const entries = readOnly ? (detail?.entries ?? []) : candidates;

  // Newly visible candidates are selected by default; explicit deselections stick.
  useEffect(() => {
    if (readOnly) return;
    const fresh = candidates.filter((e) => !seen.current.has(e.id));
    if (fresh.length === 0) return;
    fresh.forEach((e) => seen.current.add(e.id));
    setSelected((s) => new Set([...s, ...fresh.map((e) => e.id)]));
  }, [candidates, readOnly]);

  const visibleSelected = useMemo(() => entries.filter((e) => selected.has(e.id)).map((e) => e.id), [entries, selected]);

  const { data: suggestedNumber } = useQuery({
    queryKey: ["nextNumber", issueDate],
    queryFn: () => api.nextInvoiceNumber(issueDate),
    enabled: !invoiceId && /^\d{4}-\d{2}-\d{2}$/.test(issueDate),
  });

  const input: InvoiceInput | null = clientId
    ? {
        id: invoiceId,
        clientId,
        number: number.trim() || null,
        issueDate,
        dueDate,
        periodStart: periodFrom || null,
        periodEnd: periodTo || null,
        ...config,
        entryIds: visibleSelected,
      }
    : null;
  const debouncedInput = useDebounced(input, 150);
  const { data: preview } = useQuery({
    queryKey: ["invoicePreview", debouncedInput],
    queryFn: () => api.previewInvoice(debouncedInput!),
    enabled: !!debouncedInput && !readOnly,
    placeholderData: (prev) => prev,
  });

  const setC = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => ({ ...c, [k]: v }));

  const saveDraft = async (): Promise<InvoiceDetail | null> => {
    if (!input) {
      ui.toast(t.invoices.chooseClient, "error");
      return null;
    }
    const saved = await api.saveInvoice(input);
    if (!invoiceId) navigate(`/invoices/${saved.invoice.id}`, { replace: true });
    return saved;
  };

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const onSave = () =>
    act("save", async () => {
      if (await saveDraft()) ui.toast(t.invoices.saved);
    });

  const onExport = () =>
    act("pdf", async () => {
      const d = readOnly ? detail! : await saveDraft();
      if (!d) return;
      const path = await exportInvoicePdf(d, prefs, settings.timesheetShowSource);
      if (path) ui.toast(t.invoices.pdfSaved(path));
    });

  const onStatus = (status: "draft" | "sent" | "paid") =>
    act(status, async () => {
      let id = invoiceId;
      if (status !== "draft" && isDraft) {
        const d = await saveDraft();
        if (!d) return;
        id = d.invoice.id;
      }
      if (id) await api.setInvoiceStatus(id, status);
    });

  const onDelete = async () => {
    if (!invoiceId) return navigate("/invoices");
    if (await ui.confirm({ title: t.common.delete, body: t.invoices.deleteConfirm, confirmLabel: t.common.delete, danger: true }))
      act("delete", async () => {
        await api.deleteInvoice(invoiceId);
        navigate("/invoices");
      });
  };

  const sender = readOnly
    ? detail!.invoice.senderSnapshot
    : { businessName: settings.businessName, address: settings.address, email: settings.email, phone: settings.phone, taxId: settings.taxId, logoPath: settings.logoPath };
  const clientSnap = readOnly
    ? detail!.invoice.clientSnapshot
    : { name: client?.name ?? "", contactName: client?.contactName ?? "", email: client?.email ?? "", billingAddress: client?.billingAddress ?? "" };
  const lines = readOnly ? detail!.lines : (preview?.lines ?? []);
  const totals = readOnly ? detail!.invoice : (preview ?? { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 });
  const shownNumber = number.trim() || suggestedNumber || "—";

  if (invoiceId && !detail) return null;

  return (
    <>
      <PageHeader
        title={invoiceId ? `${t.invoices.invoice} ${detail?.invoice.number ?? ""}` : t.invoices.new}
        actions={
          <>
            {invoiceId && (
              <Button variant="ghost" onClick={() => navigate(`/invoices/new?client=${clientId}&copy=${invoiceId}`)}>
                <CopyIcon size={14} /> {t.invoices.duplicate}
              </Button>
            )}
            {invoiceId && (
              <Button variant="ghost" onClick={onDelete} disabled={!!busy} aria-label={t.common.delete}>
                <TrashIcon size={14} />
              </Button>
            )}
            {isDraft && (
              <Button onClick={onSave} disabled={!!busy || !clientId}>
                {busy === "save" ? t.common.saving : t.invoices.saveDraft}
              </Button>
            )}
            <Button onClick={onExport} disabled={!!busy || !clientId || (!readOnly && visibleSelected.length === 0)}>
              <DownloadIcon size={14} /> {busy === "pdf" ? t.invoices.exporting : t.invoices.exportPdf}
            </Button>
            {isDraft && (
              <Button variant="primary" onClick={() => onStatus("sent")} disabled={!!busy || !clientId || visibleSelected.length === 0} title={t.invoices.finalizeHint}>
                {t.invoices.markSent}
              </Button>
            )}
            {detail?.invoice.status === "sent" && (
              <Button variant="primary" onClick={() => onStatus("paid")} disabled={!!busy}>
                {t.invoices.markPaid}
              </Button>
            )}
            {readOnly && (
              <Button onClick={() => onStatus("draft")} disabled={!!busy}>
                {t.invoices.backToDraft}
              </Button>
            )}
          </>
        }
      >
        {detail && <StatusBadge invoice={detail.invoice} />}
      </PageHeader>

      {readOnly && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-2/50 px-6 py-2 text-xs text-muted">
          <LockIcon size={12} /> {t.invoices.readOnly} · {t.invoices.lockedEntries(detail!.entries.length)}
        </div>
      )}

      <div className="flex flex-col gap-5 p-6 2xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
            <Field label={t.common.client} htmlFor="ib-client" className="col-span-2">
              <Select
                id="ib-client"
                value={clientId}
                disabled={!!invoiceId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setSelected(new Set());
                  seen.current = new Set();
                }}
              >
                <option value="" disabled>
                  {t.invoices.chooseClient}
                </option>
                {(invoiceId ? allClients : clients).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.log.from} htmlFor="ib-from">
              <Input id="ib-from" type="date" value={periodFrom} disabled={readOnly} onChange={(e) => e.target.value && setPeriodFrom(e.target.value)} />
            </Field>
            <Field label={t.log.to} htmlFor="ib-to">
              <Input id="ib-to" type="date" value={periodTo} min={periodFrom} disabled={readOnly} onChange={(e) => e.target.value && setPeriodTo(e.target.value)} />
            </Field>
            <Field label={t.invoices.number} htmlFor="ib-number" hint={!invoiceId ? t.invoices.numberHint : undefined}>
              <Input id="ib-number" value={number} placeholder={suggestedNumber} disabled={readOnly} onChange={(e) => setNumber(e.target.value)} />
            </Field>
            <Field label={t.invoices.issueDate} htmlFor="ib-issue">
              <Input
                id="ib-issue"
                type="date"
                value={issueDate}
                disabled={readOnly}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setIssueDate(e.target.value);
                  setDueDate(addDaysStr(e.target.value, settings.paymentTermsDays));
                }}
              />
            </Field>
            <Field label={t.invoices.dueDate} htmlFor="ib-due">
              <Input id="ib-due" type="date" value={dueDate} min={issueDate} disabled={readOnly} onChange={(e) => e.target.value && setDueDate(e.target.value)} />
            </Field>
            <Field label={t.invoices.grouping} htmlFor="ib-group">
              <Select id="ib-group" value={config.grouping} disabled={readOnly} onChange={(e) => setC("grouping", e.target.value as Grouping)}>
                {(["entry", "day", "project"] as const).map((g) => (
                  <option key={g} value={g}>
                    {t.invoices.groupings[g]}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>

          {clientId && (
            <CandidateList
              entries={entries}
              selected={selected}
              disabled={readOnly}
              onToggle={(id, v) =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (v) n.add(id);
                  else n.delete(id);
                  return n;
                })
              }
              onAll={(v) => setSelected(v ? new Set(entries.map((e) => e.id)) : new Set())}
            />
          )}

          <Card className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
            <Field label={t.invoices.rounding} htmlFor="ib-round" className="col-span-2">
              <Select id="ib-round" value={config.roundingMinutes} disabled={readOnly} onChange={(e) => setC("roundingMinutes", Number(e.target.value))}>
                {ROUNDING.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? t.invoices.roundingNone : t.invoices.roundingUp(r)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.invoices.discount} htmlFor="ib-disc">
              <Select
                id="ib-disc"
                value={config.discountType}
                disabled={readOnly}
                onChange={(e) => setConfig((c) => ({ ...c, discountType: e.target.value as DiscountType, discountValue: 0 }))}
              >
                {(["none", "percent", "fixed"] as const).map((d) => (
                  <option key={d} value={d}>
                    {t.invoices.discountTypes[d]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={config.discountType === "percent" ? "%" : t.common.amount} htmlFor="ib-discv">
              {config.discountType === "fixed" ? (
                <MoneyInput id="ib-discv" value={config.discountValue} currency={currency} onChange={(v) => setC("discountValue", v ?? 0)} />
              ) : (
                <Input
                  id="ib-discv"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  disabled={readOnly || config.discountType === "none"}
                  value={config.discountType === "none" ? "" : config.discountValue}
                  onChange={(e) => setC("discountValue", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                />
              )}
            </Field>
            <Field label={t.invoices.taxLabel} htmlFor="ib-taxl">
              <Input id="ib-taxl" value={config.taxLabel} disabled={readOnly} placeholder="VAT" onChange={(e) => setC("taxLabel", e.target.value)} />
            </Field>
            <Field label={t.invoices.taxRate} htmlFor="ib-taxr">
              <Input
                id="ib-taxr"
                type="number"
                min={0}
                max={100}
                step="0.01"
                disabled={readOnly}
                value={config.taxRate}
                onChange={(e) => setC("taxRate", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </Field>
            <div className="col-span-2 flex flex-col justify-end gap-2 pb-1">
              <Checkbox checked={config.includeTimesheet} disabled={readOnly} onChange={(v) => setC("includeTimesheet", v)} label={t.invoices.includeTimesheet} />
              <Checkbox
                checked={settings.timesheetShowSource}
                onChange={(v) => api.updateSettings({ timesheetShowSource: v }).catch((e) => ui.toast(errorMessage(e), "error"))}
                label={t.invoices.showSource}
              />
            </div>
            <Field label={t.invoices.notes} htmlFor="ib-notes" className="col-span-2 lg:col-span-4">
              <Textarea id="ib-notes" rows={3} value={config.notes} disabled={readOnly} onChange={(e) => setC("notes", e.target.value)} />
            </Field>
          </Card>
        </div>

        <div className="w-full shrink-0 2xl:w-[660px]">
          <div className="sticky top-4 flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{t.invoices.preview}</h3>
              {config.includeTimesheet && <Badge>+ {t.invoices.timesheet}</Badge>}
            </div>
            <div className="rounded-xl bg-surface-2 p-4">
              <Preview
                number={shownNumber}
                lines={lines}
                totals={totals}
                invoice={{
                  currency,
                  issueDate,
                  dueDate,
                  periodStart: periodFrom,
                  periodEnd: periodTo,
                  taxLabel: config.taxLabel,
                  taxRate: config.taxRate,
                  discountType: config.discountType,
                  discountValue: config.discountValue,
                  notes: config.notes,
                  sender,
                  client: clientSnap,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
