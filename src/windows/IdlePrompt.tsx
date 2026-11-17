import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { formatHM, formatTime } from "../lib/format";
import { useNow, usePrefs } from "../lib/queries";
import { t } from "../strings";
import { Button, useUi } from "../components/ui";

/** TM-7: shown when the user returns from idle while a timer runs. */
export function IdlePrompt() {
  const prefs = usePrefs();
  const ui = useUi();
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const { data, refetch, isFetched } = useQuery({ queryKey: ["idle"], queryFn: api.getIdleState, staleTime: 0 });

  useEffect(() => {
    const un = listen("idle-detected", () => refetch());
    return () => {
      un.then((f) => f());
    };
  }, [refetch]);

  useEffect(() => {
    if (isFetched && !data) getCurrentWindow().close();
  }, [isFetched, data]);

  if (!data) return null;
  const since = new Date(data.idleSince);
  const idleSecs = Math.max(0, (now - since.getTime()) / 1000);
  const what = data.entry ? (data.entry.description ? `${data.entry.description} (${data.entry.projectName})` : `${data.entry.clientName} · ${data.entry.projectName}`) : "";

  const resolve = async (action: "keep" | "discard" | "discard_stop") => {
    setBusy(true);
    try {
      await api.resolveIdle(action);
    } catch (e) {
      ui.toast(errorMessage(e), "error");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between bg-surface p-5" role="alertdialog" aria-labelledby="idle-title" aria-describedby="idle-body">
      <div>
        <h1 id="idle-title" className="text-base font-semibold">
          {t.idle.title}
        </h1>
        <p id="idle-body" className="mt-1 text-sm">
          {t.idle.body(formatTime(since, prefs.timeFormat), formatHM(idleSecs))}
        </p>
        {what && <p className="mt-1 truncate text-xs text-muted">{t.idle.timerFor(what)}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={() => resolve("discard")} disabled={busy} autoFocus>
          {t.idle.discard}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => resolve("keep")} disabled={busy}>
            {t.idle.keep}
          </Button>
          <Button onClick={() => resolve("discard_stop")} disabled={busy}>
            {t.idle.discardStop}
          </Button>
        </div>
      </div>
    </div>
  );
}
