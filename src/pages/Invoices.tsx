import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type Invoice } from "../lib/api";
import { toDateStr } from "../lib/dates";
import { formatDate, formatHM, formatMoney } from "../lib/format";
import { useClients, usePrefs } from "../lib/queries";
import { t } from "../strings";
import { PlusIcon } from "../components/icons";
import { Badge, Button, Card, EmptyState, PageHeader, Segmented, Select } from "../components/ui";

export function StatusBadge({ invoice }: { invoice: Pick<Invoice, "status" | "dueDate"> }) {
  const overdue = invoice.status === "sent" && invoice.dueDate < toDateStr(new Date());
  if (overdue) return <Badge tone="danger">{t.invoices.statuses.overdue}</Badge>;
  const tone = invoice.status === "paid" ? "accent" : invoice.status === "sent" ? "info" : "neutral";
  return <Badge tone={tone}>{t.invoices.statuses[invoice.status]}</Badge>;
}

export function InvoicesPage() {
  const prefs = usePrefs();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | "draft" | "sent" | "paid" | "overdue">("");
  const [clientId, setClientId] = useState("");
  const { data: clients = [] } = useClients(true);
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", status, clientId],
    queryFn: () => api.listInvoices({ status: status || undefined, clientId: clientId || undefined }),
  });
  const { data: totals = [] } = useQuery({
    queryKey: ["invoiceTotals", clientId],
    queryFn: () => api.invoiceTotals(clientId || null),
  });

  return (
    <>
      <PageHeader
        title={t.invoices.title}
        actions={
          <Button variant="primary" onClick={() => navigate(`/invoices/new${clientId ? `?client=${clientId}` : ""}`)}>
            <PlusIcon size={14} /> {t.invoices.new}
          </Button>
        }
      />
      <div className="flex flex-col gap-5 p-6">
        {totals.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["outstanding", t.invoices.outstanding],
                ["overdue", t.invoices.overdue],
                ["paid", t.invoices.paid],
                ["draft", t.invoices.drafts],
              ] as const
            ).map(([k, label]) => (
              <Card key={k} className="p-4">
                <p className="text-xs text-muted">{label}</p>
                {totals.filter((tt) => tt[k] !== 0).map((tt) => (
                  <p key={tt.currency} className={`text-lg font-semibold tabular ${k === "overdue" ? "text-danger" : ""}`}>
                    {formatMoney(tt[k], tt.currency, prefs)}
                  </p>
                ))}
                {totals.every((tt) => tt[k] === 0) && <p className="text-lg font-semibold text-muted">—</p>}
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label={t.invoices.status}
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: t.common.all },
              { value: "draft", label: t.invoices.statuses.draft },
              { value: "sent", label: t.invoices.statuses.sent },
              { value: "overdue", label: t.invoices.statuses.overdue },
              { value: "paid", label: t.invoices.statuses.paid },
            ]}
          />
          <Select aria-label={t.common.client} className="w-52" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">{t.log.allClients}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Card className="overflow-hidden">
          {!isLoading && invoices.length === 0 ? (
            <EmptyState title={t.invoices.empty} />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-2/50 text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">{t.invoices.number}</th>
                  <th className="px-4 py-2 font-medium">{t.common.client}</th>
                  <th className="px-4 py-2 font-medium">{t.invoices.issueDate}</th>
                  <th className="px-4 py-2 font-medium">{t.invoices.dueDate}</th>
                  <th className="px-4 py-2 font-medium">{t.common.hours}</th>
                  <th className="px-4 py-2 font-medium">{t.invoices.status}</th>
                  <th className="px-4 py-2 text-right font-medium">{t.common.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5 font-medium">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{inv.clientName}</td>
                    <td className="px-4 py-2.5 tabular text-muted">{formatDate(inv.issueDate, prefs.dateFormat)}</td>
                    <td className="px-4 py-2.5 tabular text-muted">{formatDate(inv.dueDate, prefs.dateFormat)}</td>
                    <td className="px-4 py-2.5 tabular text-muted">{formatHM(inv.totalSeconds)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge invoice={inv} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">{formatMoney(inv.total, inv.currency, prefs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
