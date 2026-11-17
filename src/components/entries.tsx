import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, type Entry, type EntryInput } from "../lib/api";
import { combine, toDateStr, toTimeStr } from "../lib/dates";
import { formatDate, formatHM, formatHMS, formatMoney, formatTime, parseDuration } from "../lib/format";
import { usePrefs, useNow } from "../lib/queries";
import { t } from "../strings";
import { EditIcon, LockIcon, PlayIcon, ScissorsIcon, TrashIcon } from "./icons";
import { ProjectPicker } from "./inputs";
import { Badge, Button, Checkbox, ColorDot, Field, IconButton, Input, Modal, cx, useUi } from "./ui";

export function SourceBadge({ source }: { source: string }) {
  if (source === "timer") return null;
  return (
    <Badge tone={source === "manual" ? "info" : "warn"} title={t.entries.sourceHint[source]}>
      {t.entries.source[source]}
    </Badge>
  );
}

export function EntryRow({
  entry,
  onEdit,
  onSplit,
  showDate,
}: {
  entry: Entry;
  onEdit: (e: Entry) => void;
  onSplit?: (e: Entry) => void;
  showDate?: boolean;
}) {
  const prefs = usePrefs();
  const ui = useUi();
  const locked = !!entry.invoiceId;
  const running = !entry.endedAt;
  const now = useNow(running ? 1000 : 60_000);
  const seconds = running ? Math.max(0, (now - new Date(entry.startedAt).getTime()) / 1000) : entry.durationSeconds;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    }
  };

  const onDelete = async () => {
    if (await ui.confirm({ title: t.common.delete, body: t.entries.deleteConfirm, confirmLabel: t.common.delete, danger: true })) {
      run(() => api.deleteEntry(entry.id));
    }
  };

  return (
    <li
      className={cx(
        "group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/60",
        !entry.billable && "opacity-80",
      )}
    >
      <ColorDot color={entry.projectColor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cx("truncate text-sm", !entry.description && "text-muted italic")}>
            {entry.description || t.common.description}
          </span>
          <SourceBadge source={entry.source} />
          {!entry.billable && <Badge>{t.common.nonBillable}</Badge>}
          {locked && (
            <Badge tone="accent" title={t.entries.lockedHint}>
              <LockIcon size={10} />
              {entry.invoiceNumber}
            </Badge>
          )}
          {running && <Badge tone="accent">{t.timer.running}</Badge>}
        </div>
        <div className="truncate text-xs text-muted">
          {entry.clientName} · {entry.projectName}
          {entry.billable && entry.rate > 0 && (
            <> · {formatMoney(Math.round((seconds * entry.rate) / 3600), entry.currency, prefs)}</>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 text-xs text-muted tabular sm:block">
        {showDate && <>{formatDate(new Date(entry.startedAt), prefs.dateFormat)} · </>}
        {formatTime(entry.startedAt, prefs.timeFormat)} – {entry.endedAt ? formatTime(entry.endedAt, prefs.timeFormat) : "…"}
      </div>
      <div className="w-16 shrink-0 text-right text-sm font-medium tabular">
        {running ? formatHMS(seconds) : formatHM(seconds)}
      </div>
      <div className="flex w-[120px] shrink-0 justify-end gap-0.5 opacity-60 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton label={t.timer.continueTip} onClick={() => run(() => api.continueEntry(entry.id))} disabled={running}>
          <PlayIcon size={13} />
        </IconButton>
        {!running && (
          <IconButton label={locked ? t.entries.lockedHint : t.common.edit} onClick={() => onEdit(entry)} disabled={locked}>
            <EditIcon size={14} />
          </IconButton>
        )}
        {onSplit && !running && (
          <IconButton label={t.entries.split} onClick={() => onSplit(entry)} disabled={locked}>
            <ScissorsIcon size={14} />
          </IconButton>
        )}
        <IconButton label={t.common.delete} onClick={onDelete} disabled={locked}>
          <TrashIcon size={14} />
        </IconButton>
      </div>
    </li>
  );
}

/** Entries grouped by local day with per-day totals. */
export function EntryDayGroups({
  entries,
  onEdit,
  onSplit,
}: {
  entries: Entry[];
  onEdit: (e: Entry) => void;
  onSplit?: (e: Entry) => void;
}) {
  const prefs = usePrefs();
  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) {
      const k = toDateStr(new Date(e.startedAt));
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [entries]);
  return (
    <div className="flex flex-col gap-4">
      {groups.map(([day, items]) => (
        <section key={day} className="overflow-hidden rounded-xl border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border bg-surface-2/50 px-4 py-2 text-[13px]">
            <span className="font-medium">
              {new Intl.DateTimeFormat(prefs.numberLocale || undefined, { weekday: "long" }).format(new Date(items[0].startedAt))}
              , {formatDate(day, prefs.dateFormat)}
            </span>
            <span className="font-medium tabular text-muted">
              {formatHM(items.reduce((s, e) => s + e.durationSeconds, 0))}
            </span>
          </header>
          <ul className="divide-y divide-border">
            {items.map((e) => (
              <EntryRow key={e.id} entry={e} onEdit={onEdit} onSplit={onSplit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Add or edit a manual entry with live validation and overlap warning. */
export function EntryFormModal({
  open,
  onClose,
  entry,
  defaultProjectId,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  entry?: Entry | null;
  defaultProjectId?: string;
  defaultDate?: string;
}) {
  const ui = useUi();
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [durationText, setDurationText] = useState("1:00");
  const [useDuration, setUseDuration] = useState(false);
  const [billable, setBillable] = useState(true);
  const [overlaps, setOverlaps] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      const s = new Date(entry.startedAt);
      const e = entry.endedAt ? new Date(entry.endedAt) : new Date();
      setProjectId(entry.projectId);
      setDescription(entry.description);
      setDate(toDateStr(s));
      setStart(toTimeStr(s));
      setEnd(toTimeStr(e));
      setDurationText(formatHM(entry.durationSeconds));
      setBillable(entry.billable);
    } else {
      const now = new Date();
      const startD = new Date(now.getTime() - 3600_000);
      setProjectId(defaultProjectId ?? "");
      setDescription("");
      setDate(defaultDate ?? toDateStr(now));
      setStart(toTimeStr(startD));
      setEnd(toTimeStr(now));
      setDurationText("1:00");
      setBillable(true);
    }
    setUseDuration(false);
  }, [open, entry, defaultProjectId, defaultDate]);

  // Resolve start/end instants. An end time earlier than start means past midnight.
  const range = useMemo(() => {
    const s = combine(date, start);
    let e: Date;
    if (useDuration) {
      const secs = parseDuration(durationText);
      if (secs === null || secs <= 0) return { error: t.entries.invalidDuration };
      e = new Date(s.getTime() + secs * 1000);
    } else {
      e = combine(date, end);
      if (e <= s) e = new Date(e.getTime() + 86_400_000);
    }
    // Keep the original seconds when the minute-level values were not touched.
    if (entry?.endedAt && toTimeStr(new Date(entry.startedAt)) === start && toDateStr(new Date(entry.startedAt)) === date) {
      s.setTime(new Date(entry.startedAt).getTime());
      if (!useDuration && toTimeStr(new Date(entry.endedAt)) === end) e = new Date(entry.endedAt);
    }
    if (e.getTime() > Date.now() + 60_000) return { error: t.entries.inFuture, s, e };
    return { s, e, seconds: (e.getTime() - s.getTime()) / 1000 };
  }, [date, start, end, durationText, useDuration, entry]);

  useEffect(() => {
    if (!open || !range.s || !range.e || range.error) return setOverlaps(0);
    let cancelled = false;
    api
      .findOverlaps(range.s.toISOString(), range.e.toISOString(), entry?.id ?? null)
      .then((r) => !cancelled && setOverlaps(r.length))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, range, entry]);

  const save = async () => {
    if (!projectId) return ui.toast(t.errors.required(t.common.project), "error");
    if (range.error || !range.s || !range.e) return;
    const input: EntryInput = {
      projectId,
      description,
      startedAt: range.s.toISOString(),
      endedAt: range.e.toISOString(),
      billable,
    };
    setSaving(true);
    try {
      const r = entry ? await api.updateEntry(entry.id, input) : await api.createEntry(input);
      if (r.overlaps.length) ui.toast(t.entries.overlapWarning(r.overlaps.length), "warn");
      onClose();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? t.entries.editEntry : t.entries.newEntry}
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={saving || !!range.error}>
            {saving ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={t.common.project} htmlFor="ef-project">
          <ProjectPicker
            id="ef-project"
            value={projectId}
            onChange={setProjectId}
            includeProject={entry ? { id: entry.projectId, name: entry.projectName, clientName: entry.clientName } : null}
          />
        </Field>
        <Field label={t.common.description} htmlFor="ef-desc">
          <Input id="ef-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t.common.date} htmlFor="ef-date">
            <Input id="ef-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={toDateStr(new Date())} />
          </Field>
          <Field label={t.common.start} htmlFor="ef-start">
            <Input id="ef-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          {useDuration ? (
            <Field label={t.common.duration} htmlFor="ef-dur" hint={t.entries.durationHint}>
              <Input id="ef-dur" value={durationText} onChange={(e) => setDurationText(e.target.value)} />
            </Field>
          ) : (
            <Field label={t.common.end} htmlFor="ef-end">
              <Input id="ef-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setUseDuration((v) => !v)}>
            {useDuration ? t.entries.useEndTime : t.entries.useDuration}
          </button>
          {range.seconds !== undefined && (
            <span className="text-xs text-muted tabular">
              {t.common.duration}: {formatHM(range.seconds)}
            </span>
          )}
        </div>
        <Checkbox checked={billable} onChange={setBillable} label={t.common.billable} />
        {range.error && (
          <p className="text-xs text-danger" role="alert">
            {range.error}
          </p>
        )}
        {!range.error && overlaps > 0 && <p className="text-xs text-warn">{t.entries.overlapPreview(overlaps)}</p>}
        {entry?.source === "timer" && <p className="text-xs text-muted">{t.entries.sourceHint.timer_edited}.</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Split an entry at a chosen time. */
export function SplitModal({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const ui = useUi();
  const prefs = usePrefs();
  const [at, setAt] = useState("");
  useEffect(() => {
    if (!entry?.endedAt) return;
    const mid = new Date((new Date(entry.startedAt).getTime() + new Date(entry.endedAt).getTime()) / 2);
    setAt(toTimeStr(mid));
  }, [entry]);
  if (!entry || !entry.endedAt) return null;
  const s = new Date(entry.startedAt);
  const e = new Date(entry.endedAt);
  let split = combine(toDateStr(s), at);
  if (split < s) split = new Date(split.getTime() + 86_400_000);
  const valid = split > s && split < e;
  const go = async () => {
    try {
      await api.splitEntry(entry.id, split.toISOString());
      onClose();
    } catch (err) {
      ui.toast(errorMessage(err), "error");
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t.entries.splitEntry}
      width={380}
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={go} disabled={!valid}>
            {t.entries.split}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {formatTime(s, prefs.timeFormat)} – {formatTime(e, prefs.timeFormat)} · {t.entries.splitHint}
        </p>
        <Field label={t.entries.splitAt} htmlFor="split-at">
          <Input id="split-at" type="time" value={at} onChange={(ev) => setAt(ev.target.value)} />
        </Field>
        {valid && (
          <p className="text-xs text-muted tabular">
            {formatHM((split.getTime() - s.getTime()) / 1000)} + {formatHM((e.getTime() - split.getTime()) / 1000)}
          </p>
        )}
      </div>
    </Modal>
  );
}
