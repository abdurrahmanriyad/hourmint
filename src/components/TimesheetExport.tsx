import { useState } from "react";
import { api, errorMessage, type Client } from "../lib/api";
import { dateStrRange, startOfMonth, toDateStr } from "../lib/dates";
import { formatDate } from "../lib/format";
import { exportTimesheetPdf } from "../lib/pdf/export";
import { usePrefs, useSettingsValue } from "../lib/queries";
import { t } from "../strings";
import { Button, Checkbox, Field, Input, Modal, useUi } from "./ui";

/** Standalone timesheet PDF for a client and period. */
export function TimesheetExportModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const ui = useUi();
  const prefs = usePrefs();
  const settings = useSettingsValue();
  const [from, setFrom] = useState(toDateStr(startOfMonth(new Date())));
  const [to, setTo] = useState(toDateStr(new Date()));
  const [nonBillable, setNonBillable] = useState(false);
  const [showSource, setShowSource] = useState(settings.timesheetShowSource);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      const r = dateStrRange(from, to);
      const entries = await api.timesheetEntries(client.id, r.from, r.to, nonBillable);
      if (entries.length === 0) {
        ui.toast(t.entries.emptyFiltered, "warn");
        return;
      }
      const periodLabel = `${formatDate(from, prefs.dateFormat)} – ${formatDate(to, prefs.dateFormat)}`;
      const path = await exportTimesheetPdf({
        sender: {
          businessName: settings.businessName,
          address: settings.address,
          email: settings.email,
          phone: settings.phone,
          taxId: settings.taxId,
          logoPath: settings.logoPath,
        },
        client: { name: client.name, contactName: client.contactName, email: client.email, billingAddress: client.billingAddress },
        entries,
        periodLabel,
        fileStem: `timesheet-${client.name}-${from}-${to}`,
        prefs,
        showSource,
      });
      if (path) {
        ui.toast(t.invoices.pdfSaved(path));
        onClose();
      }
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t.invoices.standaloneTimesheet} — ${client.name}`}
      width={420}
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={go} disabled={busy}>
            {busy ? t.invoices.exporting : t.invoices.exportPdf}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{t.invoices.standaloneTimesheetHint}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.log.from} htmlFor="ts-from">
            <Input id="ts-from" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </Field>
          <Field label={t.log.to} htmlFor="ts-to">
            <Input id="ts-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </Field>
        </div>
        <Checkbox checked={nonBillable} onChange={setNonBillable} label={t.invoices.includeNonBillable} />
        <Checkbox checked={showSource} onChange={setShowSource} label={t.invoices.showSource} />
      </div>
    </Modal>
  );
}
