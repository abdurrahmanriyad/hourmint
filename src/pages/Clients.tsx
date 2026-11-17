import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, errorMessage, type Client, type Project } from "../lib/api";
import { formatHM, formatMoney } from "../lib/format";
import { useClients, usePrefs, useProjects } from "../lib/queries";
import { t } from "../strings";
import { ClientFormModal, ProjectFormModal } from "../components/forms";
import { TimesheetExportModal } from "../components/TimesheetExport";
import { ArchiveIcon, EditIcon, FileIcon, PlusIcon, TrashIcon } from "../components/icons";
import { Badge, Button, Card, Checkbox, ColorDot, EmptyState, IconButton, PageHeader, cx, useUi } from "../components/ui";

function ClientDetail({ client }: { client: Client }) {
  const prefs = usePrefs();
  const ui = useUi();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects(client.id, true);
  const [editing, setEditing] = useState(false);
  const [projectModal, setProjectModal] = useState<{ project: Project | null } | null>(null);
  const [timesheet, setTimesheet] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    }
  };

  const archiveClient = async () => {
    if (client.archivedAt) return run(() => api.setClientArchived(client.id, false));
    if (await ui.confirm({ title: t.common.archive, body: t.clients.archiveConfirm, confirmLabel: t.common.archive }))
      run(() => api.setClientArchived(client.id, true));
  };
  const deleteClient = async () => {
    if (await ui.confirm({ title: t.common.delete, body: t.clients.deleteConfirm, confirmLabel: t.common.delete, danger: true }))
      run(async () => {
        await api.deleteClient(client.id);
        navigate("/clients");
      });
  };
  const archiveProject = async (p: Project) => {
    if (p.archivedAt) return run(() => api.setProjectArchived(p.id, false));
    if (await ui.confirm({ title: t.common.archive, body: t.clients.projectArchiveConfirm, confirmLabel: t.common.archive }))
      run(() => api.setProjectArchived(p.id, true));
  };
  const deleteProject = async (p: Project) => {
    if (await ui.confirm({ title: t.common.delete, body: t.clients.projectDeleteConfirm, confirmLabel: t.common.delete, danger: true }))
      run(() => api.deleteProject(p.id));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[240px] flex-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {client.name} {client.archivedAt && <Badge>{t.common.archived}</Badge>}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {[client.contactName, client.email].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!client.archivedAt && (
            <Button variant="primary" onClick={() => navigate(`/invoices/new?client=${client.id}`)}>
              <FileIcon size={14} /> {t.clients.createInvoice}
            </Button>
          )}
          <Button onClick={() => setTimesheet(true)}>{t.invoices.standaloneTimesheet}</Button>
          <Button onClick={() => setEditing(true)}>
            <EditIcon size={14} /> {t.common.edit}
          </Button>
          <Button onClick={archiveClient}>
            <ArchiveIcon size={14} /> {client.archivedAt ? t.common.unarchive : t.common.archive}
          </Button>
          {client.entryCount === 0 && (
            <IconButton label={t.common.delete} onClick={deleteClient}>
              <TrashIcon size={14} />
            </IconButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted">{t.clients.defaultRate}</p>
          <p className="text-lg font-semibold tabular">
            {formatMoney(client.defaultRate, client.currency, prefs)}
            <span className="text-sm font-normal text-muted">{t.common.perHour}</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">{t.clients.unbilled}</p>
          <p className="text-lg font-semibold tabular">{formatHM(client.unbilledSeconds)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">{t.clients.unbilledValue}</p>
          <p className="text-lg font-semibold tabular">{formatMoney(client.unbilledAmount, client.currency, prefs)}</p>
        </Card>
      </div>

      {(client.billingAddress || client.notes) && (
        <Card className="grid grid-cols-2 gap-4 p-4 text-sm">
          <div>
            <p className="mb-1 text-xs text-muted">{t.clients.address}</p>
            <p className="whitespace-pre-line selectable">{client.billingAddress || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted">{t.common.notes}</p>
            <p className="whitespace-pre-line selectable">{client.notes || "—"}</p>
          </div>
        </Card>
      )}

      <Card>
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-semibold">{t.clients.projects}</h3>
          <Button size="sm" onClick={() => setProjectModal({ project: null })}>
            <PlusIcon size={12} /> {t.clients.addProject}
          </Button>
        </header>
        {projects.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">{t.clients.noProjects}</p>
        ) : (
          <ul className="divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id} className={cx("group flex items-center gap-3 px-4 py-2.5", p.archivedAt && "opacity-60")}>
                <ColorDot color={p.color} />
                <span className="flex-1 text-sm">
                  {p.name} {p.archivedAt && <Badge>{t.common.archived}</Badge>}
                </span>
                <span className="text-xs text-muted tabular">{formatHM(p.totalSeconds)}</span>
                <span className="w-28 text-right text-sm tabular">
                  {formatMoney(p.effectiveRate, p.currency, prefs)}
                  <span className="text-muted">{t.common.perHour}</span>
                  {p.rateOverride !== null && <span className="ml-1 text-[10px] text-accent">●</span>}
                </span>
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100">
                  <IconButton label={t.common.edit} onClick={() => setProjectModal({ project: p })}>
                    <EditIcon size={14} />
                  </IconButton>
                  <IconButton label={p.archivedAt ? t.common.unarchive : t.common.archive} onClick={() => archiveProject(p)}>
                    <ArchiveIcon size={14} />
                  </IconButton>
                  {p.entryCount === 0 && (
                    <IconButton label={t.common.delete} onClick={() => deleteProject(p)}>
                      <TrashIcon size={14} />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ClientFormModal open={editing} onClose={() => setEditing(false)} client={client} />
      {projectModal && (
        <ProjectFormModal open onClose={() => setProjectModal(null)} client={client} project={projectModal.project} />
      )}
      {timesheet && <TimesheetExportModal client={client} onClose={() => setTimesheet(false)} />}
    </div>
  );
}

export function ClientsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const prefs = usePrefs();
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data: clients = [], isLoading } = useClients(true);
  const visible = clients.filter((c) => showArchived || !c.archivedAt || c.id === id);
  const selected = clients.find((c) => c.id === id) ?? null;

  return (
    <>
      <PageHeader
        title={t.clients.title}
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon size={14} /> {t.clients.add}
          </Button>
        }
      />
      {!isLoading && clients.length === 0 ? (
        <EmptyState
          title={t.clients.empty}
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              <PlusIcon size={14} /> {t.clients.add}
            </Button>
          }
        />
      ) : (
        <div className="flex min-h-0 gap-5 p-6">
          <div className="flex w-80 shrink-0 flex-col gap-2">
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {visible.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/clients/${c.id}`}
                      aria-current={c.id === id ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2",
                        c.id === id && "bg-surface-2",
                        c.archivedAt && "opacity-60",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block text-xs text-muted">
                          {c.currency} · {t.clients.projectCount(c.projectCount)}
                        </span>
                      </span>
                      {c.unbilledAmount > 0 && (
                        <span className="text-right">
                          <span className="block text-sm font-medium tabular">{formatMoney(c.unbilledAmount, c.currency, prefs)}</span>
                          <span className="block text-[11px] text-muted tabular">{formatHM(c.unbilledSeconds)} {t.common.unbilled.toLowerCase()}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Checkbox checked={showArchived} onChange={setShowArchived} label={t.common.showArchived} className="px-1 text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            {selected ? <ClientDetail key={selected.id} client={selected} /> : <EmptyState title={t.clients.select} />}
          </div>
        </div>
      )}
      <ClientFormModal open={adding} onClose={() => setAdding(false)} onSaved={(c) => navigate(`/clients/${c.id}`)} />
    </>
  );
}
