import { useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { dayRange } from "../lib/dates";
import { formatHM } from "../lib/format";
import { useEntries, useNow, useRecent, useRunning, useSettingsValue } from "../lib/queries";
import { displayShortcut } from "../lib/shortcut";
import { t } from "../strings";
import { TimerBar } from "../components/TimerBar";
import { ExternalIcon, PlayIcon } from "../components/icons";
import { Button, ColorDot, useUi } from "../components/ui";

/** MB-2: menu bar popover. */
export function Popover() {
  const ui = useUi();
  const qc = useQueryClient();
  const settings = useSettingsValue();
  const now = useNow(1000);
  const today = useMemo(() => dayRange(new Date()), [Math.floor(now / 60_000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: entries = [] } = useEntries({ ...today, limit: 1000 });
  const { data: running } = useRunning();
  const { data: recent = [] } = useRecent(6);

  // Refresh whenever the popover is shown (it stays alive while hidden).
  useEffect(() => {
    const un = listen("popover-shown", () => qc.invalidateQueries());
    return () => {
      un.then((f) => f());
    };
  }, [qc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") api.hidePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runningToday = running && running.startedAt >= today.from;
  const total =
    entries.reduce((s, e) => s + e.durationSeconds, 0) +
    (runningToday ? Math.max(0, (now - new Date(running.startedAt).getTime()) / 1000) : 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-surface text-text">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold">{t.appName}</span>
        <span className="text-xs text-muted">
          {t.timer.todayTotal} <span className="font-semibold text-text tabular">{formatHM(total)}</span>
        </span>
      </header>
      <div className="border-b border-border p-3">
        <TimerBar compact />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{t.timer.quickStart}</p>
        {recent.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted">{t.timer.noRecent}</p>
        ) : (
          <ul>
            {recent.map((r) => (
              <li key={`${r.projectId}|${r.description}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-1.5 text-left hover:bg-surface-2"
                  onClick={() => api.startTimer({ projectId: r.projectId, description: r.description }).catch((e) => ui.toast(errorMessage(e), "error"))}
                >
                  <ColorDot color={r.projectColor} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{r.description || r.projectName}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {r.clientName} · {r.projectName}
                    </span>
                  </span>
                  <PlayIcon size={11} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-border px-3 py-2">
        <Button size="sm" variant="ghost" onClick={() => api.showMainWindow()}>
          <ExternalIcon size={12} /> {t.popover.openApp}
        </Button>
        {settings.globalShortcut && <span className="text-[11px] text-muted">{displayShortcut(settings.globalShortcut)}</span>}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => api.quitApp()}>
          {t.popover.quit}
        </Button>
      </footer>
    </div>
  );
}
