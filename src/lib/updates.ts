// In-app updates from GitHub Releases (the only network request Hourmint makes).
import { useQuery } from "@tanstack/react-query";
import type { Update } from "@tauri-apps/plugin-updater";

/** Auto-check only in the packaged app; `npm run app` and tests never hit the network. */
const AUTO = import.meta.env.PROD;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export async function checkForUpdate(): Promise<Update | null> {
  const { check } = await import("@tauri-apps/plugin-updater");
  return check();
}

export async function installUpdate(update: Update, onProgress?: (pct: number) => void) {
  let total = 0;
  let done = 0;
  await update.downloadAndInstall((e) => {
    if (e.event === "Started") total = e.data.contentLength ?? 0;
    if (e.event === "Progress" && total) {
      done += e.data.chunkLength;
      onProgress?.(Math.min(100, Math.round((done / total) * 100)));
    }
  });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

/** Shared update state: checked on launch and every 12 hours; Settings can force a check. */
export function useUpdate() {
  return useQuery({
    queryKey: ["update"],
    queryFn: checkForUpdate,
    enabled: AUTO,
    staleTime: TWELVE_HOURS,
    refetchInterval: TWELVE_HOURS,
    retry: false,
    structuralSharing: false,
  });
}
