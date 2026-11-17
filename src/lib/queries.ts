import { useEffect, useState } from "react";
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { api, type EntryFilter, type Settings } from "./api";
import type { FormatPrefs } from "./format";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

/** Every window listens for backend mutations and refetches. */
export function useDataChangedListener() {
  const qc = useQueryClient();
  useEffect(() => {
    const un = listen("data-changed", () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "update" });
    });
    return () => {
      un.then((f) => f());
    };
  }, [qc]);
}

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

/** Settings are loaded before any screen renders, so this is safe inside the app shell. */
export function useSettingsValue(): Settings {
  const { data } = useSettings();
  if (!data) throw new Error("Settings not loaded");
  return data;
}

export function usePrefs(): FormatPrefs & { weekStart: number } {
  const s = useSettingsValue();
  return { dateFormat: s.dateFormat, timeFormat: s.timeFormat, numberLocale: s.numberLocale, weekStart: s.weekStart };
}

export const useClients = (includeArchived = false) =>
  useQuery({ queryKey: ["clients", includeArchived], queryFn: () => api.listClients(includeArchived) });

export const useProjects = (clientId: string | null = null, includeArchived = false) =>
  useQuery({
    queryKey: ["projects", clientId, includeArchived],
    queryFn: () => api.listProjects(clientId, includeArchived),
  });

export const useRunning = () => useQuery({ queryKey: ["running"], queryFn: api.getRunning, staleTime: Infinity });

export const useEntries = (filter: EntryFilter, enabled = true) =>
  useQuery({ queryKey: ["entries", filter], queryFn: () => api.listEntries(filter), enabled });

export const useSummary = (filter: EntryFilter, enabled = true) =>
  useQuery({ queryKey: ["summary", filter], queryFn: () => api.getSummary(filter), enabled });

export const useRecent = (limit = 8) =>
  useQuery({ queryKey: ["recent", limit], queryFn: () => api.recentCombos(limit) });

/** Current time, re-rendering every `ms`. Elapsed time is always computed from timestamps. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
