import { useMemo, useState } from "react";
import { api, errorMessage, type Entry, type EntryFilter, type SummaryRow } from "../lib/api";
import { addDays, dateStrRange, fromDateStr, startOfDay, startOfWeek, toDateStr } from "../lib/dates";
import { formatDate, formatHM, formatMoney, formatWeekday } from "../lib/format";
import { useClients, useEntries, usePrefs, useProjects, useSummary } from "../lib/queries";
import { t } from "../strings";
import { EntryDayGroups, EntryFormModal, SplitModal } from "../components/entries";
import { ChevronLeft, ChevronRight, DownloadIcon, PlusIcon } from "../components/icons";
import { Button, Card, ColorDot, EmptyState, IconButton, Input, PageHeader, Segmented, Select, cx, useUi } from "../components/ui";

type Mode = "day" | "week" | "range";
const PAGE = 300;

function SummaryTable({ rows, title }: { rows: SummaryRow[]; title: string }) {
  const prefs = usePrefs();
  const max = Math.max(1, ...rows.map((r) => r.seconds));
  return (
    <Card>
      <h3 className="border-b border-border px-4 py-2.5 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">—</p>
      ) : (
        <ul className="py-1">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-1.5">
              <div className="flex items-center gap-2 text-sm">
                {r.color !== undefined && title === t.log.byProject && <ColorDot color={r.color} />}
                <span className="min-w-0 flex-1 truncate" title={r.name}>
                  {r.name}
                  {title === t.log.byProject && <span className="text-muted"> · {r.clientName}</span>}
                </span>
                <span className="text-xs text-muted tabular">{formatHM(r.seconds)}</span>
                <span className="w-24 text-right font-medium tabular">{formatMoney(r.amount, r.currency, prefs)}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-surface-2">
                <div className="h-1 rounded-full bg-accent/70" style={{ width: `${(r.seconds / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function WorkLogPage() {
  const prefs = usePrefs();
  const ui = useUi();
  const [mode, setMode] = useState<Mode>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [rangeFrom, setRangeFrom] = useState(() => toDateStr(addDays(new Date(), -30)));
  const [rangeTo, setRangeTo] = useState(() => toDateStr(new Date()));
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billable, setBillable] = useState<"" | "yes" | "no">("");
  const [billed, setBilled] = useState<"" | "yes" | "no">("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);
  const [splitting, setSplitting] = useState<Entry | null>(null);

  const { data: clients = [] } = useClients(true);
  const { data: projects = [] } = useProjects(clientId || null, true);

  const period = useMemo(() => {
    if (mode === "day") return { from: anchor, to: addDays(anchor, 1) };
    if (mode === "week") {
      const s = startOfWeek(anchor, prefs.weekStart);
      return { from: s, to: addDays(s, 7) };
    }
    const r = dateStrRange(rangeFrom, rangeTo);
    return { from: new Date(r.from), to: new Date(r.to) };
  }, [mode, anchor, prefs.weekStart, rangeFrom, rangeTo]);

  const filter: EntryFilter = useMemo(
    () => ({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      billable: billable === "" ? undefined : billable === "yes",
      billed: billed === "" ? undefined : billed === "yes",
      search: search.trim() || undefined,
    }),
    [period, clientId, projectId, billable, billed, search],
  );

  const { data: entries = [], isLoading } = useEntries({ ...filter, limit, offset: 0 });
  const { data: summary } = useSummary(filter);

  const step = (dir: number) => {
    setLimit(PAGE);
    setAnchor((a) => addDays(a, mode === "day" ? dir : dir * 7));
  };

  const periodLabel =
    mode === "day"
      ? `${formatWeekday(anchor, prefs)}, ${formatDate(anchor, prefs.dateFormat)}`
      : `${formatDate(period.from, prefs.dateFormat)} – ${formatDate(addDays(period.to, -1), prefs.dateFormat)}`;

  const weekDays = useMemo(() => {
    if (mode !== "week") return [];
    return Array.from({ length: 7 }, (_, i) => addDays(period.from, i));
  }, [mode, period.from]);
  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const k = toDateStr(new Date(e.startedAt));
      m.set(k, (m.get(k) ?? 0) + e.durationSeconds);
    }
    return m;
  }, [entries]);

  const exportCsv = async () => {
    try {
      const name = `hourmint-entries-${toDateStr(period.from)}-to-${toDateStr(addDays(period.to, -1))}.csv`;
      const p = await api.exportEntriesCsv(filter, name);
      if (p) ui.toast(t.log.exported(p));
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    }
  };

  return (
    <>
      <PageHeader
        title={t.log.title}
        actions={
          <>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon size={14} /> {t.entries.addEntry}
            </Button>
            <Button onClick={exportCsv}>
              <DownloadIcon size={14} /> {t.log.exportCsv}
            </Button>
          </>
        }
      >
        <Segmented
          label={t.log.range}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setLimit(PAGE);
          }}
          options={[
            { value: "day", label: t.log.day },
            { value: "week", label: t.log.week },
            { value: "range", label: t.log.range },
          ]}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        {mode !== "range" ? (
          <div className="flex items-center gap-1">
            <IconButton label={t.log.previous} onClick={() => step(-1)}>
              <ChevronLeft />
            </IconButton>
            <IconButton label={t.log.nextPeriod} onClick={() => step(1)}>
              <ChevronRight />
            </IconButton>
            <span className="ml-1 min-w-[190px] text-sm font-medium">{periodLabel}</span>
            <Button size="sm" variant="ghost" onClick={() => setAnchor(startOfDay(new Date()))}>
              {mode === "day" ? t.log.today : t.log.thisWeek}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="log-from" className="text-muted">{t.log.from}</label>
            <Input id="log-from" type="date" className="w-36" value={rangeFrom} onChange={(e) => e.target.value && setRangeFrom(e.target.value)} />
            <label htmlFor="log-to" className="text-muted">{t.log.to}</label>
            <Input id="log-to" type="date" className="w-36" value={rangeTo} min={rangeFrom} onChange={(e) => e.target.value && setRangeTo(e.target.value)} />
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select aria-label={t.common.client} className="w-40" value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }}>
            <option value="">{t.log.allClients}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archivedAt ? ` (${t.common.archived})` : ""}
              </option>
            ))}
          </Select>
          <Select aria-label={t.common.project} className="w-40" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{t.log.allProjects}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {clientId ? p.name : `${p.clientName} · ${p.name}`}
              </option>
            ))}
          </Select>
          <Select aria-label={t.common.billable} className="w-52" value={billable} onChange={(e) => setBillable(e.target.value as "" | "yes" | "no")}>
            <option value="">{t.log.anyBillable}</option>
            <option value="yes">{t.common.billable}</option>
            <option value="no">{t.common.nonBillable}</option>
          </Select>
          <Select aria-label={t.common.billed} className="w-40" value={billed} onChange={(e) => setBilled(e.target.value as "" | "yes" | "no")}>
            <option value="">{t.log.anyBilled}</option>
            <option value="yes">{t.common.billed}</option>
            <option value="no">{t.common.unbilled}</option>
          </Select>
          <Input aria-label={t.common.search} placeholder={t.common.search} className="w-40" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6 xl:flex-row">
        <div className="min-w-0 flex-1">
          {mode === "week" && (
            <div className="mb-4 grid grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const k = toDateStr(d);
                const secs = perDay.get(k) ?? 0;
                const isToday = k === toDateStr(new Date());
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setMode("day");
                      setAnchor(fromDateStr(k));
                    }}
                    className={cx(
                      "rounded-lg border border-border bg-surface px-2 py-2 text-left hover:bg-surface-2",
                      isToday && "ring-1 ring-accent",
                    )}
                  >
                    <span className="block text-[11px] text-muted">{formatWeekday(d, prefs, "short")} {d.getDate()}</span>
                    <span className={cx("block text-sm font-semibold tabular", secs === 0 && "text-muted")}>{formatHM(secs)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {isLoading ? null : entries.length === 0 ? (
            <Card>
              <EmptyState title={t.entries.emptyFiltered} />
            </Card>
          ) : (
            <>
              <EntryDayGroups entries={entries} onEdit={setEditing} onSplit={setSplitting} />
              {entries.length >= limit && (
                <div className="mt-4 flex justify-center">
                  <Button onClick={() => setLimit((l) => l + PAGE)}>{t.log.loadMore}</Button>
                </div>
              )}
            </>
          )}
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-80">
          <Card className="p-4">
            <p className="text-xs text-muted">{mode === "week" ? t.log.weekTotal : mode === "day" ? t.log.dayTotal : t.common.total}</p>
            <p className="text-2xl font-semibold tabular">{formatHM(summary?.totalSeconds ?? 0)}</p>
            <p className="mt-1 text-xs text-muted">
              {t.common.billable}: {formatHM(summary?.billableSeconds ?? 0)} · {t.log.entries(summary?.entryCount ?? 0)}
            </p>
            {summary?.amounts.map((a) => (
              <p key={a.currency} className="mt-2 text-lg font-semibold tabular">
                {formatMoney(a.amount, a.currency, prefs)}
              </p>
            ))}
          </Card>
          <SummaryTable title={t.log.byClient} rows={summary?.byClient ?? []} />
          <SummaryTable title={t.log.byProject} rows={summary?.byProject ?? []} />
        </aside>
      </div>

      <EntryFormModal
        open={adding || !!editing}
        entry={editing}
        defaultProjectId={projectId || undefined}
        defaultDate={mode === "day" ? toDateStr(anchor) : undefined}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <SplitModal entry={splitting} onClose={() => setSplitting(null)} />
    </>
  );
}
