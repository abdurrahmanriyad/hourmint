import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { queryClient, useDataChangedListener, useSettings } from "./lib/queries";
import { UiProvider, Spinner } from "./components/ui";
import { MainApp } from "./windows/MainApp";
import { Popover } from "./windows/Popover";
import { IdlePrompt } from "./windows/IdlePrompt";
import { errorMessage } from "./lib/api";
import { t } from "./strings";

function useTheme(theme: string | undefined) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || ((theme ?? "system") === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

/** Loads settings (needed by every screen) and applies the theme. */
export function Shell({ children }: { children: ReactNode }) {
  useDataChangedListener();
  const settings = useSettings();
  useTheme(settings.data?.theme);
  if (settings.error)
    return (
      <div className="p-8 text-sm">
        <p className="font-semibold">{t.common.somethingWrong}</p>
        <p className="mt-2 text-muted selectable">{errorMessage(settings.error)}</p>
      </div>
    );
  if (!settings.data) return <Spinner />;
  return <>{children}</>;
}

const label = (() => {
  try {
    return getCurrentWindow().label;
  } catch {
    return "main";
  }
})();

export function Root() {
  switch (label) {
    case "popover":
      return <Popover />;
    case "idle":
      return <IdlePrompt />;
    default:
      return <MainApp />;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <Shell>
          <Root />
        </Shell>
      </UiProvider>
    </QueryClientProvider>
  );
}
