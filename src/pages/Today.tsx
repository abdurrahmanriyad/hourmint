import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage, type Entry } from "../lib/api";
import { dayRange, startOfWeek, addDays } from "../lib/dates";
import { formatDate, formatHM, formatMoney } from "../lib/format";
import { displayShortcut } from "../lib/shortcut";
import { useClients, useEntries, useNow, usePrefs, useRecent, useRunning, useSettingsValue, useSummary } from "../lib/queries";
import { t } from "../strings";
import { TimerBar } from "../components/TimerBar";
import { EntryFormModal, EntryRow, SplitModal } from "../components/entries";
import { PlayIcon, PlusIcon, XIcon } from "../components/icons";
import { Button, Card, ColorDot, EmptyState, IconButton, PageHeader, useUi } from "../components/ui";

const HINT_KEY = "hourmint.hint.menubar.dismissed";

export function TodayPage() {
  const prefs = usePrefs();
  const settings = useSettingsValue();
  const ui = useUi();
  const now = useNow(1000);
  const today = useMemo(() => dayRange(new Date()), [Math.floor(now / 60_000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const week = useMemo(() => {
    const s = startOfWeek(new Date(), prefs.weekStart);
    return { from: s.toISOString(), to: addDays(s, 7).toISOString() };
  }, [prefs.weekStart, today.from]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: entries = [] } = useEntries({ ...today, includeRunning: true, limit: 500 });
  const { data: weekSummary } = useSummary(week);
  const { data: running } = useRunning();
  const { data: recent = [] } = useRecent(8);
  const { data: clients = [] } = useClients();

  const [editing, setEditing] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);
  const [splitting, setSplitting] = useState<Entry | null>(null);
  const [hintHidden, setHintHidden] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) === "1";
    } catch {
      return false;
    }
  });

  const runningElapsed = running ? Math.max(0, (now - new Date(running.startedAt).getTime()) / 1000) : 0;
  const runningToday = running && running.startedAt >= today.from;
  const todayTotal = entries.filter((e) => e.endedAt).reduce((s, e) => s + e.durationSeconds, 0) + (runningToday ? runningElapsed : 0);
  const weekTotal = (weekSummary?.totalSeconds ?? 0) + (running ? runningElapsed : 0);
  const unbilled = clients.filter((c) => c.unbilledSeconds > 0);

  const dismissHint = () => {
    setHintHidden(true);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <PageHeader
        title={`${t.nav.today}, ${formatDate(new Date(), prefs.dateFormat)}`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <PlusIcon size={14} /> {t.timer.addManual}
          </Button>
        }
      />
      <div className="flex flex-col gap-5 p-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <TimerBar />

          {!hintHidden && (
            <div className="flex items-start gap-3 rounded-xl border border-mint-500/30 bg-mint-500/8 px-4 py-3 text-sm">
              <div className="flex-1">
                <p>{t.onboarding.menuBarHint}</p>
                {settings.globalShortcut && (
                  <p className="mt-1 text-muted">{t.onboarding.shortcutHint(displayShortcut(settings.globalShortcut))}</p>
                )}
              </div>
              <IconButton label={t.common.close} onClick={dismissHint}>
                <XIcon size={14} />
              </IconButton>
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">{t.timer.today}</h2>
              <span className="text-sm font-semibold tabular">{formatHM(todayTotal)}</span>
            </header>
            {entries.length === 0 ? (
              <EmptyState title={t.entries.empty} />
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <EntryRow key={e.id} entry={e} onEdit={setEditing} onSplit={setSplitting} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-72">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted">{t.timer.todayTotal}</p>
                <p className="text-xl font-semibold tabular">{formatHM(todayTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t.log.thisWeek}</p>
                <p className="text-xl font-semibold tabular">{formatHM(weekTotal)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="border-b border-border px-4 py-2.5 text-sm font-semibold">{t.timer.quickStart}</h2>
            {recent.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted">{t.timer.noRecent}</p>
            ) : (
              <ul className="py-1">
                {recent.map((r) => (
                  <li key={`${r.projectId}|${r.description}`}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-4 py-1.5 text-left hover:bg-surface-2"
                      onClick={() =>
                        api.startTimer({ projectId: r.projectId, description: r.description }).catch((e) => ui.toast(errorMessage(e), "error"))
                      }
                    >
                      <ColorDot color={r.projectColor} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{r.description || r.projectName}</span>
                        <span className="block truncate text-xs text-muted">
                          {r.clientName} · {r.projectName}
                        </span>
                      </span>
                      <PlayIcon size={12} className="text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="border-b border-border px-4 py-2.5 text-sm font-semibold">{t.clients.unbilled}</h2>
            {unbilled.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted">—</p>
            ) : (
              <ul className="py-1">
                {unbilled.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clients/${c.id}`} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-surface-2">
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted tabular">{formatHM(c.unbilledSeconds)}</span>
                      <span className="w-24 text-right font-medium tabular">{formatMoney(c.unbilledAmount, c.currency, prefs)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <EntryFormModal open={adding || !!editing} entry={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      <SplitModal entry={splitting} onClose={() => setSplitting(null)} />
    </>
  );
}
