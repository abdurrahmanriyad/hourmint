import { useEffect, useState } from "react";
import { HashRouter, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { ClockIcon, FileIcon, GearIcon, ListIcon, UsersIcon } from "../components/icons";
import { Button, cx, useUi } from "../components/ui";
import appIcon from "../assets/app-icon.png";
import { installUpdate, useUpdate } from "../lib/updates";
import { formatHMS } from "../lib/format";
import { useNow, useRunning, useSettingsValue } from "../lib/queries";
import { t } from "../strings";
import { TodayPage } from "../pages/Today";
import { WorkLogPage } from "../pages/WorkLog";
import { ClientsPage } from "../pages/Clients";
import { InvoicesPage } from "../pages/Invoices";
import { InvoiceBuilderPage } from "../pages/InvoiceBuilder";
import { SettingsPage } from "../pages/Settings";
import { Onboarding } from "../pages/Onboarding";

const NAV = [
  { to: "/", label: t.nav.today, icon: ClockIcon, key: "1" },
  { to: "/log", label: t.nav.log, icon: ListIcon, key: "2" },
  { to: "/clients", label: t.nav.clients, icon: UsersIcon, key: "3" },
  { to: "/invoices", label: t.nav.invoices, icon: FileIcon, key: "4" },
  { to: "/settings", label: t.nav.settings, icon: GearIcon, key: "5" },
];

function RunningPill() {
  const { data: running } = useRunning();
  const now = useNow(1000);
  if (!running) return null;
  return (
    <NavLink
      to="/"
      className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-mint-500/12 px-3 py-2 text-xs font-medium text-mint-700 dark:text-mint-300"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-mint-500" aria-hidden="true" />
      <span className="truncate">{running.projectName}</span>
      <span className="ml-auto font-mono tabular">{formatHMS((now - new Date(running.startedAt).getTime()) / 1000)}</span>
    </NavLink>
  );
}

function UpdateCard() {
  const ui = useUi();
  const { data: update } = useUpdate();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  if (!update || dismissed === update.version) return null;
  const install = async () => {
    setProgress(0);
    try {
      await installUpdate(update, setProgress);
    } catch {
      setProgress(null);
      ui.toast(t.update.failed, "error");
    }
  };
  return (
    <div role="status" className="m-3 rounded-lg border border-border bg-surface p-3 text-xs shadow-sm">
      <p className="font-medium">{t.update.available(update.version)}</p>
      <p className="mt-0.5 text-muted">{t.update.timerSafe}</p>
      <div className="mt-2 flex gap-1.5">
        <Button size="sm" variant="primary" disabled={progress !== null} onClick={install}>
          {progress === null ? t.update.install : t.update.installing(progress)}
        </Button>
        {progress === null && (
          <Button size="sm" variant="ghost" onClick={() => setDismissed(update.version)}>
            {t.update.later}
          </Button>
        )}
      </div>
    </div>
  );
}

function Layout() {
  const navigate = useNavigate();

  // Navigation requests from the popover / tray.
  useEffect(() => {
    const un = listen<string>("navigate", (e) => navigate(e.payload));
    return () => {
      un.then((f) => f());
    };
  }, [navigate]);

  // ⌘1…⌘5 switch screens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const item = NAV.find((n) => n.key === e.key);
      if (item) {
        e.preventDefault();
        navigate(item.to);
      }
      if (e.key === ",") {
        e.preventDefault();
        navigate("/settings");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="flex h-full">
      <nav aria-label="Main" className="flex w-52 shrink-0 flex-col border-r border-border bg-surface-2/60">
        {/* Space for the macOS window buttons (title bar overlay); drag to move the window. */}
        <div data-tauri-drag-region className="h-12 shrink-0" />
        <div data-tauri-drag-region className="mb-4 flex items-center gap-2 px-5">
          <img src={appIcon} alt="" width={26} height={26} className="-m-0.5" draggable={false} />
          <span className="text-[15px] font-semibold tracking-tight">{t.appName}</span>
        </div>
        <RunningPill />
        <ul className="flex flex-col gap-0.5 px-2">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  cx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition",
                    isActive ? "bg-surface font-medium text-text shadow-sm" : "text-muted hover:bg-surface/60 hover:text-text",
                  )
                }
              >
                <n.icon size={16} />
                {n.label}
                <span className="ml-auto text-[11px] text-muted/70">⌘{n.key}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <UpdateCard />
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/log" element={<WorkLogPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceBuilderPage />} />
          <Route path="/invoices/:id" element={<InvoiceBuilderPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function MainApp() {
  const settings = useSettingsValue();
  if (!settings.onboarded) return <Onboarding />;
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}
