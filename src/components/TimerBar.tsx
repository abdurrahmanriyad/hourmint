import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { formatHMS, formatTime } from "../lib/format";
import { useNow, usePrefs, useProjects, useRecent, useRunning, useSettingsValue } from "../lib/queries";
import { t } from "../strings";
import { AlertIcon, PlayIcon, StopIcon } from "./icons";
import { ProjectPicker } from "./inputs";
import { Button, ColorDot, Input, Toggle, cx, useUi } from "./ui";

/** Start form or running timer. */
export function TimerBar({ compact = false }: { compact?: boolean }) {
  const ui = useUi();
  const prefs = usePrefs();
  const settings = useSettingsValue();
  const { data: running } = useRunning();
  const { data: projects = [] } = useProjects();
  const { data: recent = [] } = useRecent(1);
  const now = useNow(1000);

  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billable, setBillable] = useState(true);
  const [busy, setBusy] = useState(false);

  // Mirror the running entry into the form so edits apply to it.
  useEffect(() => {
    if (running) {
      setDescription(running.description);
      setProjectId(running.projectId);
      setBillable(running.billable);
    }
  }, [running?.id, running?.description, running?.projectId, running?.billable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default project: last used, else the first available.
  useEffect(() => {
    if (running || projectId) return;
    const last = recent[0]?.projectId;
    if (last && projects.some((p) => p.id === last)) setProjectId(last);
    else if (projects[0]) setProjectId(projects[0].id);
  }, [running, projectId, recent, projects]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!projectId) return ui.toast(t.timer.noProjects, "error");
    run(async () => {
      await api.startTimer({ projectId, description, billable });
    });
  };
  const stop = () =>
    run(async () => {
      await api.stopTimer();
      setDescription("");
    });

  const commitDescription = () => {
    if (running && description !== running.description) run(() => api.updateRunning({ description }));
  };

  const elapsed = running ? Math.max(0, (now - new Date(running.startedAt).getTime()) / 1000) : 0;
  const long = running && settings.longTimerHours > 0 && elapsed >= settings.longTimerHours * 3600;
  const runningProject = projects.find((p) => p.id === running?.projectId);

  return (
    <div className={cx("flex flex-col gap-2", compact ? "" : "rounded-xl border border-border bg-surface p-3 shadow-sm")}>
      <div className={cx("flex gap-2", compact ? "flex-col" : "flex-wrap items-center")}>
        <Input
          aria-label={t.timer.whatAreYouWorkingOn}
          placeholder={t.timer.whatAreYouWorkingOn}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (running) commitDescription();
              else start();
            }
          }}
          className={cx(compact ? "h-9" : "h-10 basis-full text-[15px]")}
        />
        <div className={cx("flex items-center gap-2", compact ? "" : "min-w-0 flex-1")}>
          {runningProject?.color || projects.find((p) => p.id === projectId)?.color ? (
            <ColorDot color={(runningProject ?? projects.find((p) => p.id === projectId))?.color} />
          ) : null}
          <ProjectPicker
            value={projectId}
            className={compact ? "h-9" : "h-10"}
            includeProject={running ? { id: running.projectId, name: running.projectName, clientName: running.clientName } : null}
            onChange={(id) => {
              setProjectId(id);
              if (running) run(() => api.updateRunning({ projectId: id }));
            }}
          />
        </div>
        <div className={cx("flex items-center gap-2", compact && "justify-between")}>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <Toggle
              checked={billable}
              label={t.timer.billableToggle}
              onChange={(v) => {
                setBillable(v);
                if (running) run(() => api.updateRunning({ billable: v }));
              }}
            />
            {t.timer.billableToggle}
          </label>
          {running ? (
            <div className="flex items-center gap-3">
              <span className={cx("font-mono font-semibold tabular", compact ? "text-xl" : "text-2xl")} aria-live="off">
                {formatHMS(elapsed)}
              </span>
              <Button variant="danger" size="lg" onClick={stop} disabled={busy} aria-label={t.timer.stop}>
                <StopIcon size={14} /> {t.timer.stop}
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" onClick={start} disabled={busy || !projectId} aria-label={t.timer.start}>
              <PlayIcon size={14} /> {t.timer.start}
            </Button>
          )}
        </div>
      </div>
      {running && (
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{t.timer.startedAt(formatTime(running.startedAt, prefs.timeFormat))}</span>
          {long && (
            <span className="flex items-center gap-1 text-warn">
              <AlertIcon size={12} /> {t.timer.longRunning(settings.longTimerHours)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
